import { GlobalPropertyMetaCollection } from './meta-collection';
import { EntityRelationType }           from './entity-relation';
import { GlobalMetaRegistry }           from './meta-registry';

export function isString(val: any): val is string {
  return typeof val === 'string' || val instanceof String;
}


export function getInverseFnPropertyName(fn: Function) {
  const fnText = fn.toString();
  const propertyNameRegExp = /\.(.+)$/;
  return propertyNameRegExp.test(fnText) ? fnText.match(propertyNameRegExp)[1] : undefined;
}

export function getQueryRelations<T extends object = any>(entityConstructor: Constructor<T>, queryRelationsParams: IQueryRelationsParams<T>, accumulator: IQueryRelation[] = []): IQueryRelation[] {
  const entityPrimaryColumnMetadata = GlobalMetaRegistry.getIdentifierPropertyMeta(entityConstructor);
  const entityMetadata = GlobalMetaRegistry.getClassMeta(entityConstructor);
  const relations: IQueryRelation[] = accumulator;

  if ((queryRelationsParams === undefined) || (queryRelationsParams === null)) {
    debugger
  }


  if (queryRelationsParams === true) {
    return [];
  }

  Object.keys(queryRelationsParams).forEach(queryParamProperty => {
    const entityPropertyRelationMeta = GlobalMetaRegistry.getPropertyRelationMeta(entityConstructor, queryParamProperty as keyof T);
    if (!entityPropertyRelationMeta) {
      debugger
    }
    const entityPropertySqlName = entityPropertyRelationMeta.options.sql.name;
    const entityResolvedPropertyMeta = GlobalMetaRegistry.propertyMetaCollection.find(propertyMeta => {
      return propertyMeta.propertyName === entityPropertyRelationMeta.meta.relation.related.property
        && propertyMeta.fn === entityPropertyRelationMeta.meta.relation.related.getFn()
    }) || entityPrimaryColumnMetadata;
    const entityResolvedPropertyName = entityResolvedPropertyMeta.propertyName;
    const entityPropertyMeta = GlobalMetaRegistry.getPropertyMeta(entityConstructor, entityResolvedPropertyName as keyof T) || entityPropertyRelationMeta;
    if (!entityPropertyMeta) {
      debugger
    }
    let baseRelation: IQueryRelation = {
      type: entityPropertyRelationMeta.meta.relation.type,
      related: {
        property: null,
        alias: null,
        entity: null,
      },
      base: {
        property: {
          entity: entityMetadata,
          meta: entityPropertyMeta,
          relationMeta: entityPropertyRelationMeta,
          alias: entityPropertyMeta.options.sql.alias
        },
        alias: entityPropertyMeta.options.sql.alias,
        entity: entityMetadata
      }
    };

    if (entityPropertyRelationMeta && entityPropertyRelationMeta.meta.relation) {

      switch (entityPropertyRelationMeta.meta.relation.type) {
        case EntityRelationType.OneToMany:
        case EntityRelationType.ManyToOne: {
          const relatedEntityConstructor = entityPropertyRelationMeta.options.typeFunction();
          const relatedEntityPrimaryMeta = GlobalMetaRegistry.getIdentifierPropertyMeta(relatedEntityConstructor);
          const relatedEntityPropertyName = getInverseFnPropertyName(entityPropertyRelationMeta.options.inverseSide);
          const relatedPropertyRelationMeta = GlobalMetaRegistry.getPropertyRelationMeta(relatedEntityConstructor, relatedEntityPropertyName);
          const relatedEntityMeta = GlobalMetaRegistry.getClassMeta(relatedEntityConstructor);
          const relatedResolvedPropertyName = relatedPropertyRelationMeta.options.sql.name || relatedEntityPrimaryMeta.propertyName;
          const relatedPropertyMeta = GlobalMetaRegistry.getPropertyMeta(relatedEntityConstructor, relatedResolvedPropertyName as keyof T) || relatedPropertyRelationMeta;
          const nestedQueryRelations = getQueryRelations(relatedEntityConstructor, queryRelationsParams[queryParamProperty]);
          baseRelation.type = entityPropertyRelationMeta.meta.relation.type;
          baseRelation.related = {
            entity: relatedEntityMeta,
            alias: relatedPropertyMeta.options.sql.alias,
            property: {
              entity: relatedEntityMeta,
              meta: relatedPropertyMeta,
              relationMeta: relatedPropertyRelationMeta,
              alias: relatedPropertyMeta.options.sql.alias
            }
          };
          relations.push(...nestedQueryRelations);
          break;
        }

        case EntityRelationType.OneToOne: {
          throw new Error('query relations for OneToOne not supported');
        }

        case EntityRelationType.ManyToMany: {
          throw new Error('query relations for ManyToMany not supported');
        }
      }

      relations.push(baseRelation);
    }

  });

  return relations;
}

export function queryValueMerge<V extends object = any>(constructor: Constructor<V>, valuesSet: IQueryValues[], relations: IQueryRelationsParams<V>, initValues = {}): V {
  const queryRelations = getQueryRelations(constructor, relations);
  const propertyMetas = GlobalMetaRegistry.getPropertyMetasByConstructor(constructor);
  const relationMetas = GlobalMetaRegistry.getRelationMetasByConstructor(constructor);
  const mergeResult = Object.assign(new constructor(), initValues);

  valuesSet.forEach(values => {

    propertyMetas.concat(relationMetas).forEach((propertyMeta, propertyMetaIndex) => {
      const propertySqlName = propertyMeta.options.sql.alias || propertyMeta.options.sql.name;
      const value = values[propertySqlName];

      if (value === undefined) {
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
