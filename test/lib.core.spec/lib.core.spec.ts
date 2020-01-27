import * as mysql from 'mysql';
import { expect } from 'chai';

import { SimpleORM } from '../../lib/core';

import {
  ATestEntity,
  ATestGrandParentEntity,
  ATestParentEntity
} from './assets';

describe('lib/core', function () {
  let connection: mysql.Connection;

  before(function () {
    connection = mysql.createConnection({
      user: process.env.MYSQL_UN,
      password: process.env.MYSQL_PW,
      port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : undefined,
      database: process.env.MYSQL_DB,
      multipleStatements: true,
      host: process.env.MYSQL_HOST
    })
  });

  describe('SimpleORM', function () {

    describe('insert()', function () {

      it('should define primary key of saved classes', async function () {
        const orm = new SimpleORM(connection);

        const result = await orm.insert(ATestParentEntity, {
          children: [
            { name: `"child 1" - ${Date.now()}`, excludedId: 'anExcludedId1' },
            { name: `"child 2" - ${Date.now()}`, excludedId: 'anExcludedId2' }
          ]
        });

        result.id.should.be.ok;
        result.children.forEach(child => {
          child.id.should.ok;
        })
      })
    });

    describe('retrieve()', function () {

      it('should return instance with mapped values populated from database', async function () {
        const orm = new SimpleORM(connection);
        const result: ATestEntity = await orm.retrieve(ATestEntity, { id: 1 }, {
          relations: {
            parent: true
          }
        });

        result.should.be.ok;
        result.includedId.should.be.ok;
        expect(result.excludedId).to.be.undefined;
      });

      it('should return a value for related entities when "Many-To-One" relation is used', async function () {
        const orm = new SimpleORM(connection);
        const result: ATestEntity = await orm.retrieve(ATestEntity, { id: 2 }, {
          relations: {
            parent: {
              parent: true
            }
          }
        });

        result.should.be.ok;
        result.parent.should.be.an.instanceOf(ATestParentEntity);
        result.parent.parent.should.be.an.instanceOf(ATestGrandParentEntity);
        result.includedId.should.be.ok;
        expect(result.excludedId).to.be.undefined;
      });

      it('should return a value for related entities when "One-To-Many" relation is used', async function () {
        const orm = new SimpleORM(connection);
        const result: ATestParentEntity = await orm.retrieve(ATestParentEntity, { id: 789 }, {
          relations: {
            children: true,
            parent: true
          }
        });

        result.should.be.ok;
        result.id.should.be.ok;
        result.children.should.be.ok;
      });
    })

  })
});