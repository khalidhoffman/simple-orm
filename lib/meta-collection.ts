import {
  PropertyMeta,
  PropertyRelationMeta
} from './meta';

export class PropertyMetaCollection extends Array<IPropertyMeta> {

  getDefaultPropertyMeta<T>(constructor: Constructor<T>, propertyName: keyof T): IPropertyMeta {
    return this.getPropertyMetas(constructor, propertyName)[0];
  }

  getDefaultRelationMeta<T>(constructor: Constructor<T>, propertyName: keyof T): IPropertyMeta {
    return this.getRelationMetas(constructor, propertyName)[0];
  }

  getPropertyMetas<T>(constructor: Constructor<T>, propertyName: keyof T): IPropertyMeta[] {
    return this.filter(meta => {
      return (constructor === meta.fn) && (meta.propertyName === propertyName) && meta instanceof PropertyMeta;
    })
  }

  getRelationMetas<T>(constructor: Constructor<T>, propertyName: keyof T): IPropertyMeta[] {
    return this.filter(meta => {
      return (constructor === meta.fn) && (meta.propertyName === propertyName) && meta instanceof PropertyRelationMeta;
    })
  }

  getRelationMetasByConstructor<T>(constructor: Constructor<T>): IPropertyMeta[] {
    return this.filter(meta => {
      return (constructor === meta.fn) && meta instanceof PropertyRelationMeta;
    })
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
