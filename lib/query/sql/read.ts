import {
  Column,
  TableDefinition,
  TableNode
} from 'sql';

import { AbstractSqlQuery }   from './abstract';
import { SimpleORM }          from '../../core';
import { EntityRelationType } from '../../entity-relation';

type IQueryRelationsParams<T> = IRelationalQueryPartial<T>;

export class SqlReadQuery<T = any> extends AbstractSqlQuery<T> {

  private async executeSql() {
    const queryParams: IQueryParams = this.store.get('queryParams');
    const query = this.store.get('sql');
    const entitySqlParams: TableDefinition<any, any> = this.store.get('entitySqlParams');
    const entityIdentifierMeta: IPropertyMeta = this.store.get('entityPrimaryColumnMetadata');
    const entityPropertiesMetadata: IPropertyMeta[] = this.store.get('entityPropertiesMetadata');
    const Entity: Constructor = this.store.get('Entity');

    const entitySqlRef = query.define({ ...entitySqlParams });

    let queryRelations: IEntityRelation[] = [];
    let entityWithRelationsSqlRef: TableNode = this.getEntitySqlRef(Entity);

    if (queryParams.options && queryParams.options.relations) {
      queryRelations.push(...this.getQueryRelations(Entity, queryParams.options.relations));
    }

    queryRelations.forEach(queryRelation => {
      let relatedEntity: Constructor;
      let relatedEntityPrimaryMeta: IPropertyMeta;
      let entityPropertyMeta: IPropertyMeta;
      let relatedEntityPrimaryKey: PropertyKey;
      let relatedEntitySqlRef;

      switch(queryRelation.type) {
        case EntityRelationType.OneToMany: {
          relatedEntity = queryRelation.right.getFn();
          relatedEntityPrimaryMeta = this.getEntityPrimaryColumnMeta(relatedEntity);
          relatedEntityPrimaryKey = relatedEntityPrimaryMeta.propertyName;
          entityPropertyMeta = SimpleORM.propertyMetaCollection.getPropertyMeta(relatedEntity, relatedEntityPrimaryKey);
          relatedEntitySqlRef = this.getEntitySqlRef(relatedEntity);

          entityWithRelationsSqlRef = entityWithRelationsSqlRef
            .leftJoin(relatedEntitySqlRef).on(entitySqlRef[entityIdentifierMeta.meta.propertyValuePath].equals(relatedEntity[relatedEntityPrimaryKey]));

          break;
        }
        case EntityRelationType.ManyToOne: {
          relatedEntity = queryRelation.left.getFn();
          relatedEntityPrimaryMeta = this.getEntityPrimaryColumnMeta(relatedEntity);
          relatedEntityPrimaryKey = relatedEntityPrimaryMeta.propertyName;
          relatedEntitySqlRef = this.getEntitySqlRef(relatedEntity);
          entityPropertyMeta = SimpleORM.propertyMetaCollection.getPropertyMeta(Entity, queryRelation.right.property);

          entityWithRelationsSqlRef = entityWithRelationsSqlRef
            .leftJoin(relatedEntitySqlRef).on(entitySqlRef[entityPropertyMeta.options.sql.name].equals(relatedEntity[relatedEntityPrimaryKey]));

          break;
        }
        default:
          break;
      }
    });

    const persistedEntityValuesQuery = entitySqlRef
      .from(entityWithRelationsSqlRef)
      .where(entitySqlRef[entityIdentifierMeta.meta.propertyValuePath].equals(queryParams.identifier))
      .toQuery();
    const [persistedEntityValues] = await this.execSQL(persistedEntityValuesQuery.text, persistedEntityValuesQuery.values);

    const instance = Object.keys(persistedEntityValues).reduce((entityInstance: T, entityColumnName: string) => {
      const columnMeta = entityPropertiesMetadata.find(entityPropertyMetadata => {
        return entityPropertyMetadata.options.sql && entityPropertyMetadata.options.sql.name === entityColumnName;
      });
      const propertyName = columnMeta.propertyName;

      entityInstance[propertyName] = persistedEntityValues[entityColumnName];

      return entityInstance;
    }, new Entity());

    return instance;

  }

  getQueryRelations(Entity: Constructor<T>, queryRelationsParams: IQueryRelationsParams<T>, accumulator = []): IEntityRelation[] {
    const relations: IEntityRelation[] = accumulator;

    Object.keys(queryRelationsParams).forEach(queryParamProperty => {
      const metadata = SimpleORM.propertyMetaCollection.getPropertyMeta(Entity, queryParamProperty as keyof T);

      if (metadata && metadata.meta.relation) {
        relations.push(metadata.meta.relation);

        switch (metadata.meta.relation.type) {
          case EntityRelationType.OneToMany: {
            const nestedQueryRelations = this.getQueryRelations(metadata.meta.relation.right.fn, queryRelationsParams[queryParamProperty]);
            relations.push(...nestedQueryRelations);
            break;
          }

          case EntityRelationType.ManyToOne: {
            const nestedQueryRelations = this.getQueryRelations(metadata.meta.relation.right.fn, queryRelationsParams[queryParamProperty]);
            relations.push(...nestedQueryRelations);
            break;
          }

          case EntityRelationType.OneToOne: {
            throw new Error('query relations for OneToOne not supported');
          }

          case EntityRelationType.ManyToMany: {
            throw new Error('query relations for ManyToMany not supported');
          }
        }
      }

    });

    return relations;
  }

  async execute(): Promise<T> {
    const instance = await this.executeSql();

    this.store.update({ result: instance });

    return instance;
  }
}

