import { GraphNode }          from '../../../graph/graph-node';
import * as utils             from '../../../utils';
import { GlobalMetaRegistry } from '../../../metadata/meta-registry';

export type EntityGraphForEachHandler = (node: EntityInsertGraph) => any;

export class EntityInsertGraph<T extends object = any> extends GraphNode {
  entityConstructor: Constructor<T>;
  entity: T;
  parent: EntityInsertGraph;
  path: Path;
  children: any;

  constructor(entityConstructor: Constructor<T>, entity: T, parent: EntityInsertGraph = null, path = []) {
    super({ key: utils.uuidGen(), graph: parent && parent.graph });
    this.entityConstructor = entityConstructor;
    this.entity = entity;
    this.parent = parent;
    this.path = path;
    this.children = utils.mapObject(entity, (children, value: T[keyof T], key: PropertyKey) => {
      if (Array.isArray(value)) {
        return children.concat(value.map((child, childIndex) => {
          const propertyMeta = GlobalMetaRegistry.getPropertyRelationMeta(entityConstructor, key as keyof T);
          const childConstructor = propertyMeta.meta.relation.related.getFn();
          const childCreationGraph = new EntityInsertGraph(childConstructor, child, this, this.path.concat([key, childIndex]));

          this.graph.setEdge(this.key, childCreationGraph.key);

          return childCreationGraph;
        }))

      } else if (typeof value === 'object') {
        const propertyMeta = GlobalMetaRegistry.getPropertyRelationMeta(entityConstructor, key as keyof T)
        const childConstructor = propertyMeta.meta.relation.related.getFn();
        const childCreationGraph = new EntityInsertGraph(childConstructor, value as any, this, this.path.concat(key))

        this.graph.setEdge(this.key, childCreationGraph.key);

        return children.concat(childCreationGraph);

      } else {
        return children;
      }
    }, [])
  }

  get relationalPath() {
    return this.path.filter(pathPartial => !Number.isFinite(pathPartial as number));
  }

  get parentKey() {
    const relationalPath = this.relationalPath;
    return relationalPath[relationalPath.length - 1];
  }

  get siblingKeys(): string[] {
    return this.graph.neighbors(this.parent.key) || [];
  }

  get hasSiblings() {
    return this.siblingKeys.length > 0;
  }

  get siblings(): EntityInsertGraph[] {
    return this.siblingKeys.map(siblingKey => this.graph.node(siblingKey));
  }

  get sortedNodes() {
    const sortedNodeKeys: string[] = this.graph.successors(this.key) || [];
    const sortedNodes: EntityInsertGraph[] = [
      this,
      ...sortedNodeKeys.map(key => this.graph.node(key))
    ];

    return sortedNodes;
  }

  forEach(fn: EntityGraphForEachHandler, node: EntityInsertGraph = this, path: Path = []) {
    utils.forEach(this.children, function (child) {
      fn(child);
    });

    fn(this);
  }
}