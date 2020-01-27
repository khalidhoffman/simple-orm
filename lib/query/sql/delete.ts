import { AbstractSqlQuery } from './abstract';

export class SqlDeleteQuery<T extends object = any> extends AbstractSqlQuery<T> {

  execute(): Promise<T> {
    throw new Error('Method not implemented.');
  }
}
