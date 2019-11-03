import Deep = Chai.Deep;

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
  meta?: IPropertyMetaExtra;
}

interface IClassMeta extends IMeta {
  tableName: string;
}

/**
 * @todo create more robust query API {@link https://gitlab.weblee.io/webleedev/simple-orm/issues/1}
 * @see {@link https://gitlab.weblee.io/webleedev/simple-orm/issues/1}
 */
interface IQueryParams<T = any> {
  entity: number | DeepPartial<T>;
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

interface ISaveOptions<T = any> {

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

interface IQueryRelation {
  type: IEntityRelationType;
  base: IQueryRelationProperty;
  related: IQueryRelationProperty;
}

type IQueryValues<T = any> = { [key: string]: T };

type IEntityPropertyConstraint = any;


type IGraph = any;

interface IEntityRelationGraphNode<T = any> {
  graph: IGraph;
  fn: Constructor;
  relationMeta: IPropertyMeta[];
  propertyMeta: IPropertyMeta[];
  constraints: IEntityPropertyConstraint[]
  children?: IEntityRelationGraphNode[] | IEntityRelationGraphNode;
  value: T;
}


/**
 * @deprecated
 */
type TypedDict<T, Result = T> = { [k in keyof T]: Result extends Partial<T> ? Result[k] : Result };

/**
 * @deprecated
 */
type IPropertyMetaDict<T = any> = TypedDict<T, IEntityRelationGraphNode>;
