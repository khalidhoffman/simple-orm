import * as _ from 'lodash';

import { GlobalPropertyMetaCollection } from '../metadata/meta-collection';
import {
  GLOBAL_GRAPH,
  GraphNode
}                                       from './graph-node';
import { uuidGen }                      from '../utils';

const get = _.get;

export class EntityRelationGraphNode<T = any> extends GraphNode implements IEntityRelationGraphNode {
  fn: Constructor;
  relationMeta: IPropertyMeta[] = [];
  propertyMeta: IPropertyMeta[] = [];
  constraints: IEntityPropertyConstraint[] = [];
  value: any;
  children?: EntityRelationGraphNode<ValuesOf<T>>[];

  constructor(props: Partial<IEntityRelationGraphNode>) {
    super({ key: uuidGen(), graph: GLOBAL_GRAPH });
    Object.assign(this, props);
    this.build();
  }

  build(node: EntityRelationGraphNode<T> = this) {
    node.children = node.relationMeta.reduce((children, relationMeta) => {
      const childNodeValue = node.value[relationMeta.propertyName];

      if (Array.isArray(childNodeValue)) {
        const childNodes = childNodeValue.map(childNodeValueItem => {
          const childNodeConstructor: Constructor = relationMeta.meta.relation.related.getFn();
          const childNode = new EntityRelationGraphNode({
            fn: childNodeConstructor,
            relationMeta: GlobalPropertyMetaCollection.getRelationMetasByConstructor(childNodeConstructor),
            propertyMeta: GlobalPropertyMetaCollection.getPropertyMetasByConstructor(childNodeConstructor),
            constraints: [],
            value: childNodeValueItem
          });

          this.graph.setEdge(this.key, childNode.key);

          return childNode;
        });

        return children.concat(childNodes);

      } else if (typeof childNodeValue === 'object') {
        const childNode = new EntityRelationGraphNode({
          fn: relationMeta.fn,
          relationMeta: GlobalPropertyMetaCollection.getRelationMetas(relationMeta.fn, relationMeta.propertyName),
          propertyMeta: GlobalPropertyMetaCollection.getPropertyMetas(relationMeta.fn, relationMeta.propertyName),
          constraints: [],
          value: childNodeValue
        });

        node.graph.setEdge(node.key, childNode.key);

        return children.concat(childNode);

      } else {
        return children
      }

    }, []);

    return node;
  }

  getValue(path: PropertyKey[] | string) {
    return get(this.value, Array.isArray(path) ? path.join('.') : path)
  }

  getAllMeta(): IPropertyMeta[] {
    return this.propertyMeta.concat(this.relationMeta);
  }

  forEachMeta(type: 'relation' | 'property', fn: ForEachRelationNodeHandler, node: EntityRelationGraphNode<any> = this, paths: PropertyKey[] = []) {
    let metaKey: keyof EntityRelationGraphNode<T>;
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

    this.forEachMeta('property', function (node: EntityRelationGraphNode, propertyMeta: IPropertyMeta, path: string[]) {
      if (propertyMeta.options.sql.primaryKey === true) {
        primaryKeyMetas.push(propertyMeta);
      }
    });

    return primaryKeyMetas;
  }

  /**
   * @deprecated
   * @todo refactor getDefaultPrimaryKeyMeta() to `getRootPrimaryKeyMeta()`
   * @returns {IPropertyMeta}
   */
  getDefaultPrimaryKeyMeta(): IPropertyMeta {
    const primaryKeyMetas: IPropertyMeta[] = this.getPrimaryKeyMeta();

    return primaryKeyMetas[0];
  }
}


type ForEachRelationNodeHandler = (node: IEntityRelationGraphNode, propertyMeta: IPropertyMeta, path: PropertyKey[]) => any;

interface IEntityQueryTree {

}

export class EntityPersistenceOperationsGraphNode<T> extends EntityRelationGraphNode<T> {

  /**
   * @deprecated
   * @returns {IEntityQueryTree}
   */
  getQueryTree(): IEntityQueryTree {
    throw new Error('not implemented');
  }
}

export class EntityReadGraphNode<T> extends EntityPersistenceOperationsGraphNode<T> {

  getWhereProperties(): IPropertyMeta[] {
    return this.getPrimaryKeyMeta();
  }
}

export class EntityUpdateGraphNode<T> extends EntityPersistenceOperationsGraphNode<T> {

}
