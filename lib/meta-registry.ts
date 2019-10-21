import {
  ClassMetaCollection,
  GlobalClassMetaCollection,
  GlobalPropertyMetaCollection,
  PropertyMetaCollection
} from './meta-collection';

export class MetaRegistry {
  classMetaCollection: ClassMetaCollection = GlobalClassMetaCollection;
  propertyMetaCollection: PropertyMetaCollection = GlobalPropertyMetaCollection;

  getIdentifierPropertyMeta<T = any>(constructor: Constructor<T>): IPropertyMeta {
    const entityPropertiesMetadata = this.propertyMetaCollection.getPropertyMetasByConstructor(constructor);
    return entityPropertiesMetadata.find(propertyMeta => propertyMeta.options.sql.primaryKey);
  }

  getPropertyMeta<T>(constructor: Constructor<T>, propertyName: keyof T): IPropertyMeta {
    return this.propertyMetaCollection.getDefaultPropertyMeta(constructor, propertyName);
  }

  getRelationMetasByConstructor<T>(constructor: Constructor<T>): IPropertyMeta[] {
    return this.propertyMetaCollection.getRelationMetasByConstructor(constructor);
  }

  getPropertyRelationMeta<T>(constructor: Constructor<T>, propertyName: keyof T): IPropertyMeta {
    const relationMetas = this.getRelationMetasByConstructor(constructor);

    return relationMetas.reduce((propertyMeta: IPropertyMeta, relation: IPropertyMeta) => {
      if (relation.propertyName !== propertyName) {
        return propertyMeta;
      }
      return Object.assign({ ...propertyMeta }, relation, propertyMeta);
    }, null);
  }

  getPropertyMetasByConstructor<T>(constructor: Constructor<T>): IPropertyMeta[] {
    return this.propertyMetaCollection.getPropertyMetasByConstructor(constructor);
  }

  getClassMeta<T>(constructor: Constructor<T>): IClassMeta {
    return this.classMetaCollection.getClassMeta(constructor);
  }
}

export const GlobalMetaRegistry = new MetaRegistry();