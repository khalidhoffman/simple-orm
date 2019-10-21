import {
  get,
  isPlainObject
} from 'lodash';
import {
  GlobalClassMetaCollection,
  GlobalPropertyMetaCollection
} from './meta-collection';

type TypedDict<T, Result = T> = { [k in keyof T]: Result extends Partial<T> ? Result[k] : Result };

type IEntityPropertyConstraint = any;

interface IEntityRelationGraphNode {
  relationMetas: IPropertyMeta[];
  propertyMetas: IPropertyMeta[];
  constraints: IEntityPropertyConstraint[]
  children: IEntityRelationGraphNode[] | IEntityRelationGraphNode;
}

type IPropertyMetaDict<T> = TypedDict<T, IEntityRelationGraphNode>;

export class EntityRelationGraphNode implements IEntityRelationGraphNode {
  relationMetas: IPropertyMeta[];
  propertyMetas: IPropertyMeta[];
  constraints: IEntityPropertyConstraint[];
  children: EntityRelationGraphNode[] | EntityRelationGraphNode;

  constructor(props: Partial<IEntityRelationGraphNode>) {
    Object.assign(this, props);
  }
}


export class BaseEntityRelationGraph<T = any> {
  classMeta: IClassMeta;
  propertyMetaGraph: IPropertyMetaDict<T>;

  constructor(protected constructor: Constructor<T>, protected entity: DeepPartial<T>) {
    this.classMeta = GlobalClassMetaCollection.getClassMeta(constructor);
    this.propertyMetaGraph = this.buildPropertyMetaGraph();
  }


  buildPropertyMetaGraph(constructor = this.constructor, entity = this.entity): IPropertyMetaDict<T> {
    return Object.keys(entity).reduce((result, propertyName) => {
      const propertyMeta = GlobalPropertyMetaCollection.getDefaultPropertyMeta(constructor, propertyName as keyof T);
      const relationMeta = GlobalPropertyMetaCollection.getDefaultRelationMeta(constructor, propertyName as keyof T);
      let children = null;

      if (Array.isArray(entity[propertyName])) {
        const relatedEntityConstructor = relationMeta.options.typeFunction();
        children = entity[propertyName].map(relatedChildEntity => this.buildPropertyMetaGraph(relatedEntityConstructor, relatedChildEntity));
      }
      else if (isPlainObject(entity[propertyName])) {
        const relatedEntity = entity[propertyName];
        const relatedEntityConstructor = propertyMeta.fn;
        children = this.buildPropertyMetaGraph(relatedEntityConstructor, relatedEntity);
      }

      // TODO refactor for clarity
      if (result[propertyName] instanceof EntityRelationGraphNode) {
        result[propertyName].propertyMetas.push(propertyMeta);
        result[propertyName].relationMetas.push(relationMeta);

        if (children && result[propertyName].children) {
          throw new Error ('Attempting to redefine entity children. (There are two different related entities attempting to define children of a property)')
        }

        return result;
      }

      return Object.assign(result, {
        [propertyName]: new EntityRelationGraphNode({
          relationMetas: [relationMeta],
          propertyMetas: [propertyMeta],
          constraints: [],
          children
        })
      });
    }, {}) as IPropertyMetaDict<T>;
  }

  hasPath(path: string[] | string): boolean {
    const valPath = Array.isArray(path) ? path.join('.') : path;
    return get(this.propertyMetaGraph, path);
  };
}

export class EntityValuesGraph extends BaseEntityRelationGraph {

}

export class EntityPrimaryKeysGraph extends BaseEntityRelationGraph {

}

export class EntityPersistenceOperationsGraph extends BaseEntityRelationGraph {

}
