import * as Knex from 'knex';

const knex = require('knex');

export const sql = knex({
  dialect: 'mysql',
  asyncStackTraces: true
});

export type EntitySqlRef = Knex.QueryBuilder;

export type EntityPropertySqlRef<K extends string = any, E = any> = Knex.Ref<K, E>;