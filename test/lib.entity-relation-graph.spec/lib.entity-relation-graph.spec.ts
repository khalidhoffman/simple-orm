import { BaseEntityRelationGraph } from '../../lib/entity-relation-graph';
import { ATestGrandParentEntity }  from './assets';

describe('BaseEntityRelationGraph', function () {

  it("builds a graph of an entity's relations based on a dict of values", function(){

    const relationGraph = new BaseEntityRelationGraph(ATestGrandParentEntity, {
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

    relationGraph.propertyMetaGraph.should.be.ok;
  })
});