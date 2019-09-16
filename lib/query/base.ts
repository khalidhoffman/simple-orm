import Store            from 'simple-store';
import { MetaRegistry } from '../meta-registry';

export abstract class AbstractQuery<T = any> {
  store: Store = new Store();
  metaRegistry: MetaRegistry = new MetaRegistry();
  entityMetadata: IClassMeta;
  entityPropertiesMetadata: IPropertyMeta[];
  entityRelationsMetadata: IPropertyMeta[];
  relations: IRelationalQueryPartial<T>;

  abstract execute(): Promise<T>

  protected constructor(protected Entity: Constructor<T>, protected queryParams: IQueryParams) {
    this.relations = queryParams.options.relations;
    this.entityMetadata = this.metaRegistry.getClassMeta(Entity);
    this.entityPropertiesMetadata = this.metaRegistry.getPropertyMetasByConstructor(Entity);
    this.entityRelationsMetadata = this.metaRegistry.getRelationMetasByConstructor(Entity);
    this.queryParams = {
      options: {
        relations: {},
        ...queryParams.options
      },
      ...queryParams
    };

    this.store.update({
      Entity,
      queryParams,
      entityMetadata: this.entityMetadata,
      entityPropertiesMetadata: this.entityPropertiesMetadata,
      entityRelationsMetadata: this.entityRelationsMetadata
    });
  };
}
