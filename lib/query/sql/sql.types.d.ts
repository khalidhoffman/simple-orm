type SqlOperationType = 'select' | 'insert' | 'update' | 'remove';

type InsertSqlResult = {
  insertId: number,
  fieldCount: number;
  affectedRows: number;
  serverStatus: number;
  warningCount: number;
  message: string;
  changedRows: number;
  protocol41: boolean;
};
