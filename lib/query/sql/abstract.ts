import {
  TableDefinition,
  SQL,
  Column,
  Table
} from 'sql';
import * as mysql from 'mysql';

import { SimpleORM }     from '../../core';
import { logger }        from '../../logger';
import { AbstractQuery } from '../base';

const SQL = require('sql');

export abstract class AbstractSqlQuery<T = any> extends AbstractQuery {
  sql = SQL;
  logger = logger;

  constructor(protected Entity: Constructor<T>, protected queryParams: IQueryParams) {
    super();

    const entityMetadata = SimpleORM.classMetaCollection.getClassMeta(Entity);
    const entityPropertiesMetadata = SimpleORM.propertyMetaCollection.getPropertyMetasByClass(Entity);
    const entityPrimaryColumnMetadata = this.findPrimaryColumn(entityPropertiesMetadata);
    const entitySqlParams = this.getSqlParams(entityMetadata, entityPropertiesMetadata);

    entityPrimaryColumnMetadata.meta.propertyValuePath = entityPrimaryColumnMetadata.options.sql.name || entityPrimaryColumnMetadata.meta.propertyValuePath;

    this.sql.setDialect('mysql');
    this.store.update({
      sql: this.sql,
      Entity,
      queryParams,
      entityMetadata,
      entityPropertiesMetadata,
      entityPrimaryColumnMetadata,
      entitySqlParams
    });
  }

  abstract execute(): Promise<T>;

  protected getEntitySqlParams<E = any>(Entity: Constructor<E>): TableDefinition<string, E> {
    const entityMetadata = SimpleORM.classMetaCollection.getClassMeta(Entity);
    const entityPropertiesMetadata = SimpleORM.propertyMetaCollection.getPropertyMetasByClass(Entity);
    return this.getSqlParams(entityMetadata, entityPropertiesMetadata);
  }

  getEntitySqlRef<E = any>(Entity: Constructor<E>): Table<any, any> {
    const sqlParams = this.getEntitySqlParams(Entity);

    return this.sql.define(sqlParams);
  }

  getEntityPrimaryColumnMeta<E = any>(Entity: Constructor<E>): IPropertyMeta {
    const entityPropertiesMetadata = SimpleORM.propertyMetaCollection.getPropertyMetasByClass(Entity);
    return this.findPrimaryColumn(entityPropertiesMetadata);
  }

  getEntitySqlColumns(entitySqlRef: SQL, entitySqlParams: TableDefinition<any, any>): Column<any, any>[] {
    return Object.keys(entitySqlParams.columns).reduce((acc, key) => {
      return acc.concat(entitySqlRef[key]);
    }, []);
  }

  findPrimaryColumn(propertyMetas: IPropertyMeta[]): IPropertyMeta {
    return this.findMySQLPrimaryColumn(propertyMetas);
  }

  findMySQLPrimaryColumn(propertyMetas: IPropertyMeta[]): IPropertyMeta {
    return propertyMetas.find(propertyMeta => propertyMeta.options.sql.primaryKey)
  }

  getEntityPropertiesMetadataColumns(entityPropertiesMetadata: IPropertyMeta[]): Dict<ColumnDefinition<any, any>> {
    return entityPropertiesMetadata.map((propertyMetadata) => {
        return {
          jsType: String,
          dataType: propertyMetadata.type || 'string',
          name: propertyMetadata.propertyName,
          ...propertyMetadata.options.sql
        };
      })
      .reduce((acc, columnDefinition) => {
        return Object.assign(acc, { [columnDefinition.name]: columnDefinition })
      }, {} as Dict<ColumnDefinition<any, any>>)
  }

  getSqlParams(entityMetadata: IClassMeta, entityPropertiesMetadata: IPropertyMeta[]): TableDefinition<any, any> {
    return {
      schema: undefined,
      name: entityMetadata.tableName,
      columns: this.getEntityPropertiesMetadataColumns(entityPropertiesMetadata)
    };
  }


  execSQL<T = any>(sql: string, values?: any[], connection: mysql.Connection = (global as any).GLOBAL_MYSQL_CONN): Promise<T[]> {
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
