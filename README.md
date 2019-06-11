# simple-orm
SimpleORM is a class-based ORM for node.js 

## Features include:
- automatic application and db state synchronization
- support for mysql
    - [ ] _other languages feasible via drivers_

* see [(**early "pre-alpha" draft**) `docs/IMPLEMENTATION.md`](./docs/IMPLEMENTATION.md) for roadmap and notes on implementation details

## Example Usage
* stable API has yet to be determined

### **[ALPHA]**
```typescript
const orm = new SimpleORM(connection);

const result = await orm.save(ATestParentEntity, {
  children: [
    { name: "child 1" },
    { name: "child 2" }
  ]
});

/**
 * respective database tables have been 
 * modified to match state on primary keys (ie `id`)
 */

result.id.should.be.greaterThan(0);
result.children[0].id.should.be.greaterThan(0);
result.children[0].name.should.eql("child 0");
result.children[1].id.should.be.greaterThan(result.children[0].id);

/**
 * relevant class definitions below
 */

@Entity('parent_class')
export class ATestParentEntity {
  @PrimaryGeneratedColumn({
    type: 'int',
    name: 'id'
  })
  id: number;

  @OneToMany(type => ATestEntity, ATestEntity => ATestEntity.parent)
  children?: ATestEntity[];

  constructor(props?: Partial<ATestParentEntity>) {
    Object.assign(this, props);
  }
}

@Entity('ChildSequelizeClasses')
export class ATestEntity {
  @PrimaryGeneratedColumn({
    type: 'int',
    name: 'id'
  })
  id: number;

  @Column({
    type: 'string',
    name: 'name'
  })
  name: string;

  @ManyToOne(type => ATestParentEntity, ATestParentEntity => ATestParentEntity.children, {
    name: 'parentId'
  })
  parent: ATestParentEntity;

  constructor(props?: Partial<ATestEntity>) {
    Object.assign(this, props);
  }
}
```
