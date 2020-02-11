import { logger } from '../logger';
import * as utils from '../utils';

import {
  GlobalClassMetaCollection,
  GlobalPropertyMetaCollection,
} from './meta-collection';

export class MetaRegistry {

  getIdentifierPropertyMeta<T = any>(constructor: Constructor<T>): IPropertyMeta {
    const entityPropertiesMetadata = GlobalPropertyMetaCollection.getPropertyMetasByConstructor(constructor);
    return entityPropertiesMetadata.find(propertyMeta => propertyMeta.options.sql.primaryKey);
  }

  getPropertyMeta<T>(constructor: Constructor<T>, propertyName: keyof T): IPropertyMeta[] {
    return GlobalPropertyMetaCollection.getPropertyMetas(constructor, propertyName);
  }

  getRelationMetas<T>(constructor: Constructor<T>, propertyName: keyof T): IRelationPropertyMeta[] {
    return GlobalPropertyMetaCollection.getRelationMetasByConstructor(constructor)
      .filter(meta => meta.propertyName === propertyName);
  }

  getRelationMetasByConstructor<T>(constructor: Constructor<T>): IRelationPropertyMeta[] {
    return GlobalPropertyMetaCollection.getRelationMetasByConstructor(constructor);
  }

  getPropertyRelationMeta<T>(constructor: Constructor<T>, propertyName: keyof T): IRelationPropertyMeta[] {
    return GlobalPropertyMetaCollection.getRelationMetas(constructor, propertyName);
  }

  getPropertyMetasByConstructor<T>(constructor: Constructor<T>): IPropertyMeta[] {
    return GlobalPropertyMetaCollection.getPropertyMetasByConstructor(constructor);
  }

  getClassMeta<T>(constructor: Constructor<T>): IClassMeta {
    return GlobalClassMetaCollection.getClassMeta(constructor);
  }

  getQueryRelationPropertyMeta<T extends object = any>(entityConstructor: Constructor<T>, queryRelationsParams: IRelationalQueryPartial<T>): IRelationPropertyMeta[] {
    if ((queryRelationsParams === undefined) || (queryRelationsParams === null)) {
      debugger
    }
    const getRelations = <T>(entityConstructor: Constructor<T>, queryRelationsParams: IRelationalQueryPartial<T>, relations: IRelationPropertyMeta[] = []): IRelationPropertyMeta[] => {
      if (!utils.isObject(queryRelationsParams)) {
        return relations;
      }


      Object.keys(queryRelationsParams).forEach(queryParamProperty => {
        const propertyRelations = GlobalMetaRegistry.getPropertyRelationMeta(entityConstructor, queryParamProperty as keyof T);

        propertyRelations.forEach(propertyRelation => {
          propertyRelation.relatedMeta.forEach(relationMeta => {
            getRelations(relationMeta.fn, queryRelationsParams[queryParamProperty], relations);
          })
        });

        relations.push(...propertyRelations);
      });

      return relations;
    };

    return getRelations(entityConstructor, queryRelationsParams);
  }
}

export const GlobalMetaRegistry = new MetaRegistry();

