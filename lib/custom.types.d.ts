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

type IEntityRelationType = 'many-to-one' | 'many-to-many' | 'one-to-many' | 'one-to-one';
type IEntityRelationOperator = '=' | '>' | '<' | '>=' | '<=' | 'REGEXP' | 'IS' | 'IS NOT';

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

interface ColumnDefinition<Name extends string, Type> extends Partial<Aliased<Name>> {
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

interface IMetaSqlOptions extends ColumnDefinition<any , any> {
  alias: string;
  name?: string;
}

interface IMetaOptions {
  type: IPropertyMetaType;
  sql: IMetaSqlOptions;
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


interface IQueryPropertyRelation {
  type: IEntityRelationType;
  refs: IRelationPropertyMetaEntityRefs
}

type IPropertyMetaExtra = IQueryPropertyRelation;

interface IRelationPropertyMetaEntityRef {
  property: PropertyKey;
  constructorFactory: (object?: any) => Constructor;
}

interface IRelationPropertyMetaExtraEntity {
  property: PropertyKey;
  fn: Constructor;
}

interface IRelationPropertyMetaEntityRefs {
  oneTo?: IRelationPropertyMetaEntityRef;
  manyTo?: IRelationPropertyMetaEntityRef;
  to?: IRelationPropertyMetaEntityRef;
  toMany?: IRelationPropertyMetaEntityRef;
  toOne?: IRelationPropertyMetaEntityRef;
}

interface IPropertyMeta extends IMeta {
  propertyName: PropertyKey;
  options: IPropertyMetaOptions;
  type?: IPropertyMetaType;
}

interface IRelationPropertyMeta extends IPropertyMeta {
  extra: IPropertyMetaExtra;
  classMeta?: IClassMeta;
  relatedMeta?: IRelationPropertyMeta[];
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

type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> }
type IRelationalQueryPartial<T> = { [K in keyof T]?: IRelationalQueryPartial<T[K]> | true }

interface IRetrieveOptions<T = any> {
  relations: IRelationalQueryPartial<T>;
}

interface ISaveOptions<T = any> {

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
