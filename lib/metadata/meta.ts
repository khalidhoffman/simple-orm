import * as _ from 'lodash';

export class PropertyMeta implements IPropertyMeta {
  className: string;
  fn: Constructor;
  object: any;
  propertyName: string;
  options: any;
  typeOrOptions?: any;
  type: IPropertyMetaType;
  meta: {};

  constructor(params: Partial<IPropertyMeta>) {
    Object.assign(this, { meta: {} }, params);
  }

  getValue<PropertyValue = any>(entity): PropertyValue {
    return _.get(entity, this.propertyName);
  }
}

export class PropertyRelationMeta implements IPropertyMeta {
  className: string;
  fn: Constructor;
  object: any;
  propertyName: string;
  options: any;
  typeOrOptions?: any;
  type: IPropertyMetaType;
  meta: IPropertyMetaExtra;

  constructor(params: Partial<IPropertyMeta>) {
    Object.assign(this, { meta: {} }, params);
  }

  getValue<PropertyValue = any>(entity): PropertyValue {
    return _.get(entity, this.propertyName);
  }
}

export class ClassMeta implements IClassMeta {
  fn: Constructor;
  className: string;
  tableName: string;
  object: any;
  options?: any;
}
