import { Graph } from 'graphlib';

export const GLOBAL_GRAPH = new Graph();

interface IGraphNode {
  key: string;
  graph: Graph;
}

export class GraphNode implements IGraphNode {
  key: string;
  graph: Graph;

  constructor(params: IGraphNode) {
    Object.assign(this, params);
    this.graph.setNode(params.key, this)
  }
}