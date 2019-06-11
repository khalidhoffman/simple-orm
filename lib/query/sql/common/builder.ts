import { SqlQueryOperationQueue } from './query-operation-queue';
import { GlobalMetaRegistry }     from '../../../metadata/meta-registry';

export class SQLBuilder {
  constructor(queryOperationsQueue: SqlQueryOperationQueue) {
  }

}

export function normalizeValueSet<T>(constructor: Constructor<T>, valueSet: IQueryValueSet<T>): IQueryValueSet<T> {
  const propertyMetas = GlobalMetaRegistry.getPropertyMetasByConstructor(constructor);
  const relationMetas = GlobalMetaRegistry.getRelationMetasByConstructor(constructor);

  return propertyMetas.concat(relationMetas).reduce((normalizedValueSet: IQueryValueSet<T>, propertyMeta, propertyMetaIndex) => {
    const propertyName = propertyMeta.propertyName;
    const propertySqlName = propertyMeta.options.sql.alias || propertyMeta.options.sql.name;
    const propertyValue = valueSet[propertySqlName] || valueSet[propertyName as keyof typeof valueSet];


    return Object.assign(normalizedValueSet, { [propertyName]: propertyValue });
  }, {});
}
