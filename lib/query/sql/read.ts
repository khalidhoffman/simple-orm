import * as Knex from 'knex';

import {
  AbstractSqlQuery
}                                     from './abstract';
import { EntityRelationType }         from '../../entity-relation';
import * as utils                     from '../../utils';
import { GlobalClassMetaCollection }  from '../../metadata/meta-collection';
import { GlobalMetaRegistry }         from '../../metadata/meta-registry';
import { QueryEntityInstanceFactory } from './common/query-entity-instance-factory';
import { EntityPropertySqlRef }       from './common/entity-sql-ref';
import { normalizeValueSet }          from './common/builder';
import { EntityQueryGraphNode } from '../entity-query-graph-node';

type IWhereParamValueSqlRef = EntityPropertySqlRef<any, any> | any;
type IWhereParamsPropertySqlRef = EntityPropertySqlRef<any, any>;

interface IWhereParam {
  property: { sql: IWhereParamsPropertySqlRef, meta: IPropertyMeta };
  value: { raw?: any, sql: IWhereParamValueSqlRef[] };
}

export class SqlReadQuery<T extends object = any> extends AbstractSqlQuery<T> {

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
    // TODO implement inclusion of all related properties
    const relationalSelects: EntityPropertySqlRef[] = GlobalMetaRegistry.getQueryRelationPropertyMeta(this.Entity, this.relations)
      .reduce((selects: EntityPropertySqlRef[], relationPropertyMeta) => {
        const relationPropertySqlRef = this.getPropertySqlRef(relationPropertyMeta, relationPropertyMeta.classMeta);
        const relatedEntityPropertySqlRefs = relationPropertyMeta.relatedMeta.reduce((PropertySqlRefs: EntityPropertySqlRef[], relatedRelationPropertyMeta) => {
          const relatedPropertySqlRefs: EntityPropertySqlRef[] = GlobalMetaRegistry.getPropertyMetasByConstructor(relatedRelationPropertyMeta.fn)
            .map(propertyMeta => {
              return this.getPropertySqlRef(propertyMeta, GlobalMetaRegistry.getClassMeta(propertyMeta.fn))
            });

          return PropertySqlRefs.concat(relatedPropertySqlRefs);
        }, []);

        return selects.concat(relationPropertySqlRef).concat(relatedEntityPropertySqlRefs);
      }, []);
    const entityPropertySelects: EntityPropertySqlRef[] = this.entityPropertiesMetadata.map((propertyMetadata) => {
      return this.getPropertySqlRef(propertyMetadata, this.entityMetadata);
    });
    const sortedSelects: EntityPropertySqlRef[] = entityPropertySelects.concat(relationalSelects).reduce((uniqueSelects, select) => {
      const preexistingEquivalentSelect = uniqueSelects.find(uniqueSelect => uniqueSelect.toQuery() === select.toQuery());
      if (preexistingEquivalentSelect) {
        return uniqueSelects;
      }

      return uniqueSelects.concat(select);
    }, []);

    return sqlQuery.select(...sortedSelects);
  }

  protected applyJoins(sqlQuery: Knex.QueryBuilder): Knex.QueryBuilder {
    const relationPropertyMeta: IRelationPropertyMeta[] = GlobalMetaRegistry.getQueryRelationPropertyMeta(this.Entity, this.relations);
    let tableName: string;
    let baseProperty: EntityPropertySqlRef<string, T>;
    let relatedProperty: EntityPropertySqlRef<string, any>;
    sortQueryRelations(relationPropertyMeta).forEach((relationPropertyMeta: IRelationPropertyMeta) => {

      switch (relationPropertyMeta.extra.type) {
        case EntityRelationType.OneToOne:
        case EntityRelationType.ManyToOne:
        case EntityRelationType.OneToMany: {
          relationPropertyMeta.relatedMeta.map(relatedRelationPropertyMeta => {
            tableName = relatedRelationPropertyMeta.classMeta.tableName;
            baseProperty = this.getPropertySqlRef(relationPropertyMeta, relationPropertyMeta.classMeta, { disableAlias: true });
            relatedProperty = this.getPropertySqlRef(relatedRelationPropertyMeta, relatedRelationPropertyMeta.classMeta, { disableAlias: true });

            sqlQuery = sqlQuery.leftJoin(tableName, this.sql.raw(`${baseProperty.toQuery()} = ${relatedProperty.toQuery()}`));
          });
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

    this.entityQueryGraph.forEachMeta('property', (node: EntityQueryGraphNode, propertyMeta: IPropertyMeta, path: PropertyKey[]) => {
      const classMeta = GlobalClassMetaCollection.getClassMeta(propertyMeta.fn);
      const whereParamValue = node.value === undefined ? propertyMeta.options.sql.scope : node.value;
      const formattedWhereParamValue = typeof whereParamValue === 'object' ? whereParamValue[propertyMeta.propertyName] : whereParamValue;
      let whereParams: IWhereParam = whereParamsCollection.find(whereParams => {
        return utils.isSameMeta(whereParams.property.meta, propertyMeta);
      });

      if (!formattedWhereParamValue || !(propertyMeta.options.sql.primaryKey || propertyMeta.options.sql.scope)) {
        return;
      }

      if (!whereParams) {
        whereParams = {
          property: {
            meta: propertyMeta,
            sql: this.getPropertySqlRef(propertyMeta, classMeta, { disableAlias: true })
          },
          value: {
            raw: formattedWhereParamValue,
            sql: formattedWhereParamValue
          }
        };

        whereParamsCollection.push(whereParams);
      } else {

        whereParams.value.sql = [formattedWhereParamValue].concat(whereParams.value.sql);
        whereParams.value.raw = [formattedWhereParamValue].concat(whereParams.value.raw);
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
    const results: IQueryValueSet[] = await this.executeSqlQuery(persistedEntityValuesQuery);
    const instanceFactory = new QueryEntityInstanceFactory(this.Entity);
    const instanceValueSets: IQueryValueSet[] = results.map(result => normalizeValueSet(this.Entity, result));

    return instanceFactory.createFromValueSets(instanceValueSets) as T;
  }

  async execute(): Promise<T> {
    const instance = await this.executeSql();

    this.store.update({ result: instance });

    return instance;
  }
}


function sortQueryRelations<T>(queryRelations: T[]): T[] {
  return queryRelations.reverse();
  // sortBy(queryRelations, (sortingQueryRelation: IQueryPropertyRelation) => {
  //   const queryRelationEntities = queryRelations
  //     .filter(queryRelation => queryRelation !== sortingQueryRelation)
  //     .map(queryRelation => queryRelation.base.entity);
  //
  //   return sortingQueryRelation.related.entity
  // })
}