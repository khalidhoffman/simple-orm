import {
  PropertyMeta,
  PropertyRelationMeta
} from './meta';

export class PropertyMetaCollection extends Array<IPropertyMeta> {

  getPropertyMeta<T>(constructor: Constructor<T>, propertyName: keyof T): IPropertyMeta {
    return this.find(meta => {
      return (constructor === meta.fn) && (meta.propertyName === propertyName) && meta instanceof PropertyMeta;
    })
  }

  getRelationMeta<T>(constructor: Constructor<T>, propertyName: keyof T): IPropertyMeta {
    return this.find(meta => {
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
