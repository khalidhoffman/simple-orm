interface IMetaRegistry {
  [key: string]: any;
}

interface Constructor<T = any> extends Function {
  new(...args: any[]): T
  prototype: T;
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

type IPropertyMetaType = 'string' | string;

interface Named<Name extends string> {
  name?: Name;
}
interface ColumnDefinition<Name extends string, Type> extends Named<Name> {
  jsType?: Type;
  dataType: string;
  primaryKey?: boolean;
  references?: {
    table:string;
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
}

type IPropertyMetaValuePath = string;

interface IPropertyMeta extends IMeta {
  propertyName: string;
  options: IPropertyMetaOptions;
  type?: IPropertyMetaType;
  meta?: {
    propertyValuePath: IPropertyMetaValuePath;
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

type IEntityRelationType = string

interface IEntityRelation {
  left: {
    fn: Constructor,
    property: PropertyKey;
    getFn?: (object?: any) => Constructor;
  };
  right: {
    fn: Constructor,
    property: PropertyKey;
    getFn?: (object?: any) => Constructor;
  };
  type: IEntityRelationType;
}

// type ObjectType<T> = { new (): T }|Function;
type ObjectType<T> = Constructor<T>;

interface Dict<T> {
  [key: string]: T;
}

type ChildOf<T> = any;

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> }
type IRelationalQueryPartial<T> = { [K in keyof T]?: IRelationalQueryPartial<T[K]> | true }

interface IRetrieveOptions<T = any> {
  relations: IRelationalQueryPartial<T>;
}
