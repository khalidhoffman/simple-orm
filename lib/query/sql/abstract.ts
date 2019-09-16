import * as Knex  from 'knex';
import * as mysql from 'mysql';

import { logger }       from '../../logger';
import { MetaRegistry } from '../../meta-registry';

import { AbstractQuery }      from '../base';
import { EntityRelationType } from '../../entity-relation';

const knex = require('knex');
const sql = knex({
  dialect: 'mysql',
  asyncStackTraces: true
});

export type IEntitySqlRef = Knex.QueryBuilder;
export type IEntityPropertySqlRef = Knex.QueryBuilder;
export type IEntityRelationSqlRef = Knex.QueryBuilder;
export type IEntityPropertyAliasSqlRef<K extends string, E> = Knex.Ref<K, E>;

function getInverseFnPropertyName(fn: Function) {
  const fnText = fn.toString();
  const propertyNameRegExp = /\.(.+)$/;
  return propertyNameRegExp.test(fnText) ? fnText.match(propertyNameRegExp)[1] : undefined;
}

function getEntitySqlRef(entityMetadata: IClassMeta): IEntitySqlRef {
  return sql.table(entityMetadata.tableName);
}

export abstract class AbstractSqlQuery<T = any> extends AbstractQuery {
  sql: Knex = sql;
  logger = logger;
  metaRegistry: MetaRegistry = new MetaRegistry();
  entitySqlRef: IEntitySqlRef;
  entityPropertiesMetadata: IPropertyMeta[];
  entityPrimaryColumnMetadata: IPropertyMeta;

  constructor(protected Entity: Constructor<T>, protected queryParams: IQueryParams) {
    super(Entity, queryParams);
    const entitySqlRef = getEntitySqlRef(this.entityMetadata);
    const entityPrimaryColumnMetadata = this.metaRegistry.findPrimaryColumn(this.entityPropertiesMetadata);

    this.entitySqlRef = entitySqlRef;
    this.entityPrimaryColumnMetadata = entityPrimaryColumnMetadata;
    this.store.update({
      sql: this.sql,
      entityPrimaryColumnMetadata,
      entitySqlRef
    });
  }

  abstract execute(): Promise<T>;

  getQueryEntity(EntityConstructor: Constructor, propertyKey?: PropertyKey): IQueryEntity {
    const classMeta = this.metaRegistry.getClassMeta(EntityConstructor);
    const primaryMeta = this.metaRegistry.getEntityPrimaryColumnMeta(EntityConstructor);
    const propertyMeta = propertyKey ? this.metaRegistry.getPropertyMeta(EntityConstructor, propertyKey) : primaryMeta;

    return {
      sqlRef: getEntitySqlRef(classMeta),
      meta: classMeta,
      fn: EntityConstructor,
      propertyKey: propertyMeta.propertyName,
      propertyMeta: propertyMeta,
      primaryKey: primaryMeta.propertyName,
      primaryMeta: primaryMeta
    }
  }

  getEntityPropertySqlRef<Key extends string, Entity>(entityPropertyMetadata: IPropertyMeta, entityMetadata: IClassMeta = this.entityMetadata, options?: { disableAlias: boolean }): IEntityPropertyAliasSqlRef<Key, Entity> {
    if (options && options.disableAlias) {
      return this.sql.ref(entityPropertyMetadata.options.sql.name).withSchema(entityMetadata.tableName);
    }
    return this.sql.ref(entityPropertyMetadata.options.sql.name).as(entityPropertyMetadata.options.sql.alias).withSchema(entityMetadata.tableName);
  }

  getQueryRelations(entityConstructor: Constructor<T>, queryRelationsParams: IQueryRelationsParams<T> = this.queryParams.options.relations, accumulator: IQueryRelation[] = []): IQueryRelation[] {
    const relations: IQueryRelation[] = accumulator;

    Object.keys(queryRelationsParams).forEach(queryParamProperty => {
      const entityPropertyRelationMeta = this.metaRegistry.getPropertyRelationMeta(entityConstructor, queryParamProperty as keyof T);
      if (!entityPropertyRelationMeta) {
        debugger
      }
      const entityResolvedPropertyName = entityPropertyRelationMeta.options.sql.name || this.entityPrimaryColumnMetadata.propertyName;
      const entityPropertyMeta = this.metaRegistry.getPropertyMeta(this.Entity, entityResolvedPropertyName);
      let baseRelation: IQueryRelation = {
        type: entityPropertyRelationMeta.meta.relation.type,
        related: {
          property: null,
          alias: null,
          entity: null,
        },
        base: {
          property: {
            entity: this.getQueryEntity(entityConstructor),
            meta: entityPropertyMeta,
            relationMeta: entityPropertyRelationMeta,
            alias: entityPropertyMeta.options.sql.alias
          },
          alias: entityPropertyMeta.options.sql.alias,
          entity: this.entityMetadata
        }
      };

      if (entityPropertyRelationMeta && entityPropertyRelationMeta.meta.relation) {

        switch (entityPropertyRelationMeta.meta.relation.type) {
          case EntityRelationType.OneToMany:
          case EntityRelationType.ManyToOne: {
            const relatedEntityConstructor = entityPropertyRelationMeta.options.typeFunction();
            const relatedEntityPrimaryMeta = this.metaRegistry.getEntityPrimaryColumnMeta(relatedEntityConstructor);
            const relatedEntityPropertyName = getInverseFnPropertyName(entityPropertyRelationMeta.options.inverseSide);
            const relatedPropertyRelationMeta = this.metaRegistry.getPropertyRelationMeta(relatedEntityConstructor, relatedEntityPropertyName);
            const relatedEntityMeta = this.metaRegistry.getClassMeta(relatedEntityConstructor);
            const relatedResolvedPropertyName = relatedPropertyRelationMeta.options.sql.name || relatedEntityPrimaryMeta.propertyName;
            const relatedPropertyMeta = this.metaRegistry.getPropertyMeta(relatedEntityConstructor, relatedResolvedPropertyName as keyof T)
            const nestedQueryRelations = this.getQueryRelations(relatedEntityConstructor, queryRelationsParams[queryParamProperty]);
            baseRelation.type = entityPropertyRelationMeta.meta.relation.type;
            baseRelation.related = {
              entity: relatedEntityMeta,
              alias: relatedPropertyMeta.options.sql.alias,
              property: {
                entity: this.getQueryEntity(relatedEntityMeta.fn),
                meta: relatedPropertyMeta,
                relationMeta: relatedPropertyRelationMeta,
                alias: relatedPropertyMeta.options.sql.alias
              }
            };
            relations.push(...nestedQueryRelations);
            break;
          }

          case EntityRelationType.OneToOne: {
            throw new Error('query relations for OneToOne not supported');
          }

          case EntityRelationType.ManyToMany: {
            throw new Error('query relations for ManyToMany not supported');
          }
        }

        relations.push(baseRelation);
      }

    });

    return relations;
  }

  executeSqlQuery<T = any>(sql: string, values: any[] = [], connection: mysql.Connection = (global as any).GLOBAL_MYSQL_CONN): Promise<T[]> {
    const queryOptions: mysql.QueryOptions = {
      sql,
      values
    };

    this.logger.log('debug', `executing sql: %s %j`, [sql, values]);

    return new Promise((resolve, reject) => {
      connection.query(queryOptions, (err, result) => {
        err ? reject(err) : resolve(result);
      })
    })
  }
}
