interface Constructor<ReturnType = any, Arguments extends Array<any> = any[]> extends Function {
  new(...args: Arguments): ReturnType

  prototype: ReturnType;
}

type PrimitiveKeys<T> = {
  [P in keyof T]: Exclude<T[P], undefined> extends object ? never : P
}[keyof T];

type DTO<T> = Pick<T, PrimitiveKeys<T>>

interface IMetaParams {
  className: string;
  fn: Constructor;
  object: any;
  options?: any;
}

type IMeta = { [key: string]: any; } & IMetaParams;

type IPropertyMetaType = 'string' | string | Constructor;

interface Named<Name extends string> {
  name?: Name;
}

interface Aliased<Name extends string> extends Named<Name> {
  name: Name;
  alias: Name;
}

interface ColumnDefinition<Name extends string, Type> extends Aliased<Name> {
  jsType?: Type;
  dataType: string;
  primaryKey?: boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: 'restrict' | 'cascade' | 'no action' | 'set null' | 'set default';
    onUpdate?: 'restrict' | 'cascade' | 'no action' | 'set null' | 'set default';
  };
  notNull?: boolean;
  unique?: boolean;
  defaultValue?: Type;
}

interface IPropertyMetaOptions {
  type: IPropertyMetaType;
  /**
   * possible options for {@link https://www.npmjs.com/package/sql}
   */
  sql?: ColumnDefinition<any, any>
  typeFunction?: Function;
  inverseSide?: Function;
}

interface IPropertyMeta extends IMeta {
  propertyName: PropertyKey;
  options: IPropertyMetaOptions;
  type?: IPropertyMetaType;
  meta?: {
    relation?: IEntityRelation;
  }
}

interface IClassMeta extends IMeta {
  tableName: string;
}

interface IQueryParams {
  identifier: number
  options?: IRetrieveOptions;
}

type IEntityRelationType = 'many-to-one' | 'many-to-many' | 'one-to-many' | 'one-to-one';
type IEntityRelationOperator = '=' | '>' | '<' | '>=' | '<=' | 'REGEXP' | 'IS' | 'IS NOT';

interface IEntityRelation {
  base: {
    property: PropertyKey;
    getFn: (object?: any) => Constructor;
  };
  related: {
    property: PropertyKey;
    getFn: (object?: any) => Constructor;
  };
  type: IEntityRelationType;
}

// type ObjectType<T> = { new (): T }|Function;

interface Dict<T> {
  [key: string]: T;
}

type ChildOf<T> = any;

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> }
type IRelationalQueryPartial<T> = { [K in keyof T]?: IRelationalQueryPartial<T[K]> | true }

interface IRetrieveOptions<T = any> {
  relations: IRelationalQueryPartial<T>;
}

type IQueryRelationsParams<T> = IRelationalQueryPartial<T>;

interface IQueryEntity {
  fn: Constructor;
  sqlRef: any;
  meta: IClassMeta;
  primaryKey: PropertyKey;
  primaryMeta: IPropertyMeta;
  propertyMeta: IPropertyMeta;
  propertyKey: PropertyKey;
}

interface IQueryProperty {
  entity: IQueryEntity;
  meta: IPropertyMeta;
  relationMeta: IPropertyMeta;
  alias: string;
}

interface IQueryRelationProperty {
  alias: string;
  entity: IClassMeta;
  property: IQueryProperty;
}

interface IQueryRelation {
  type: IEntityRelationType;
  base: IQueryRelationProperty;
  related: IQueryRelationProperty;
}
