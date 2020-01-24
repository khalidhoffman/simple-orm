import { GlobalMetaRegistry } from './metadata/meta-registry';
import { EntityRelationType } from './graph/entity-relation';

export class QueryEntityInstanceFactory<T extends object> {

  constructor(public constructor: Constructor<T>) {

  }

  create(valuesSet: IQueryValues[], relations: IQueryRelationsParams<T>, initValues = {}): T {
    const constructor = this.constructor;
    const queryRelations = GlobalMetaRegistry.getQueryRelations(constructor, relations);
    const propertyMetas = GlobalMetaRegistry.getPropertyMetasByConstructor(constructor);
    const relationMetas = GlobalMetaRegistry.getRelationMetasByConstructor(constructor);
    const mergeResult = Object.assign(new constructor(), initValues);

    valuesSet.forEach(values => {

      propertyMetas.concat(relationMetas).forEach((propertyMeta, propertyMetaIndex) => {
        const propertySqlName = propertyMeta.options.sql.alias || propertyMeta.options.sql.name;
        const value = values[propertySqlName];

        if (value === undefined || value === null) {
          return;
        }

        const queryRelation: IQueryRelation = queryRelations.find(queryRelation => {
          const queryRelationBasePropertyMeta: IPropertyMeta = queryRelation.base.property.meta;
          const queryRelationRelationPropertyMeta: IPropertyMeta = queryRelation.base.property.relationMeta;

          return queryRelationBasePropertyMeta.fn === propertyMeta.fn && ((queryRelationBasePropertyMeta.propertyName === propertyMeta.propertyName)
            || (queryRelationRelationPropertyMeta.propertyName === propertyMeta.propertyName))
        });
        const propertyRelationMetaType = queryRelation && queryRelation.type;
        const propertyName = propertyMeta.propertyName;

        switch (propertyRelationMetaType) {
          case EntityRelationType.OneToMany: {
            const relatedBasePropertyKey: PropertyKey = queryRelation && queryRelation.base.property.relationMeta.propertyName || propertyMeta.propertyName;
            const arrayValue = mergeResult[relatedBasePropertyKey] || [];
            const relatedConstructor = queryRelation.related.entity.fn;
            const relatedInstanceFactory = new QueryEntityInstanceFactory(relatedConstructor);
            const relatedInstance = relatedInstanceFactory.create(
              [values],
              relations[relatedBasePropertyKey],
              { [queryRelation.related.property.meta.propertyName]: value }
            );

            mergeResult[propertyName] = value;
            mergeResult[relatedBasePropertyKey] = arrayValue.concat(relatedInstance);
            break;
          }
          case EntityRelationType.ManyToMany:
            break;
          case EntityRelationType.ManyToOne: {
            const relatedPropertyKey: PropertyKey = queryRelation && queryRelation.related.property.meta.propertyName || propertyMeta.propertyName;
            const relatedConstructor = queryRelation.related.entity.fn;
            const relatedInstanceFactory = new QueryEntityInstanceFactory(relatedConstructor);

            mergeResult[propertyName] = relatedInstanceFactory.create(
              [values],
              relations[propertyName],
              { [relatedPropertyKey]: value }
            );
            break;
          }
          default: {
            const relatedBasePropertyKey: PropertyKey = queryRelation && queryRelation.base.property.relationMeta.propertyName || propertyMeta.propertyName;
            mergeResult[relatedBasePropertyKey] = value;
          }
        }
      });
    });

    return mergeResult;
  }
}