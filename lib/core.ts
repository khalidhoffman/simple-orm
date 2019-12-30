import * as mysql from 'mysql';

import {
  GlobalClassMetaCollection,
  GlobalPropertyMetaCollection
} from './metadata/meta-collection';
import {
  SqlCreateQuery,
  SqlReadQuery,
  SqlUpdateQuery
} from './query';

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

  async insert<T extends object>(Entity: Constructor<T>, values: DeepPartial<T>, options?: ISaveOptions<T>): Promise<T> {
    const query = new SqlCreateQuery<T>(Entity, { entity: values, options });

    return query.execute();
  }

  async retrieve<T>(Entity: Constructor<T>, identifier: number, options?: IRetrieveOptions<T>): Promise<T> {
    const query = new SqlReadQuery<T>(Entity, { entity: identifier, options });

    return query.execute();
  }

  async update<T extends object>(Entity: Constructor<T>, values: DeepPartial<T>, options?: ISaveOptions<T>): Promise<T> {
    const query = new SqlUpdateQuery<T>(Entity, { entity: values, options });

    return query.execute();
  }
}
