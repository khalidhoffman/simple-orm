import * as _ from 'lodash';

import { GlobalMetaRegistry }      from '../metadata/meta-registry';
import { EntityRelationGraphNode } from './entity-relation-graph-node';

export class EntityRelationGraph<T = any> {
  entityConstructor: Constructor<T>;
  entity: IRelationalQueryPartial<T>;
  classMeta: IClassMeta;
  relationGraph: EntityRelationGraphNode;

  constructor(entityConstructor: Constructor<T>, entityRelations: IRelationalQueryPartial<T>) {
    this.entityConstructor = entityConstructor;
    this.entity = entityRelations;
    this.classMeta = GlobalMetaRegistry.getClassMeta(entityConstructor);
    this.relationGraph = new EntityRelationGraphNode({
      fn: entityConstructor,
      relationMeta: GlobalMetaRegistry.getRelationMetasByConstructor(entityConstructor),
      propertyMeta: GlobalMetaRegistry.getPropertyMetasByConstructor(entityConstructor),
      constraints: [],
      value: entityRelations
    });
  }


  hasPath(path: string[] | string): boolean {
    return !!this.get(path);
  };

  get(path: PropertyKey[] | PropertyKey): any {
    const valPath = Array.isArray(path) ? path.join('.') : path;
    return _.get(this.entity, valPath);
  };

  getNode(path: PropertyKey[] | PropertyKey): EntityRelationGraphNode {
    const pathPartials = Array.isArray(path) ? path : path.toString().split('.');

    const node = pathPartials.reduce((result: EntityRelationGraphNode, pathPartial) => {
      return result.children.find(childNode => {
        const childMetas = childNode.getAllMeta();
        return childMetas.map(meta => meta.propertyName).includes(pathPartial);
      })
    }, this.relationGraph) as EntityRelationGraphNode;

    return node;
  };

  getPrimaryKeyMeta(): IPropertyMeta[] {
    const primaryKeyMetas: IPropertyMeta[] = [];

    this.relationGraph.forEachMeta('property', function (node: EntityRelationGraphNode, propertyMeta, path) {
      if (propertyMeta.options.sql.primaryKey === true) {
        primaryKeyMetas.push(propertyMeta);
      }
    });

    return primaryKeyMetas;
  }

  getScopeKeyMeta(): IPropertyMeta[] {
    const scopedKeyMetas: IPropertyMeta[] = [];

    this.relationGraph.forEachMeta('property', function (node: EntityRelationGraphNode, propertyMeta, path) {
      if (propertyMeta.options.sql.scope) {
        scopedKeyMetas.push(propertyMeta);
      }
    });

    return scopedKeyMetas;
  }

  getRelations(): IQueryRelation[] {
    return GlobalMetaRegistry.getQueryRelations(this.constructor as Constructor, this.entity);
  }
}