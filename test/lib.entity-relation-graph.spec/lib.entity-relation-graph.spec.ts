import { ATestGrandParentEntity } from './assets';
import { EntityRelationGraph }    from '../../lib/graph/entity-relation-graph';

describe('BaseEntityRelationGraph', function () {

  it("builds a graph of an entity's relations based on a dict of values", function(){

    const relationGraph = new EntityRelationGraph(ATestGrandParentEntity, {
      children: [{
        id: -2,
        children: [{
          id: -3,
          grandParent: undefined,
          name: 'test'
        }]
      }],
      id: -1
    });

    relationGraph.relationGraph.should.be.ok;
  })
});