import {
  get,
  isPlainObject
}                            from 'lodash';
import {
  GlobalClassMetaCollection,
  GlobalPropertyMetaCollection
}                            from './meta-collection';
import { getQueryRelations } from './utils';

type TypedDict<T, Result = T> = { [k in keyof T]: Result extends Partial<T> ? Result[k] : Result };

type IEntityPropertyConstraint = any;

interface IEntityRelationGraphNode<T = any> {
  relationMeta: IPropertyMeta[];
  propertyMeta: IPropertyMeta[];
  constraints: IEntityPropertyConstraint[]
  children: IEntityRelationGraphNode[] | IEntityRelationGraphNode;
  value: T;
}

type IPropertyMetaDict<T = any> = TypedDict<T, IEntityRelationGraphNode>;

export class EntityRelationGraphNode implements IEntityRelationGraphNode {
  relationMeta: IPropertyMeta[];
  propertyMeta: IPropertyMeta[];
  constraints: IEntityPropertyConstraint[];
  value: any;
  children: EntityRelationGraphNode[];

  constructor(props: Partial<IEntityRelationGraphNode>) {
    Object.assign(this, props);
    this.build();
  }

  build(node: EntityRelationGraphNode = this) {
    node.children = node.relationMeta.map(relationMeta => {
      return this.build(new EntityRelationGraphNode({
        relationMeta: GlobalPropertyMetaCollection.getRelationMetas(relationMeta.fn, relationMeta.propertyName),
        propertyMeta: GlobalPropertyMetaCollection.getPropertyMetas(relationMeta.fn, relationMeta.propertyName),
        constraints: [],
        children: undefined,
        value: node.value[relationMeta.propertyName],
      }))
    });

    return node;
  }

  getValue(path: PropertyKey[]|string) {
    return get(this.value, Array.isArray(path) ? path.join('.') : path)
  }

  forEachMeta(type: 'relation'| 'property', fn: ForEachHandler, node: EntityRelationGraphNode = this, paths: PropertyKey[] = []) {
    let metaKey: keyof EntityRelationGraphNode;
    let propertyMetaCol: IPropertyMeta[];

    switch (type) {
      case 'relation':
        metaKey = 'relationMeta';
        break;
      case 'property':
      default:
        metaKey = 'propertyMeta';
        break;
    }

    propertyMetaCol = node[metaKey];

    if (!propertyMetaCol) {
      debugger
    }

    propertyMetaCol.forEach(propertyMeta => {
      const propertyMetaPath: PropertyKey[] = paths.concat(propertyMeta.propertyName);

      node.children.forEach((childNode, index) => {
        return node.forEachMeta(type, fn, childNode, propertyMetaPath)
      });

      fn(node, propertyMeta, propertyMetaPath);
    })
  }
}


type ForEachHandler = (node: IEntityRelationGraphNode, propertyMeta: IPropertyMeta, path: PropertyKey[]) => any;

export class BaseEntityRelationGraph<T = any> {
  classMeta: IClassMeta;
  relationGraph: EntityRelationGraphNode;

  constructor(protected constructor: Constructor<T>, protected entity: IRelationalQueryPartial<T>) {
    this.classMeta = GlobalClassMetaCollection.getClassMeta(constructor);
    this.relationGraph = new EntityRelationGraphNode({
      relationMeta: [],
      propertyMeta: [],
      constraints: [],
      children: [],
      value: entity
    });
  }


  hasPath(path: string[] | string): boolean {
    return !!this.get(path);
  };

  get(path: string[] | string): any {
    const valPath = Array.isArray(path) ? path.join('.') : path;
    return get(this.entity, valPath);
  };

  getPrimaryKeyMeta(): IPropertyMeta[] {
    const primaryKeyMetas: IPropertyMeta[] = [];

    this.relationGraph.forEachMeta('property', function(node: EntityRelationGraphNode, propertyMeta, path) {
      if (propertyMeta.options.sql.primaryKey === true) {
        primaryKeyMetas.push(propertyMeta);
      }
    });

    return primaryKeyMetas;
  }

  getScopedKeyMeta(): IPropertyMeta[] {
    const scopedKeyMetas: IPropertyMeta[] = [];

    this.relationGraph.forEachMeta('property', function(node: EntityRelationGraphNode, propertyMeta, path) {
      if (propertyMeta.options.sql.scope) {
        scopedKeyMetas.push(propertyMeta);
      }
    });

    return scopedKeyMetas;
  }

  getRelations(): IQueryRelation[] {
    return getQueryRelations(this.constructor as Constructor, this.entity);
  }
}

interface IEntityQueryTree {

}

export class EntityPersistenceOperationsGraph<T> extends BaseEntityRelationGraph<T> {

  getQueryTree(): IEntityQueryTree {
    throw new Error('not implemented');
  }
}

export class EntityReadGraph<T> extends EntityPersistenceOperationsGraph<T> {

  getWhereProperties(): IPropertyMeta[] {
    return this.getPrimaryKeyMeta();
  }
}

export class EntityUpdateGraph<T> extends EntityPersistenceOperationsGraph<T> {

}
