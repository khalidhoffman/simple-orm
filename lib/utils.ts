import { GlobalPropertyMetaCollection } from './meta-collection';
import { EntityRelationType }           from './graph/entity-relation';
import { GlobalMetaRegistry }           from './meta-registry';

export function isString(val: any): val is string {
  return typeof val === 'string' || val instanceof String;
}


export function getInverseFnPropertyName(fn: Function) {
  const fnText = fn.toString();
  const propertyNameRegExp = /\.(.+)$/;
  return propertyNameRegExp.test(fnText) ? fnText.match(propertyNameRegExp)[1] : undefined;
}


export function queryValueMerge<V extends object = any>(constructor: Constructor<V>, valuesSet: IQueryValues[], relations: IQueryRelationsParams<V>, initValues = {}): V {
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
          const relatedInstance = queryValueMerge(
            relatedConstructor,
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
          mergeResult[propertyName] = queryValueMerge(
            relatedConstructor,
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
  })

  return mergeResult;
}

export function uuidGen(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
