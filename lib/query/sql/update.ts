import { AbstractSqlQuery } from './abstract';

export class SqlUpdateQuery<T = any> extends AbstractSqlQuery<T> {

  execute(): Promise<T> {
    throw new Error('Method not implemented.');
  }
}
