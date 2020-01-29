import * as Knex  from 'knex';
import * as mysql from 'mysql';

import { logger } from '../../logger';

import { MetaRegistry } from '../../metadata/meta-registry';

import { AbstractQuery } from '../abstract';

import { SqlQueryOperationQueue } from './common/query-operation-queue';
import {
  EntityPropertyAliasSqlRef,
  EntitySqlRef,
  sql
}                               from './common/entity-sql-ref';
import { EntityQueryGraphNode } from '../entity-query-graph-node';

export abstract class AbstractSqlQuery<T extends object = any> extends AbstractQuery {
  sql: Knex = sql;
  logger = logger;
  metaRegistry: MetaRegistry = new MetaRegistry();
  entitySqlRef: EntitySqlRef;
  entityPropertiesMetadata: IPropertyMeta[];
  entityQueryGraph: EntityQueryGraphNode<T>;
  operationsQueue: SqlQueryOperationQueue = new SqlQueryOperationQueue();

  constructor(Entity: Constructor<T>, queryParams: IQueryParams<T>) {
    super(Entity, queryParams);

    this.entitySqlRef = this.getEntitySqlRef(this.entityMetadata);
    this.entityQueryGraph = new EntityQueryGraphNode({
      entityConstructor: this.Entity,
      entity: this.queryParams.entity,
      parent: null
    });
  }

  abstract execute(): Promise<T>;

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
