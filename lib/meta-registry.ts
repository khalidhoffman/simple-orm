import {
  ClassMetaCollection,
  PropertyMetaCollection
}                    from './meta-collection';
import { SimpleORM } from './core';

export class MetaRegistry {
  classMetaCollection: ClassMetaCollection = SimpleORM.classMetaCollection;
  propertyMetaCollection: PropertyMetaCollection = SimpleORM.propertyMetaCollection;

  getEntityPrimaryColumnMeta<E = any>(Entity: Constructor<E>): IPropertyMeta {
    const entityPropertiesMetadata = SimpleORM.propertyMetaCollection.getPropertyMetasByConstructor(Entity);
    return this.findPrimaryColumn(entityPropertiesMetadata);
  }

  findPrimaryColumn(propertyMetas: IPropertyMeta[]): IPropertyMeta {
    return this.findPrimaryColumnMeta(propertyMetas);
  }

  isPrimaryColumnMeta(propertyMeta: IPropertyMeta): boolean {
    return propertyMeta.options.sql.primaryKey;
  }

  findPrimaryColumnMeta(propertyMetas: IPropertyMeta[]): IPropertyMeta {
    return propertyMetas.find(propertyMeta => this.isPrimaryColumnMeta(propertyMeta));
  }

  getPropertyMeta<T>(constructor: Constructor<T>, propertyName: keyof T): IPropertyMeta {
    return this.propertyMetaCollection.getPropertyMeta(constructor, propertyName);
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
