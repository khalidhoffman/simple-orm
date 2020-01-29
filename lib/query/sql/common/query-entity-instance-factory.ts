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
    //  if `relations` is specifier, do we exclude non-specified properties?
    const instance = this.create();
    const queryRelations = GlobalMetaRegistry.getQueryRelations(constructor, this.getInstanceRelations(instance));
    const propertyMetas = GlobalMetaRegistry.getPropertyMetasByConstructor(constructor);
    const relationMetas = GlobalMetaRegistry.getRelationMetasByConstructor(constructor);

    valueSets.forEach(valueSet => {

      propertyMetas.concat(relationMetas).forEach((propertyMeta, propertyMetaIndex) => {
        const propertyName = propertyMeta.propertyName;
        const propertyValue = valueSet[propertyName as keyof typeof valueSet];

        if (propertyValue === undefined || propertyValue === null) {
          // NOTE we ignore properties with undefined/null values
          return;
        }

        const propertyRelation: IQueryPropertyRelation = queryRelations.find(queryRelation => {
          const queryRelationBasePropertyMeta: IPropertyMeta = queryRelation.base.property.meta;
          const queryRelationRelatedPropertyMeta: IPropertyMeta = queryRelation.base.property.relationMeta;
          const isSameEntity = queryRelationBasePropertyMeta.fn === propertyMeta.fn;
          const isSamePropertyName = queryRelationBasePropertyMeta.propertyName === propertyName;
          const isSameRelatedPropertyName = queryRelationRelatedPropertyMeta.propertyName === propertyName;

          return isSameEntity && (isSamePropertyName || isSameRelatedPropertyName);
        });
        const propertyRelationMetaType = propertyRelation && propertyRelation.type;

        switch (propertyRelationMetaType) {
          case EntityRelationType.OneToMany: {
            const baseEntityPropertyKey: PropertyKey = propertyRelation && propertyRelation.base.property.relationMeta.propertyName || propertyName;
            const relatedEntityPropertyKey: PropertyKey = propertyRelation.related.property.meta.propertyName;
            const arrayValue = instance[baseEntityPropertyKey] || [];
            const relatedConstructor = propertyRelation.related.entity.fn;
            const relatedInstanceFactory = new QueryEntityInstanceFactory(relatedConstructor);
            const relatedInstances = relatedInstanceFactory.createFromValueSets([
                // TODO determine correct ValueSet
                { [relatedEntityPropertyKey]: propertyValue },
                valueSet
              ]);

            instance[propertyName] = propertyValue;
            instance[baseEntityPropertyKey] = arrayValue.concat(relatedInstances);
            break;
          }

          case EntityRelationType.ManyToMany: {
            throw new Error('Many-To-Many relation is not implemented');
          }

          case EntityRelationType.ManyToOne: {
            const relatedPropertyKey: PropertyKey = propertyRelation && propertyRelation.related.property.meta.propertyName || propertyName;
            const relatedConstructor = propertyRelation.related.entity.fn;
            const relatedInstanceFactory = new QueryEntityInstanceFactory(relatedConstructor);

            instance[propertyName] = relatedInstanceFactory.createFromValueSets([
                // TODO determine correct ValueSet
                { [relatedPropertyKey]: propertyValue },
                valueSet
              ]);
            break;
          }

          default: {
            const relatedBasePropertyKey: PropertyKey = propertyRelation && propertyRelation.base.property.relationMeta.propertyName || propertyName;
            instance[relatedBasePropertyKey] = propertyValue;
          }
        }
      });
    });

    return instance;
  }
}
