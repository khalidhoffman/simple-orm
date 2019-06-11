import * as _ from 'lodash';

import {
  PropertyMeta,
  RelationPropertyMeta
}            from './meta';
import Store from 'simple-store';

type IEntityRelationPropertyMetaEntityRefsKey = keyof IRelationPropertyMetaEntityRefs;
const RELATION_REF_KEYS: Array<IEntityRelationPropertyMetaEntityRefsKey> = ['oneTo', 'manyTo', 'to', 'toMany', 'toOne'];

export class PropertyMetaCollection extends Array<IPropertyMeta> {
  store: Store = new Store();

  getDefaultPropertyMeta<T>(constructor: Constructor<T>, propertyName: keyof T): IPropertyMeta {
    return this.getPropertyMetas(constructor, propertyName)[0];
  }

  getDefaultRelationMeta<T>(constructor: Constructor<T>, propertyName: keyof T): IRelationPropertyMeta {
    return this.getRelationMetas(constructor, propertyName)[0];
  }

  getPropertyMetas<T>(constructor: Constructor<T>, propertyName: keyof T): IPropertyMeta[] {
    return this.filter(meta => {
      return (constructor === meta.fn) && (meta.propertyName === propertyName) && meta instanceof PropertyMeta;
    })
  }

  getRelationMetas<T>(constructor: Constructor<T>, propertyName: keyof T): IRelationPropertyMeta[] {
    return this.getRelationMetasByConstructor(constructor)
      .filter(meta => meta.propertyName === propertyName);
  }

  getRelationMetasByConstructor<T>(constructor: Constructor<T>): IRelationPropertyMeta[] {
    return this.filter(meta => {
      return (constructor === meta.fn) && meta instanceof RelationPropertyMeta;
    }) as IRelationPropertyMeta[]
  }

  getPropertyMetasByConstructor<T>(constructor: Constructor<T>): IPropertyMeta[] {
    return this.filter(meta => {
      return (constructor === meta.fn) && meta instanceof PropertyMeta;
    })
  }
}

export class ClassMetaCollection extends Array<IClassMeta> {

  getClassMeta<T>(constructor: Constructor<T>): IClassMeta {
    return this.find(meta => {
      return (constructor === meta.fn)
    })
  }
}

export const GlobalClassMetaCollection = new ClassMetaCollection();
export const GlobalPropertyMetaCollection = new PropertyMetaCollection();
