export class PropertyMetaCollection extends Array<IPropertyMeta> {

  getPropertyMeta<T>(constructor: Constructor<T>, propertyName: keyof T): IPropertyMeta {
    return this.find(meta => {
      return (constructor === meta.fn) && (meta.propertyName === propertyName);
    })
  }

  getPropertyMetasByClass<T>(constructor: Constructor<T>): IPropertyMeta[] {
    return this.filter(meta => {
      return (constructor === meta.fn)
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
