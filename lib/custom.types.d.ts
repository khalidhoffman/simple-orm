type Keys<T> = keyof T;
type Values<T> = T[Keys<T>];
type ValuesOf<T> = Values<T>;

type PropertyPath = PropertyKey[];

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

type EntityValueDict<T> = DeepPartial<T>;
type EntityIdentifier<T> = EntityValueDict<T>;

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
  scope?: Type;
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

interface IPropertyMetaExtra {
  relation?: IEntityRelation;
}

interface IPropertyMeta extends IMeta {
  propertyName: PropertyKey;
  options: IPropertyMetaOptions;
  type?: IPropertyMetaType;
  // TODO refactor {@link IPropertyMeta#meta} to better name ie `IPropertyMeta#extra`
  meta?: IPropertyMetaExtra;
}

interface IClassMeta extends IMeta {
  tableName: string;
}

// TODO createFromValueSets more robust query API {@link https://gitlab.weblee.io/webleedev/simple-orm/issues/1}
/**
 *
 * @see {@link https://gitlab.weblee.io/webleedev/simple-orm/issues/1}
 */
interface IQueryParams<T = any> {
  entity: EntityIdentifier<T>;
  options?: Partial<IRetrieveOptions<T> & ISaveOptions<T>>;
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

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> }
type IRelationalQueryPartial<T> = { [K in keyof T]?: IRelationalQueryPartial<T[K]> | true }

interface IRetrieveOptions<T = any> {
  relations: IRelationalQueryPartial<T>;
}

interface ISaveOptions<T = any> {

}

interface IQueryProperty {
  entity: IClassMeta;
  meta: IPropertyMeta;
  relationMeta: IPropertyMeta;
  alias: string;
}

interface IQueryRelationProperty {
  alias: string;
  entity: IClassMeta;
  property: IQueryProperty;
}

interface IQueryPropertyRelation {
  type: IEntityRelationType;
  base: IQueryRelationProperty;
  related: IQueryRelationProperty;
}

/**
 * keys should be as defined in database
 */
type IQueryValueSet<T = any> = { [key: string]: ValuesOf<T> };

type IEntityPropertyConstraint = any;

interface IEntityRelationGraphNode<T = any> {
  graph: IGraph;
  fn: Constructor;
  relationMeta: IPropertyMeta[];
  propertyMeta: IPropertyMeta[];
  /**
   * @experimental
   * @deprecated
   */
  constraints: IEntityPropertyConstraint[]
  children?: IEntityRelationGraphNode[] | IEntityRelationGraphNode;
  value: T;
}
