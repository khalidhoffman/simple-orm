import * as _ from 'lodash';

import { GlobalMetaRegistry } from './meta-registry';

export class PropertyMeta implements IPropertyMeta {
  className: string;
  fn: Constructor;
  object: any;
  propertyName: string;
  options: any;
  typeOrOptions?: any;
  type: IPropertyMetaType;
  extra: {};

  constructor(params: Partial<IPropertyMeta>) {
    Object.assign(this, { meta: {} }, params);
  }

  /**
   * @deprecated
   */
  getValue<PropertyValue = any>(entity): PropertyValue {
    return _.get(entity, this.propertyName);
  }
}

export class RelationPropertyMeta implements IRelationPropertyMeta {
  className: string;
  fn: Constructor;
  object: any;
  propertyName: string;
  typeOrOptions?: any;
  type: IPropertyMetaType;
  private _extra: IQueryPropertyRelation;
  private _options: IMetaOptions;

  constructor(params: Partial<RelationPropertyMeta> & { extra: IQueryPropertyRelation }) {
    Object.assign(this, { meta: {} }, params);
  }

  get extra(): IQueryPropertyRelation {
    return {
      ...this._extra,
      refs: {
        ...this._extra.refs,
      }
    }
  }

  set extra(extra: IQueryPropertyRelation) {
    this._extra = extra;
  }

  get options(): IMetaOptions {
    const defaultIdentifier = GlobalMetaRegistry.getIdentifierPropertyMeta(this.fn);
    return {
      ...this._options,
      sql: {
        ...(defaultIdentifier && defaultIdentifier.options && defaultIdentifier.options.sql),
        ...this._options.sql
      }
    };
  }

  set options(options: IMetaOptions) {
    this._options = options;
  }

  get relatedEntityRef(): IRelationPropertyMetaEntityRef {
    switch (this.extra.type) {
      case 'one-to-many': {
        return this.extra.refs.toMany;
      }
      case 'many-to-one': {
        return this.extra.refs.toOne;
      }
      case 'one-to-one': {
        return this.extra.refs.toOne;
      }
      case 'many-to-many': {
        return this.extra.refs.to;
      }
      default: {
        throw new Error(`unrecognized relation type: ${this.extra.type}`)
      }
    }

  }

  get relatedMeta(): IRelationPropertyMeta[] {
    const relatedRef = this.relatedEntityRef;
    const relatedConstructor = relatedRef.constructorFactory();
    const relatedProperty = relatedRef.property;

    return GlobalMetaRegistry.getRelationMetas(relatedConstructor, relatedProperty);
  }

  get classMeta() {
    return GlobalMetaRegistry.getClassMeta(this.fn);
  }

  /**
   * @deprecated
   */
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
