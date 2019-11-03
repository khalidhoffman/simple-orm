import * as _    from 'lodash';
import { Graph } from 'graphlib';

import {
  AbstractSqlQuery,
  IEntitySqlRef
}                             from './abstract';
import { GlobalMetaRegistry } from '../../meta-registry';
import {
  uuidGen,
  queryValueMerge
} from '../../utils';
import { GraphNode }          from '../../graph/graph-node';

type InsertSqlResult = any & {
  insertId: number,
  fieldCount: number;
  affectedRows: number;
  serverStatus: number;
  warningCount: number;
  message: string;
  changedRows: number;
  protocol41: boolean;
};
type Keys<T> = keyof T;
type Values<T> = T[Keys<T>]; //  "myValue1" | "myValue2"
type Path = PropertyKey[];

interface IInsertOperation {
  propertyMetas: IPropertyMeta[];
  classMeta: IClassMeta;
  relationMetas: IPropertyMeta[];
  classSqlRef: IEntitySqlRef;
  value: any;
}

type EntityGraphForEachHandler = (node: EntityCreationGraph) => any;

const GLOBAL_CREATION_GRAPH = new Graph();

const map = _.map;
const reduce = _.reduce;
const forEach = _.forEach;
const get = _.get;
const last = _.last;
const reduceObject = _.reduce;

export class EntityCreationGraph<T extends object = any> extends GraphNode {
  entityConstructor: Constructor<T>;
  entity: T;
  parent: EntityCreationGraph;
  path: Path;
  children: any;

  constructor(entityConstructor: Constructor<T>, entity: T, parent: EntityCreationGraph = null, path = []) {
    super({ key: uuidGen(), graph: parent && parent.graph });
    this.entityConstructor = entityConstructor;
    this.entity = entity;
    this.parent = parent;
    this.path = path;
    this.children = reduce(entity, (children, value: T[keyof T], key: PropertyKey) => {
      if (Array.isArray(value)) {
        return children.concat(value.map((child, childIndex) => {
          const propertyMeta = GlobalMetaRegistry.getPropertyRelationMeta(entityConstructor, key as keyof T);
          const childConstructor = propertyMeta.meta.relation.related.getFn();
          const childCreationGraph = new EntityCreationGraph(childConstructor, child, this, this.path.concat([key, childIndex]));

          this.graph.setEdge(this.key, childCreationGraph.key);

          return childCreationGraph;
        }))
      }
      else if (typeof value === 'object') {
        const propertyMeta = GlobalMetaRegistry.getPropertyRelationMeta(entityConstructor, key as keyof T)
        const childConstructor = propertyMeta.meta.relation.related.getFn();
        const childCreationGraph = new EntityCreationGraph(childConstructor, value as any, this, this.path.concat(key))

        this.graph.setEdge(this.key, childCreationGraph.key);

        return children.concat(childCreationGraph);
      }
      else {
        return children;
      }
    }, [])
  }

  get relationalPath() {
    return this.path.filter(pathPartial => !Number.isFinite(pathPartial as number));
  }

  get parentKey() {
    return this.relationalPath[0];
  }

  get siblingKeys(): string[] {
    return this.graph.neighbors(this.parent.key) || [];
  }

  get hasSiblings() {
    return this.siblingKeys.length > 0;
  }

  get siblings(): EntityCreationGraph[] {
    return this.siblingKeys.map(siblingKey => this.graph.node(siblingKey));
  }

  forEach(fn: EntityGraphForEachHandler, node: EntityCreationGraph = this, path: Path = []) {
    forEach(this.children, function (child) {
      fn(child);
    });

    fn(this);
  }
}

export class SqlCreateQuery<T extends object = any> extends AbstractSqlQuery<T> {
  entity: T;
  entityCreationGraph: EntityCreationGraph;

  constructor(Entity: Constructor<T>, queryParams: IQueryParams<T>) {
    super(Entity, queryParams);
    this.entity = queryValueMerge(Entity, [], this.relations, this.queryParams.entity);
    this.entityCreationGraph = new EntityCreationGraph(this.Entity, this.entity, { graph: GLOBAL_CREATION_GRAPH } as EntityCreationGraph);
  }

  async execute(): Promise<T> {
    const insertOperations: IInsertOperation[] = [];

    const creationEdges = this.entityCreationGraph.graph.edges();
    const creationNodeKeys = this.entityCreationGraph.graph.nodes();
    const sortedNodeKeys: string[] = this.entityCreationGraph.graph.successors(this.entityCreationGraph.key) || [];
    const sortedNodes: EntityCreationGraph[] = [
      this.entityCreationGraph,
      ...sortedNodeKeys.map(key => this.entityCreationGraph.graph.node(key))
    ];

    sortedNodes.forEach((createGraphNode: EntityCreationGraph) => {
      const value = get(this.queryParams.entity, createGraphNode.path);
      const classMeta = GlobalMetaRegistry.getClassMeta(createGraphNode.entityConstructor);
      const classSqlRef = this.getEntitySqlRef(classMeta);
      const propertyMetas = GlobalMetaRegistry.getPropertyMetasByConstructor(classMeta.fn);
      const relationMetas = GlobalMetaRegistry.getRelationMetasByConstructor(classMeta.fn);

      insertOperations.push({
        relationMetas,
        value,
        classSqlRef,
        propertyMetas,
        classMeta
      })
    });

    const insertsByTableName: { [key: string]: IInsertOperation[] } = insertOperations.reduce((acc, insertOp) => {
      if (acc[insertOp.classMeta.tableName]) {
        acc[insertOp.classMeta.tableName].push(insertOp);
      } else {
        acc[insertOp.classMeta.tableName] = [insertOp];
      }
      return acc;
    }, {});

    const sqlStatements = await Promise.all(Object.keys(insertsByTableName).map(async tableName => {
      let entitySqlRef: IEntitySqlRef;
      const insertOperations = insertsByTableName[tableName];
      const insertValues = insertOperations.map(insertOperation => {
        const primaryKeyMeta = GlobalMetaRegistry.getIdentifierPropertyMeta(insertOperation.classMeta.fn);
        const insertValue = reduceObject(insertOperation.value, (result, value, key) => {
          const propertyMeta = insertOperation.propertyMetas.find(propertyMeta => propertyMeta.propertyName === key);

          if (!propertyMeta) {
            // unknown property defined in object
            return result;
          }

          return Object.assign(result, {
            [propertyMeta.options.sql.name]: value
          });
        }, { [primaryKeyMeta.options.sql.name]: undefined });

        entitySqlRef = entitySqlRef || this.getEntitySqlRef(insertOperation.classMeta);

        return insertValue
      });

      return entitySqlRef.insert(insertValues).toQuery();
    }));

    const results = await Promise.all(sqlStatements.map(sqlStatement => {
      return this.executeSqlQuery(sqlStatement) as InsertSqlResult;
    }));

    results.forEach((result, index) => {
      const node = sortedNodes[index];
      const primaryKeyMeta = GlobalMetaRegistry.getIdentifierPropertyMeta(node.entityConstructor);

      if (node.hasSiblings) {
        const nodeSiblings = node.siblings;
        for (let i = 0; i < result.affectedRows; i++) {
          nodeSiblings[i].entity[primaryKeyMeta.propertyName] = result.insertId + i;
        }
      } else {
        node.entity[primaryKeyMeta.propertyName] = result.insertId;
      }

    });

    return this.entityCreationGraph.entity;
  }
}
