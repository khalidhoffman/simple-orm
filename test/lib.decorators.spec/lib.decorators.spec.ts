import { SimpleORM }   from "../../lib/core";
import { ATestEntity } from "./assets";

describe("/lib/decorators", function () {

  describe("Entity()", function () {

    it("should gather metadata about a class", function () {
      SimpleORM.classMetaCollection.getClassMeta(ATestEntity).should.be.ok;
      SimpleORM.propertyMetaCollection.getDefaultPropertyMeta(ATestEntity, 'aProperty').should.be.ok;
      SimpleORM.propertyMetaCollection.getDefaultPropertyMeta(ATestEntity, 'id').should.be.ok;
    });

    it("should not fail when class is instantiated", function () {
      const instantiatedEntity = new ATestEntity({ aProperty: -2 });
      const aPropertyMeta = SimpleORM.propertyMetaCollection.getDefaultPropertyMeta(ATestEntity, 'aProperty');

      aPropertyMeta.should.be.ok;
    })
  })
});