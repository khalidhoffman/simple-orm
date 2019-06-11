import { Graph } from 'graphlib';

import * as utils                       from '../utils';
import { GraphNode }                    from '../graph/graph-node';
import { GlobalMetaRegistry }           from '../metadata/meta-registry';
import { GlobalPropertyMetaCollection } from '../metadata/meta-collection';

export type EntityGraphForEachHandler = (node: EntityQueryGraphNode) => any;

type ForEachRelationNodeHandler = (node: EntityQueryGraphNode, propertyMeta: IPropertyMeta, path: PropertyKey[]) => any;


interface IEntityQueryGraphParams<T extends object> {
  entityConstructor: Constructor<T>;
  entity: T;
  parent: EntityQueryGraphNode;
  path?: PropertyPath;
  constraints?: IEntityPropertyConstraint[];
  children?: EntityQueryGraphNode<T>[];
}

export class EntityQueryGraphNode<T extends object = any> extends GraphNode {
  entityConstructor: Constructor<T>;
  entity: T;
  parent: EntityQueryGraphNode;
  path: PropertyPath;
  value: any;

  children: EntityQueryGraphNode[];
  constraints: IEntityPropertyConstraint[];
  relationMeta: IPropertyMeta[];
  propertyMeta: IPropertyMeta[];

  constructor(params: IEntityQueryGraphParams<T>) {

    const defaults = {
      relationMeta: GlobalPropertyMetaCollection.getRelationMetasByConstructor(params.entityConstructor),
      propertyMeta: GlobalPropertyMetaCollection.getPropertyMetasByConstructor(params.entityConstructor),
      path: [],
      constraints: [],
      children: []
    };
    const {
      entityConstructor,
      entity,
      parent
    } = params;

    super({ key: utils.uuidGen(), graph: parent ? parent.graph : new Graph() });

    Object.assign(this, defaults, params);

    if (this.parent) {
      this.graph.setEdge(this.parent.key, this.key);
    }
    this.children = utils.mapObject(entity, (children, value: T[keyof T], propertyKey: PropertyKey) => {
      if (Array.isArray(value)) {
        const childrenGraphNodes = value.map((child, childIndex) => {
          const [propertyMeta] = GlobalMetaRegistry.getPropertyRelationMeta(entityConstructor, propertyKey as keyof T);
          const childConstructor = propertyMeta.extra.refs.toMany.constructorFactory();

          return new EntityQueryGraphNode({
            entityConstructor: childConstructor,
            entity: child,
            parent: this,
            path: this.path.concat([propertyKey, childIndex])
          });
        });

        return children.concat(childrenGraphNodes)

      } else if (typeof value === 'object') {
        const [propertyMeta] = GlobalMetaRegistry.getPropertyRelationMeta(entityConstructor, propertyKey as keyof T)
        const childConstructor = propertyMeta.extra.refs.toOne.constructorFactory();
        const childGraphNode = new EntityQueryGraphNode({
          entityConstructor: childConstructor,
          entity: value,
          parent: this,
          path: this.path.concat(propertyKey)
        });

        return children.concat(childGraphNode);

      } else {
        return children;
      }
    }, [])
  }

  get parentKey(): PropertyKey {
    const relationalPath = this.relationalPath;
    return relationalPath[relationalPath.length - 1] as string;
  }

  get relationalPath(): PropertyKey[] {
    return this.path.filter(pathPartial => !Number.isFinite(pathPartial as number));
  }

  get parentId(): string {
    return this.parent && this.parent.key;
  }

  get siblingIds(): string[] {
    return this.graph.neighbors(this.parentId) || [];
  }

  get hasSiblings(): boolean {
    return this.siblingIds.length > 0;
  }

  get siblings(): EntityQueryGraphNode[] {
    return this.siblingIds.map(siblingKey => this.graph.node(siblingKey));
  }

  get sortedNodes(): EntityQueryGraphNode[] {
    const sortedNodeKeys: string[] = this.graph.successors(this.key) || [];
    return [
      this,
      ...sortedNodeKeys.map(key => this.graph.node(key))
    ];
  }

  forEach(fn: EntityGraphForEachHandler, node: EntityQueryGraphNode = this, path: PropertyPath = []) {
    utils.forEach(this.children, function (child) {
      fn(child);
    });

    fn(this);
  }

  forEachMeta(type: 'relation' | 'property', fn: ForEachRelationNodeHandler, node: EntityQueryGraphNode<any> = this, paths: PropertyKey[] = []) {
    let metaKey: keyof EntityQueryGraphNode<T>;
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

    propertyMetaCol.forEach(propertyMeta => {
      const propertyMetaPath: PropertyKey[] = paths.concat(propertyMeta.propertyName);

      node.children.forEach((childNode, index) => {
        return node.forEachMeta(type, fn, childNode, propertyMetaPath)
      });

      fn(node, propertyMeta, propertyMetaPath);
    })
  }


  getPrimaryKeyMeta(): IPropertyMeta[] {
    const primaryKeyMetas: IPropertyMeta[] = [];

    this.forEachMeta('property', function (node: EntityQueryGraphNode, propertyMeta, path) {
      if (propertyMeta.options.sql.primaryKey === true) {
        primaryKeyMetas.push(propertyMeta);
      }
    });

    return primaryKeyMetas;
  }

  getScopeKeyMeta(): IPropertyMeta[] {
    const scopedKeyMetas: IPropertyMeta[] = [];

    this.forEachMeta('property', function (node: EntityQueryGraphNode, propertyMeta, path) {
      if (propertyMeta.options.sql.scope) {
        scopedKeyMetas.push(propertyMeta);
      }
    });

    return scopedKeyMetas;
  }
}

