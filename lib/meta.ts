import * as _ from 'lodash';

export class PropertyMeta implements IPropertyMeta {
  className: string;
  fn: Constructor;
  object: any;
  propertyName: string;
  options: any;
  typeOrOptions?: any;
  type: IPropertyMetaType;
  meta: {
    propertyValuePath: string;
  };

  constructor(params: Partial<IPropertyMeta>) {
    Object.assign(this, { meta: {} }, params);

    this.meta.propertyValuePath = this.options.sql.name || this.propertyName;
  }

  getValue<PropertyValue = any>(entity): PropertyValue {
    return _.get(entity, this.meta.propertyValuePath);
  }
}

export class ClassMeta implements IClassMeta {
  fn: Constructor;
  className: string;
  tableName: string;
  object: any;
  options?: any;
}
