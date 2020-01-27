import { EntitySqlRef }       from './entity-sql-ref';

export class SqlOperation<Entity extends object = any> {
  type: SqlOperationType;
  propertyMetas: IPropertyMeta[];
  classMeta: IClassMeta;
  relationMetas: IPropertyMeta[];
  classSqlRef: EntitySqlRef;
  value: Entity;
  /**
   * higher number denotes higher priority
   */
  priority?: number;

  constructor(init: Partial<SqlOperation>) {
    Object.assign(this, init);
  }
}