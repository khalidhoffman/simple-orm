import { Graph } from 'graphlib';

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