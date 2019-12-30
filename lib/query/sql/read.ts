import * as Knex from 'knex';

import {
  AbstractSqlQuery,
  IEntityPropertyAliasSqlRef,
  IEntityPropertySqlRef,
  IEntitySqlRef
}                                    from './abstract';
import { EntityRelationType }        from '../../graph/entity-relation';
import * as utils           from '../../utils';
import { EntityRelationGraphNode }   from '../../graph/entity-relation-graph-node';
import { GlobalClassMetaCollection } from '../../metadata/meta-collection';
import { GlobalMetaRegistry }        from '../../metadata/meta-registry';

type IWhereParamValueSqlRef = IEntityPropertyAliasSqlRef<any, any> | any;
type IWhereParamsPropertySqlRef = IEntityPropertyAliasSqlRef<any, any>;

interface IWhereParam {
  property: { sql: IWhereParamsPropertySqlRef, meta: IPropertyMeta };
  value: { raw?: any, sql: IWhereParamValueSqlRef[] };
}

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

  protected applySelects(sqlQuery: Knex.QueryBuilder): Knex.QueryBuilder {
    const relationalSelects = GlobalMetaRegistry.getQueryRelations(this.Entity, this.relations).reduce((selects, relationMeta) => {
      return selects.concat([
          this.getPropertySqlRef(relationMeta.base.property.meta, relationMeta.base.entity),
          this.getPropertySqlRef(relationMeta.related.property.meta, relationMeta.related.entity),
        ])
        .concat((() => {
          return this.metaRegistry.getPropertyMetasByConstructor(relationMeta.related.entity.fn)
            .map(relatedPropertyMeta => this.getPropertySqlRef(relatedPropertyMeta, relationMeta.related.entity))
        })());
    }, []);
    const selects = this.entityPropertiesMetadata.map((propertyMetadata) => {
      return this.getPropertySqlRef(propertyMetadata, this.entityMetadata);
    });

    const uniqueSelects = selects.concat(relationalSelects).reduce((uniqueSelects, select) => {
      if (uniqueSelects.find(uniqueSelect => uniqueSelect.toQuery() === select.toQuery())) {
        return uniqueSelects;
      }

      return uniqueSelects.concat(select);
    }, []);

    return sqlQuery.select(...uniqueSelects);
  }

  protected applyJoins(sqlQuery: Knex.QueryBuilder): Knex.QueryBuilder {
    const queryRelations: IQueryRelation[] = GlobalMetaRegistry.getQueryRelations(this.Entity, this.relations);
    let tableName: string;
    let baseProperty: IEntityPropertyAliasSqlRef<string, T>;
    let relatedProperty: IEntityPropertyAliasSqlRef<string, any>;
    sortQueryRelations(queryRelations).forEach((queryRelation: IQueryRelation) => {

      switch (queryRelation.type) {
        case EntityRelationType.OneToOne:
        case EntityRelationType.ManyToOne:
        case EntityRelationType.OneToMany: {
          tableName = queryRelation.related.entity.tableName;
          baseProperty = this.getPropertySqlRef(queryRelation.base.property.meta, queryRelation.base.entity, { disableAlias: true });
          relatedProperty = this.getPropertySqlRef(queryRelation.related.property.meta, queryRelation.related.entity, { disableAlias: true });

          sqlQuery = sqlQuery.leftJoin(tableName, this.sql.raw(`${baseProperty.toQuery()} = ${relatedProperty.toQuery()}`));
          break;
        }
        default: {
          break;
        }
      }

      return sqlQuery;
    });

    return sqlQuery;
  }

  protected applyWhere(sqlQuery: Knex.QueryBuilder): Knex.QueryBuilder {
    const whereParamsCollection: IWhereParam[] = [];

    this.entityPersistenceGraph.relationGraph.forEachMeta('property', (node: EntityRelationGraphNode, propertyMeta: IPropertyMeta, path: PropertyKey[]) => {
      const classMeta = GlobalClassMetaCollection.getClassMeta(propertyMeta.fn);
      const whereParamValue = node.value === undefined ? propertyMeta.options.sql.scope : node.value;
      let whereParams = whereParamsCollection.find(whereParams => {
        return utils.isSameMeta(whereParams.property.meta, propertyMeta);
      });

      if (!whereParamValue || !(propertyMeta.options.sql.primaryKey || propertyMeta.options.sql.scope)) {
        return;
      }

      if (!whereParams) {
        whereParams = {
          property: {
            meta: propertyMeta,
            sql: this.getPropertySqlRef(propertyMeta, classMeta, { disableAlias: true })
          },
          value: {
            raw: whereParamValue,
            sql: whereParamValue
          }
        };

        whereParamsCollection.push(whereParams);
      } else {

        whereParams.value.sql = [whereParamValue].concat(whereParams.value.sql);
        whereParams.value.raw = [whereParamValue].concat(whereParams.value.raw);
      }

    });

    whereParamsCollection.forEach(whereParams => {
      if (Array.isArray(whereParams.value.sql)) {

        sqlQuery = sqlQuery.where(whereParams.property.sql, 'IN', `(${whereParams.value.sql.join(',')})`);

      } else {
        sqlQuery = sqlQuery.where(whereParams.property.sql, '=', whereParams.value.sql);
      }
    });

    return sqlQuery;
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

    return utils.queryValueMerge(this.Entity, results, this.relations) as T;
  }

  async execute(): Promise<T> {
    const instance = await this.executeSql();

    this.store.update({ result: instance });

    return instance;
  }
}


function sortQueryRelations(queryRelations: IQueryRelation[]): IQueryRelation[] {
  return queryRelations.reverse();
  // sortBy(queryRelations, (sortingQueryRelation: IQueryRelation) => {
  //   const queryRelationEntities = queryRelations
  //     .filter(queryRelation => queryRelation !== sortingQueryRelation)
  //     .map(queryRelation => queryRelation.base.entity);
  //
  //   return sortingQueryRelation.related.entity
  // })
}