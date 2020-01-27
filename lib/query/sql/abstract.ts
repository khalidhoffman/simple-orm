import * as Knex  from 'knex';
import * as mysql from 'mysql';

import { logger } from '../../logger';

import { MetaRegistry } from '../../metadata/meta-registry';

import { EntityRelationGraph } from '../../graph/entity-relation-graph';

import { AbstractQuery } from '../abstract';

import { SqlQueryOperationQueue } from './common/query-operation-queue';
import {
  EntityPropertyAliasSqlRef,
  EntitySqlRef,
  sql
}                                 from './common/entity-sql-ref';

export abstract class AbstractSqlQuery<T extends object = any> extends AbstractQuery {
  sql: Knex = sql;
  logger = logger;
  metaRegistry: MetaRegistry = new MetaRegistry();
  entitySqlRef: EntitySqlRef;
  entityPropertiesMetadata: IPropertyMeta[];
  entityPrimaryColumnMetadata: IPropertyMeta;
  entityPersistenceGraph: EntityRelationGraph<T>;
  operationsQueue: SqlQueryOperationQueue = new SqlQueryOperationQueue();

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
    return this.entityPersistenceGraph.getScopeKeyMeta();
  }


  getPropertySqlRef<Key extends string, Entity>(
    entityPropertyMetadata: IPropertyMeta,
    entityMetadata: IClassMeta = this.entityMetadata,
    options?: { disableAlias: boolean }
  ): EntityPropertyAliasSqlRef<Key, Entity> {

    if (options && options.disableAlias || !entityPropertyMetadata.options.sql.alias) {
      return this.sql.ref(entityPropertyMetadata.options.sql.name).withSchema(entityMetadata.tableName);
    }
    return this.sql.ref(entityPropertyMetadata.options.sql.name).as(entityPropertyMetadata.options.sql.alias).withSchema(entityMetadata.tableName);
  }

  getEntitySqlRef(entityMetadata: IClassMeta): EntitySqlRef {
    return this.sql.table(entityMetadata.tableName);
  }

  executeSqlQuery<T = any>(sql: string, values: any[] = [], connection: mysql.Connection = (global as any).GLOBAL_MYSQL_CONN): Promise<T> {
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
