import * as utils             from '../../../utils';
import { logger }             from '../../../logger';
import { GlobalMetaRegistry } from '../../../metadata/meta-registry';

import { SqlOperation } from './query-operation';

export class SqlInsertOperation<Entity extends object = any> extends SqlOperation<Entity> {
  readonly type = 'insert';

  toSqlValueSet(): IQueryValueSet {
    const entity = this.value;
    const primaryKeyMeta: IPropertyMeta = GlobalMetaRegistry.getIdentifierPropertyMeta(this.classMeta.fn);

    return utils.mapObject(entity, (result, value, key) => {
      const propertyMeta = this.propertyMetas.find(propertyMeta => propertyMeta.propertyName === key);

      if (!propertyMeta) {
        logger.log('warn', `[insert operation] unknown property '${key}' defined in object`);
        return result;
      }

      return Object.assign(result, {
        [propertyMeta.options.sql.name]: value
      });
    }, { [primaryKeyMeta.options.sql.name]: undefined });
  }
}