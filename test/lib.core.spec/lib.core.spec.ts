import * as mysql from 'mysql';
import { expect } from 'chai';

import { SimpleORM }   from '../../lib/core';
import {
  ATestEntity,
  ATestParentEntity
} from './assets';

describe('[core]', function () {
  let connection: mysql.Connection;

  describe('SimpleORM', function () {

    describe('retrieve()', function () {

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

      it('should return instance with mapped values populated from database', async function () {
        const orm = new SimpleORM(connection);
        const result: ATestEntity = await orm.retrieve(ATestEntity, 1, {
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
        const result: ATestEntity = await orm.retrieve(ATestEntity, 2, {
          relations: {
            parent: true
          }
        });

        result.should.be.ok;
        result.includedId.should.be.ok;
        result.parent.should.be.ok;
        expect(result.excludedId).to.be.undefined;
      });

      it('should return a value for related entities when "One-To-Many" relation is used', async function () {
        const orm = new SimpleORM(connection);
        const result: ATestParentEntity = await orm.retrieve(ATestParentEntity, 789, {
          relations: {
            children: true
          }
        });

        result.should.be.ok;
        result.id.should.be.ok;
        result.children.should.be.ok;
      });
    })

  })
});