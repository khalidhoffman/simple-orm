import * as Knex from 'knex';

import {
  AbstractSqlQuery,
  IEntityPropertyAliasSqlRef
}                             from './abstract';
import { EntityRelationType } from '../../entity-relation';

type ISqlQueryValues<T = any> = { [key: string]: T };

export class SqlReadQuery<T = any> extends AbstractSqlQuery<T> {

  /**
   * @example
   *
   * knex.select('id').from<User>('users'); // Resolves to Pick<User, "id">[]
   * knex.select('users.id').from<User>('users'); // Resolves to any[]
   *
   * // ^ TypeScript doesn't provide us a way to look into a string and infer the type
   * //   from a substring, so we fall back to any
   * // We can side-step this using knex.ref:
   * knex.select(knex.ref('id').withSchema('users')).from<User>('users'); // Resolves to Pick<User, "id">[]
   * knex.select('id as identifier').from<User>('users'); // Resolves to any[], for same reason as above
   *
   * // Refs are handy here too:
   * knex.select(knex.ref('id').as('identifier')).from<User>('users'); // Resolves to { identifier: number; }[]
   *
   * @returns {any[]}
   */

  applySelects(sqlQuery: Knex.QueryBuilder): Knex.QueryBuilder {
    const relationalSelects = this.getQueryRelations(this.Entity).reduce((selects, relationMeta) => {
      return selects.concat([
          this.getEntityPropertySqlRef(relationMeta.base.property.meta, relationMeta.base.entity),
          this.getEntityPropertySqlRef(relationMeta.related.property.meta, relationMeta.related.entity),
        ])
        .concat((() => {
          return this.metaRegistry.getPropertyMetasByConstructor(relationMeta.related.entity.fn)
            .map(relatedPropertyMeta => this.getEntityPropertySqlRef(relatedPropertyMeta, relationMeta.related.entity))
        })());
    }, []);
    const selects = this.entityPropertiesMetadata.map((propertyMetadata) => {
      return this.getEntityPropertySqlRef(propertyMetadata, this.entityMetadata);
    });

    const uniqueSelects = selects.concat(relationalSelects).reduce((uniqueSelects, select) => {
      if (uniqueSelects.find(uniqueSelect => uniqueSelect.toQuery() === select.toQuery())) {
        return uniqueSelects;
      }

      return uniqueSelects.concat(select);
    }, []);

    return sqlQuery.select(...uniqueSelects);
  }

  applyJoins(sqlQuery: Knex.QueryBuilder): Knex.QueryBuilder {
    const queryRelations = this.getQueryRelations(this.Entity);
    let tableName: string;
    let baseProperty: IEntityPropertyAliasSqlRef<string, T>;
    let relatedProperty: IEntityPropertyAliasSqlRef<string, any>;
    queryRelations.forEach((queryRelation: IQueryRelation) => {

      switch (queryRelation.type) {
        case EntityRelationType.ManyToOne:
        case EntityRelationType.OneToMany: {
          tableName = queryRelation.related.entity.tableName;
          baseProperty = this.getEntityPropertySqlRef(queryRelation.base.property.meta, queryRelation.base.entity, { disableAlias: true });
          relatedProperty = this.getEntityPropertySqlRef(queryRelation.related.property.meta, queryRelation.related.entity, { disableAlias: true });

          sqlQuery = sqlQuery.leftJoin(tableName, this.sql.raw(`${baseProperty.toQuery()} = ${relatedProperty.toQuery()}`));
          break;
        }
        default:
          break;
      }

      return sqlQuery;
    });

    return sqlQuery;
  }

  applyWhere(sqlQuery: Knex.QueryBuilder): Knex.QueryBuilder {
    const queryIdentifierProperty = this.getEntityPropertySqlRef(this.entityPrimaryColumnMetadata, this.entityMetadata, { disableAlias: true });
    return sqlQuery.where(queryIdentifierProperty, '=', this.queryParams.identifier);
  }

  getQuery(): string {
    let sqlQuery = this.entitySqlRef;

    sqlQuery = this.applySelects(sqlQuery);
    sqlQuery = this.applyJoins(sqlQuery);
    sqlQuery = this.applyWhere(sqlQuery);

    return sqlQuery.toQuery()
  }

  private async executeSql(): Promise<T> {
    const EntityConstructor: Constructor = this.store.get('Entity');

    const persistedEntityValuesQuery = this.getQuery();

    const results = await this.executeSqlQuery(persistedEntityValuesQuery);

    const persistedEntityValues = results.reduce((acc, result) => {
      return Object.assign(acc, result);
    }, {});

    let instance: T;

    instance = this.assignSqlValues(EntityConstructor, persistedEntityValues, this.relations);

    return instance;
  }

  assignSqlValues<InstanceType = T>(constructor: Constructor<InstanceType>, persistedEntityValues: ISqlQueryValues, relations: IRelationalQueryPartial<InstanceType> | true) {
    return Object.assign(
      new constructor(),
      this.assignInstanceValues(constructor, persistedEntityValues),
      this.assignRelationInstanceValues(constructor, persistedEntityValues, relations === true ? {} : relations)
    );
  }


  assignInstanceValues(entityConstructor: Constructor, values: ISqlQueryValues) {

    return Object.keys(values).reduce((entityInstance: T, entityColumnName: string) => {
      const columnMeta: IPropertyMeta = this.metaRegistry.getPropertyMetasByConstructor(entityInstance.constructor as Constructor).find(propertyMeta => {
        return propertyMeta.options.sql.alias === entityColumnName;
      });

      if (!columnMeta) {
        this.logger.log('warn', `property metadata not found for sql column: ${entityInstance.constructor.name}.${entityColumnName}`);
        return entityInstance;
      }

      entityInstance[columnMeta.propertyName] = values[entityColumnName];

      return entityInstance;
    }, new entityConstructor());

  }

  assignRelationInstanceValues<InstanceType = T>(EntityConstructor: Constructor<InstanceType>, values: ISqlQueryValues, relations: IRelationalQueryPartial<InstanceType> = this.relations): InstanceType {

    return Object.keys(relations).reduce((entityInstance: InstanceType, relationPropertyKey: string) => {
      const queryRelation: IQueryRelation = this.getQueryRelations(entityInstance.constructor as Constructor).find(queryRelation => {
        return queryRelation.base.property.relationMeta.propertyName === relationPropertyKey;
      });
      const columnMeta: IPropertyMeta = queryRelation.base.property.meta;

      if (!columnMeta) {
        this.logger.log('warn', `relation metadata not found for sql column: ${entityInstance.constructor.name}.${relationPropertyKey}`);
        return entityInstance;
      }

      switch(queryRelation.type) {
        case EntityRelationType.ManyToOne: {
          entityInstance[queryRelation.base.property.relationMeta.propertyName] = this.assignSqlValues(queryRelation.related.entity.fn, values, relations[relationPropertyKey]);
          break;
        }

        case EntityRelationType.OneToMany: {
          let instances = entityInstance[queryRelation.base.property.relationMeta.propertyName] || [];
          entityInstance[queryRelation.base.property.relationMeta.propertyName] = instances.concat(this.assignSqlValues(queryRelation.related.entity.fn, values, relations[relationPropertyKey]));
          break;
        }

        default: {
          entityInstance[queryRelation.base.property.relationMeta.propertyName] = this.assignSqlValues(queryRelation.related.entity.fn, values, relations[relationPropertyKey]);
          break;
        }
      }

      return entityInstance;
    }, new EntityConstructor());
  }

  async execute(): Promise<T> {
    const instance = await this.executeSql();

    this.store.update({ result: instance });

    return instance;
  }
}

