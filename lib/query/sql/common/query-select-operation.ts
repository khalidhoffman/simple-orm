import { EntitySqlRef } from './entity-sql-ref';
import { SqlOperation } from './query-operation';

interface ISqlProperty {

}

interface ISqlSelectOperationJoin {
  property: ISqlProperty;
  on: ISqlSelectOperationWhere;
}

interface ISqlSelectOperationWhere {
  left: ISqlProperty;
  operator: IEntityRelationOperator;
  right: ISqlProperty;
}

interface ISqlSelectOperationCriteria {
  /*
   ORDER BY { columnName | columnPosition | expression }
   [ ASC | DESC ]
   [ NULLS FIRST | NULLS LAST ]
   [ , columnName | columnPosition | expression
   [ ASC | DESC ]
   [ NULLS FIRST | NULLS LAST ]
   ]*
   */
  property: ISqlProperty;
  operator: 'ASC' | 'DESC' | string;
}

export class SqlSelectOperation<Entity extends object = any> extends SqlOperation<Entity> {
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

  selects: ISqlProperty[];
  joins: ISqlSelectOperationJoin[];
  wheres: ISqlSelectOperationWhere[];
  orderBys: ISqlSelectOperationCriteria[];

  constructor(init: Partial<SqlSelectOperation>) {
    super(init);
  }
}