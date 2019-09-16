import * as mysql from 'mysql';

import {
  GlobalClassMetaCollection,
  GlobalPropertyMetaCollection
}                       from './meta-collection';
import { SqlReadQuery } from './query';

/**
 * TODO: complete following sub-tasks
 * Create Query interface/class
 *    - should maintain reference to connection
 *    - should maintain reference to shareable/reusable IPropertyMetas and IClassMeta
 */

export class SimpleORM {
  static classMetaCollection = GlobalClassMetaCollection;
  static propertyMetaCollection = GlobalPropertyMetaCollection;

  constructor(private connection: mysql.Connection) {
    (global as any).GLOBAL_MYSQL_CONN = connection;
  }

  async retrieve<T>(Entity: Constructor<T>, identifier: number, options?: IRetrieveOptions<T>): Promise<T> {
    const query = new SqlReadQuery<T>(Entity, { identifier, options });

    return query.execute();
  }
}
