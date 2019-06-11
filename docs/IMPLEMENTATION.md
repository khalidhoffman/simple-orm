# Implementation

areas of query context:
- query parsing
- query conversion
    - to standardized format
    - [ ] _what is the standardized format?_
- query metadata

areas of query execution:
- cache
- order of operations
    - [ ] will this need to be recursive/iterative?
        - any implementation should be deterministic
- error handling
    - transactions
    - thread context    


## Diagrams

```plantuml
class EntityMetadataGraph
class MetadataDecorator
class PropertyMetadataDecorator
interface IMeta {
    className: string
    fn: Constructor
    object: any
    options: any [0..1]
}

interface IClassMeta {
    entity: constructor<Entity>
    properties: EntityPropertyMetadata[]
    tableName: string
}
interface EntityPropertyMetadata {
    entity: constructor<Entity>
    className: string
    fn: Constructor
    object: any
    options: any
    propertyName: PropertyKey
    options: IPropertyMetaOptions
    type: IPropertyMetaType [0..1]
}
interface IRelationPropertyMeta {
  extra: IPropertyMetaExtra;
  classMeta?: IClassMeta;
  relatedMeta?: IRelationPropertyMeta[];
}
class EntityRelationGraph
class EntityQueryGraphNode
class Entity
class Graph
class AbstractQuery
class AbstractSqlQuery
class SqlReadQuery

hide empty members
hide empty methods

Entity ..> MetadataDecorator: calls
Entity ..> PropertyMetadataDecorator: calls
MetadataDecorator ..> IClassMeta: creates
PropertyMetadataDecorator ..> EntityPropertyMetadata: creates
IClassMeta "1" *-- "*" EntityMetadataGraph
IClassMeta "1" *-- "*" EntityPropertyMetadata
EntityMetadataGraph --|> Graph
EntityRelationGraph --|> Graph
```

```

EntityQueryGraphNode "1" --* "1" Entity

EntityRelationGraph "1" *-- "*" AbstractQuery 
EntityMetadataGraph "1" *-- "*" AbstractQuery
AbstractQuery "1" --* "1" EntityQueryGraphNode

AbstractSqlQuery --o AbstractQuery
SqlReadQuery --o AbstractSqlQuery 
```


#### query graph creation 
```plantuml

participant Query
participant QueryGraph
participant EntityMetadataGraph

```

## Workflow

1. [query-context:metadata] metadata created from decorator callbacks
    * build graph of all specified entities and nested entities that is superimposed with meta
2. [query-context:conversion] Retrieve saved entity from query entity
    * uses metadata (`IClassMeta`) to determine how to retrieve entity 
3. [query-execution] Determine diff of saved entity and active entity 
4. [query-execution] Generate CRUD operations from diff
    1. generate diff
    2. convert diff to mysql AST
    2. apply mysql AST to sql builder (?)
    * Create
        - sql
            - `INSERT INTO ... VALUES ...;`
    * Read
        - sql
            - `SELECT ... FROM ... WHERE ...`
            - mvp complete
    * Update
        - sql
            - `UPDATE ... SET (a=b) WHERE ...`
    * Delete
        - sql
            - `DELETE FROM ... WHERE ...`
    * CRUD operations can be saved in ledger-like format (queued & ordered) for better control over execution and result handling
5. [query-execution] Execute CRUD operations from diff
6. [query-execution] convert results to standardized format
    - [ ] _what is this format?_

| abstract | psuedo (`A -(C)> B`) | sql | nosql
|----------|--------|-----| -----
|`One-To-One`| `A.b === B && B.a === A` | `select`, `inner join`| lookup
|`One-To-Many`| `A.b === B.a[]`  |`left join on A.b`| iterative select
|`Many-To-One`| `A.b[] === B.a`|`left join on B.a`, `inner join on B.a` | index lookup and shared definition
|`Many-To-Many`| `A.c === C.a[] && C.b[] === B.c` | `inner join on C.a AND inner join on C.b` | intersection of A.c and B.c


## Todo
