import { SqlOperation }       from './query-operation';
import { SqlInsertOperation } from './query-insert-operation';
import { EntitySqlRef }       from './entity-sql-ref';

export class SqlQueryOperationQueue {
  operations: SqlOperation[] = [];

  push(sqlOperation: SqlOperation) {
    this.operations.push(sqlOperation);
  }

  getOperationsByType<T extends SqlOperationType>(operationType: T): this[T] {
    return this.operations.filter(sqlOperation => sqlOperation.type === operationType) as this[T];
  }

  getOperationsByTableName<T extends SqlOperationType>(operationType: T, tableName: string): this[T] {
    const sqlOperations = this.getOperationsByType(operationType);

    return sqlOperations.filter(sqlOperation => sqlOperation.classMeta.tableName === tableName) as this[T];
  }

  getClassMetas(): IClassMeta[] {
    return this.operations.reduce((acc, sqlOp) => {
      if (!acc.includes(sqlOp.classMeta.tableName)) {
        acc.push(sqlOp.classMeta);
      }

      return acc;
    }, []);
  }

  getClassSqlRefs(): EntitySqlRef[] {
    return this.operations.reduce((acc, sqlOp) => {
      if (!acc.includes(sqlOp.classMeta.tableName)) {
        return acc.concat(sqlOp.classSqlRef);
      }

      return acc;
    }, []);
  }

  get insert(): SqlInsertOperation[] {
    return this.getOperationsByType('insert');
  };

  get remove(): SqlOperation[] {
    return this.getOperationsByType('remove');
  };

  get select(): SqlOperation[] {
    return this.getOperationsByType('select');
  };

  get update(): SqlOperation[] {
    return this.getOperationsByType('update');
  };
}