import { Graph } from 'graphlib';

import * as utils             from '../../../utils';
import { GlobalMetaRegistry } from '../../../metadata/meta-registry';

import { AbstractSqlQuery }           from '../abstract';
import { QueryEntityInstanceFactory } from '../common/query-entity-instance-factory';
import { SqlInsertOperation }         from '../common/query-insert-operation';

import { EntityQueryGraphNode } from '../../entity-query-graph-node';


// TODO refactor GLOBAL_CREATION_GRAPH out of codebase
const GLOBAL_CREATION_GRAPH = new Graph();

export class SqlCreateQuery<T extends object = any> extends AbstractSqlQuery<T> {
  entity: T;

  constructor(Entity: Constructor<T>, queryParams: IQueryParams<T>) {
    super(Entity, queryParams);
    const entityInstanceFactory = new QueryEntityInstanceFactory(Entity);

    this.entity = entityInstanceFactory.createFromValueSets([this.queryParams.entity]);
  }

  async execute(): Promise<T> {
    const entityInsertGraphSortedNodes = this.entityQueryGraph.sortedNodes;

    entityInsertGraphSortedNodes.forEach((createGraphNode: EntityQueryGraphNode) => {
      const value = utils.get(this.queryParams.entity, createGraphNode.path);
      const classMeta = GlobalMetaRegistry.getClassMeta(createGraphNode.entityConstructor);
      const classSqlRef = this.getEntitySqlRef(classMeta);
      const propertyMetas = GlobalMetaRegistry.getPropertyMetasByConstructor(classMeta.fn);
      const relationMetas = GlobalMetaRegistry.getRelationMetasByConstructor(classMeta.fn);

      this.operationsQueue.push(new SqlInsertOperation({
        relationMetas,
        value,
        classSqlRef,
        propertyMetas,
        classMeta
      }));
    });

    const sqlStatements: string[] = await Promise.all(this.operationsQueue.getClassMetas().map(async classMeta => {
      const entitySqlRef = this.getEntitySqlRef(classMeta);
      const insertOperations = this.operationsQueue.getOperationsByTableName('insert', classMeta.tableName);
      const sqlInsertValueSets = insertOperations.map(insertOperation => insertOperation.toSqlValueSet());
      return entitySqlRef.insert(sqlInsertValueSets).toQuery();
    }));


    const sortedInsertSqlResults: InsertSqlResult[] = await Promise.all(sqlStatements.map(sqlStatement => {
      return this.executeSqlQuery<InsertSqlResult>(sqlStatement);
    }));

    sortedInsertSqlResults.forEach((result, index) => {
      const node = entityInsertGraphSortedNodes[index];
      const nodeSiblings = node.siblings;
      const primaryKeyMeta = GlobalMetaRegistry.getIdentifierPropertyMeta(node.entityConstructor);

      node.entity[primaryKeyMeta.propertyName] = result.insertId;

      if (nodeSiblings.length > 0) {
      }
      // QUESTION: is this a safe operation? Will the appropriate node siblings always be defined
      for (let i = 1; i < result.affectedRows; i++) {
        nodeSiblings[i].entity[primaryKeyMeta.propertyName] = result.insertId + i;
      }

    });

    return this.entityQueryGraph.entity;
  }
}
