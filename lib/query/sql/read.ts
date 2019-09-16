import * as Knex from 'knex';

import {
  AbstractSqlQuery,
  IEntityPropertyAliasSqlRef
}                             from './abstract';
import { EntityRelationType } from '../../entity-relation';
import {
  getQueryRelations,
  queryValueMerge
} from '../../utils';

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
    const relationalSelects = getQueryRelations(this.Entity, this.relations).reduce((selects, relationMeta) => {
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
    const queryRelations = getQueryRelations(this.Entity, this.relations);
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
    const persistedEntityValuesQuery = this.getQuery();
    const results = await this.executeSqlQuery(persistedEntityValuesQuery);

    return queryValueMerge(this.Entity, results, this.relations) as T;
  }

  async execute(): Promise<T> {
    const instance = await this.executeSql();

    this.store.update({ result: instance });

    return instance;
  }
}

