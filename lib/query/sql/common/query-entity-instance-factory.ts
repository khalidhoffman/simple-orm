import * as utils             from '../../../utils';
import { GlobalMetaRegistry } from '../../../metadata/meta-registry';
import { EntityRelationType } from '../../../entity-relation';

interface IQueryEntityInstanceParams<T> {
  valueSets: IQueryValueSet[];
  // relations: IQueryRelationsParams<T>;
}

export class QueryEntityInstanceFactory<T extends object> {

  constructor(public fn: Constructor<T>) {

  }

  protected getInstanceRelations(data: T): IRelationalQueryPartial<T> {
    return Object.keys(data).reduce((acc, key) => {
      const value = data[key];

      if (utils.isArray(value)) {
        acc[key] = true

      } else if (utils.isObject(value)) {
        acc[key] = this.getInstanceRelations(value)
      }

      return acc;
    }, {});
  }

  create(valueSets: IQueryValueSet[] = []): T {
    return Object.assign(Object.create(this.fn.prototype), ...valueSets);
  }

  createFromValueSets(valueSets: IQueryValueSet[], params?: IQueryEntityInstanceParams<T>): T {
    const constructor = this.fn;
    // TODO determine whether QueryEntityInstanceFactory should create nested properties according to `valueSets` or explicit `relations`.
    //  if `relations` is specifier, do we exclude non-specified properties after creation?
    const instance = this.create(valueSets);
    const relationPropertyMetas = GlobalMetaRegistry.getRelationMetasByConstructor(constructor);

    relationPropertyMetas.forEach((relationPropertyMeta) => {
      const propertyName = relationPropertyMeta.propertyName;
      const propertyValue = instance[propertyName as keyof typeof instance];

      if (propertyValue === undefined || propertyValue === null) {
        // NOTE we ignore properties with undefined/null values
        return;
      }

      // TODO merge values for each IQueryPropertyRelation
      debugger

      switch (relationPropertyMeta.extra.type) {
        case EntityRelationType.OneToMany: {
          const baseEntityPropertyKey: PropertyKey = relationPropertyMeta.refs.oneTo.property;
          const baseEntityPropertyValue = instance[baseEntityPropertyKey] || [];
          const relatedEntityPropertyKey: PropertyKey = relationPropertyMeta.refs.toMany.property;
          const relatedConstructor = relationPropertyMeta.refs.toMany.constructorFactory();
          const relatedInstanceFactory = new QueryEntityInstanceFactory(relatedConstructor);
          const relatedInstances = baseEntityPropertyValue.map(arrayValueItem => {
            return relatedInstanceFactory.createFromValueSets([
              // TODO determine correct ValueSet
              { [relatedEntityPropertyKey]: instance },
              arrayValueItem
            ]);
          });

          if (propertyName !== baseEntityPropertyKey) {
            throw new Error(`[debug] mismatch propertyName (${propertyName.toString()}) with baseEntityPropertyKey (${baseEntityPropertyKey.toString()})`)
          }

          instance[baseEntityPropertyKey] = relatedInstances;
          break;
        }

        case EntityRelationType.ManyToMany: {
          throw new Error('Many-To-Many relation is not implemented');
        }

        case EntityRelationType.ManyToOne: {
          const relatedPropertyKey: PropertyKey = relationPropertyMeta.refs.toOne.property;
          const relatedConstructor = relationPropertyMeta.refs.toOne.constructorFactory();
          const relatedInstanceFactory = new QueryEntityInstanceFactory(relatedConstructor);

          debugger
          instance[propertyName] = relatedInstanceFactory.createFromValueSets([
            // TODO determine correct ValueSet
            { [relatedPropertyKey]: propertyValue },
          ]);
          break;
        }

        default: {
          instance[propertyName] = propertyValue;
        }
      }
    });

    return instance;
  }
}
