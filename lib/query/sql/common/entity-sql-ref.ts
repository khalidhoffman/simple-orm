import * as Knex from 'knex';

const knex = require('knex');

export const sql = knex({
  dialect: 'mysql',
  asyncStackTraces: true
});

export type EntitySqlRef = Knex.QueryBuilder;

export type EntityPropertyAliasSqlRef<K extends string, E> = Knex.Ref<K, E>;