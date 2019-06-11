import { AbstractSqlQuery } from './abstract';

export class SqlCreateQuery<T = any> extends AbstractSqlQuery<T> {

  execute(): Promise<T> {
    throw new Error('Method not implemented.');
  }
}
