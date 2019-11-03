import * as Knex  from 'knex';
import * as mysql from 'mysql';

import { logger }       from '../../logger';
import { MetaRegistry } from '../../meta-registry';

import { AbstractQuery }       from '../base';
import {
  EntityPersistenceOperationsGraphNode
}                              from '../../graph/entity-relation-graph-node';
import { EntityRelationGraph } from '../../graph/entity-relation-graph';

const knex = require('knex');
const sql = knex({
  dialect: 'mysql',
  asyncStackTraces: true
});

export type IEntitySqlRef = Knex.QueryBuilder;
export type IEntityPropertySqlRef = Knex.QueryBuilder;
export type IEntityRelationSqlRef = Knex.QueryBuilder;
export type IEntityPropertyAliasSqlRef<K extends string, E> = Knex.Ref<K, E>;

export abstract class AbstractSqlQuery<T = any> extends AbstractQuery {
  sql: Knex = sql;
  logger = logger;
  metaRegistry: MetaRegistry = new MetaRegistry();
  entitySqlRef: IEntitySqlRef;
  entityPropertiesMetadata: IPropertyMeta[];
  entityPrimaryColumnMetadata: IPropertyMeta;
  entityPersistenceGraph: EntityRelationGraph<T>;

  constructor(Entity: Constructor<T>, queryParams: IQueryParams<T>) {
    super(Entity, queryParams);
    const entitySqlRef = this.getEntitySqlRef(this.entityMetadata);
    const entityPrimaryColumnMetadata = this.metaRegistry.getIdentifierPropertyMeta(this.Entity);

    this.entityPersistenceGraph = new EntityRelationGraph(this.Entity, this.queryParams.entity as IRelationalQueryPartial<T>);
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
    const primaryMeta = this.metaRegistry.getIdentifierPropertyMeta(EntityConstructor);
    const propertyMeta = propertyKey ? this.metaRegistry.getPropertyMeta(EntityConstructor, propertyKey) : primaryMeta;

    return {
      sqlRef: this.getEntitySqlRef(classMeta),
      meta: classMeta,
      fn: EntityConstructor,
      propertyKey: propertyMeta.propertyName,
      propertyMeta: propertyMeta,
      primaryKey: primaryMeta.propertyName,
      primaryMeta: primaryMeta
    }
  }

  getAllPrimaryKeyMeta(): IPropertyMeta[] {
    return this.entityPersistenceGraph.getPrimaryKeyMeta();
  }

  getAllScopedKeyMeta(): IPropertyMeta[] {
    return this.entityPersistenceGraph.getScopedKeyMeta();
  }


  getPropertySqlRef<Key extends string, Entity>(
    entityPropertyMetadata: IPropertyMeta,
    entityMetadata: IClassMeta = this.entityMetadata,
    options?: { disableAlias: boolean }
  ): IEntityPropertyAliasSqlRef<Key, Entity> {

    if (options && options.disableAlias || !entityPropertyMetadata.options.sql.alias) {
      return this.sql.ref(entityPropertyMetadata.options.sql.name).withSchema(entityMetadata.tableName);
    }
    return this.sql.ref(entityPropertyMetadata.options.sql.name).as(entityPropertyMetadata.options.sql.alias).withSchema(entityMetadata.tableName);
  }
  getEntitySqlRef(entityMetadata: IClassMeta): IEntitySqlRef {
    return sql.table(entityMetadata.tableName);
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
