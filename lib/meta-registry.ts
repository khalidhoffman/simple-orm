import {
  ClassMetaCollection,
  GlobalClassMetaCollection,
  GlobalPropertyMetaCollection,
  PropertyMetaCollection
}                                   from './meta-collection';
import { EntityRelationType }       from './graph/entity-relation';
import { getInverseFnPropertyName } from './utils';

export class MetaRegistry {
  classMetaCollection: ClassMetaCollection = GlobalClassMetaCollection;
  propertyMetaCollection: PropertyMetaCollection = GlobalPropertyMetaCollection;

  getIdentifierPropertyMeta<T = any>(constructor: Constructor<T>): IPropertyMeta {
    const entityPropertiesMetadata = this.propertyMetaCollection.getPropertyMetasByConstructor(constructor);
    return entityPropertiesMetadata.find(propertyMeta => propertyMeta.options.sql.primaryKey);
  }

  getPropertyMeta<T>(constructor: Constructor<T>, propertyName: keyof T): IPropertyMeta {
    return this.propertyMetaCollection.getDefaultPropertyMeta(constructor, propertyName);
  }

  getRelationMetasByConstructor<T>(constructor: Constructor<T>): IPropertyMeta[] {
    return this.propertyMetaCollection.getRelationMetasByConstructor(constructor);
  }

  getPropertyRelationMeta<T>(constructor: Constructor<T>, propertyName: keyof T): IPropertyMeta {
    const relationMetas = this.getRelationMetasByConstructor(constructor);

    return relationMetas.reduce((propertyMeta: IPropertyMeta, relation: IPropertyMeta) => {
      if (relation.propertyName !== propertyName) {
        return propertyMeta;
      }
      return Object.assign({ ...propertyMeta }, relation, propertyMeta);
    }, null);
  }

  getPropertyMetasByConstructor<T>(constructor: Constructor<T>): IPropertyMeta[] {
    return this.propertyMetaCollection.getPropertyMetasByConstructor(constructor);
  }

  getClassMeta<T>(constructor: Constructor<T>): IClassMeta {
    return this.classMetaCollection.getClassMeta(constructor);
  }

  getQueryRelations<T extends object = any>(entityConstructor: Constructor<T>, queryRelationsParams: IQueryRelationsParams<T>, accumulator: IQueryRelation[] = []): IQueryRelation[] {
    const entityPrimaryColumnMetadata = GlobalMetaRegistry.getIdentifierPropertyMeta(entityConstructor);
    const entityMetadata = GlobalMetaRegistry.getClassMeta(entityConstructor);
    const relations: IQueryRelation[] = accumulator;

    if ((queryRelationsParams === undefined) || (queryRelationsParams === null)) {
      debugger
    }


    if (queryRelationsParams === true) {
      return [];
    }

    Object.keys(queryRelationsParams).forEach(queryParamProperty => {
      const entityPropertyRelationMeta = GlobalMetaRegistry.getPropertyRelationMeta(entityConstructor, queryParamProperty as keyof T);
      if (!entityPropertyRelationMeta) {
        debugger
      }
      const entityPropertySqlName = entityPropertyRelationMeta.options.sql.name;
      const entityResolvedPropertyMeta = GlobalMetaRegistry.propertyMetaCollection.find(propertyMeta => {
        return propertyMeta.propertyName === entityPropertyRelationMeta.meta.relation.related.property
          && propertyMeta.fn === entityPropertyRelationMeta.meta.relation.related.getFn()
      }) || entityPrimaryColumnMetadata;
      const entityResolvedPropertyName = entityResolvedPropertyMeta.propertyName;
      const entityPropertyMeta = GlobalMetaRegistry.getPropertyMeta(entityConstructor, entityResolvedPropertyName as keyof T) || entityPropertyRelationMeta;

      if (!entityPropertyMeta) {
        debugger
      }

      let baseRelation: IQueryRelation = {
        type: entityPropertyRelationMeta.meta.relation.type,
        related: {
          property: null,
          alias: null,
          entity: null,
        },
        base: {
          property: {
            entity: entityMetadata,
            meta: entityPropertyMeta,
            relationMeta: entityPropertyRelationMeta,
            alias: entityPropertyMeta.options.sql.alias
          },
          alias: entityPropertyMeta.options.sql.alias,
          entity: entityMetadata
        }
      };

      if (entityPropertyRelationMeta && entityPropertyRelationMeta.meta.relation) {

        switch (entityPropertyRelationMeta.meta.relation.type) {
          case EntityRelationType.OneToMany:
          case EntityRelationType.ManyToOne: {
            const relatedEntityConstructor = entityPropertyRelationMeta.options.typeFunction();
            const relatedEntityPrimaryMeta = GlobalMetaRegistry.getIdentifierPropertyMeta(relatedEntityConstructor);
            const relatedEntityPropertyName = getInverseFnPropertyName(entityPropertyRelationMeta.options.inverseSide);
            const relatedPropertyRelationMeta = GlobalMetaRegistry.getPropertyRelationMeta(relatedEntityConstructor, relatedEntityPropertyName);
            const relatedEntityMeta = GlobalMetaRegistry.getClassMeta(relatedEntityConstructor);
            const relatedResolvedPropertyName = relatedPropertyRelationMeta.options.sql.name || relatedEntityPrimaryMeta.propertyName;
            const relatedPropertyMeta = GlobalMetaRegistry.getPropertyMeta(relatedEntityConstructor, relatedResolvedPropertyName as keyof T) || relatedPropertyRelationMeta;
            const nestedQueryRelations = GlobalMetaRegistry.getQueryRelations(relatedEntityConstructor, queryRelationsParams[queryParamProperty]);
            baseRelation.type = entityPropertyRelationMeta.meta.relation.type;
            baseRelation.related = {
              entity: relatedEntityMeta,
              alias: relatedPropertyMeta.options.sql.alias,
              property: {
                entity: relatedEntityMeta,
                meta: relatedPropertyMeta,
                relationMeta: relatedPropertyRelationMeta,
                alias: relatedPropertyMeta.options.sql.alias
              }
            };
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

        relations.push(baseRelation);
      }

    });

    return relations;
  }
}

export const GlobalMetaRegistry = new MetaRegistry();