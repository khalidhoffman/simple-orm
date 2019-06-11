import Store            from 'simple-store';
import { MetaRegistry } from '../metadata/meta-registry';

export abstract class AbstractQuery<T extends object = any> {
  store: Store = new Store();
  metaRegistry: MetaRegistry = new MetaRegistry();

  Entity: Constructor<T>;
  entityMetadata: IClassMeta;
  entityPropertiesMetadata: IPropertyMeta[];
  entityRelationsMetadata: IPropertyMeta[];
  relations: IRelationalQueryPartial<T>;
  queryParams: IQueryParams<T>;

  abstract execute(): Promise<T>

  protected constructor(Entity: Constructor<T>, queryParams: IQueryParams<T>) {
    this.Entity = Entity;
    this.entityMetadata = this.metaRegistry.getClassMeta(Entity);
    this.entityPropertiesMetadata = this.metaRegistry.getPropertyMetasByConstructor(Entity);
    this.entityRelationsMetadata = this.metaRegistry.getRelationMetasByConstructor(Entity);
    this.queryParams = {
      ...queryParams,
      options: {
        ...(queryParams && queryParams.options),
        relations: {
          ...(queryParams && queryParams.options && queryParams.options.relations),
        }
      }
    };
    this.relations = this.queryParams.options.relations;

    this.store.update({
      Entity,
      queryParams,
      entityMetadata: this.entityMetadata,
      entityPropertiesMetadata: this.entityPropertiesMetadata,
      entityRelationsMetadata: this.entityRelationsMetadata
    });
  };
}
