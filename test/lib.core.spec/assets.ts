import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne
} from '../../lib';


@Entity('GrandParentClasses')
export class ATestGrandParentEntity {
  @PrimaryGeneratedColumn({
    type: 'int',
    name: 'id'
  })
  id: number;

  @OneToMany(type => ATestParentEntity, ATestParentEntity => ATestParentEntity.parent)
  children: ATestParentEntity[];

  @OneToMany(type => ATestEntity, ATestEntity => ATestEntity.grandParent)
  grandChildren: ATestEntity[];

  constructor(props?: Partial<ATestGrandParentEntity>) {
    Object.assign(this, props);
  }
}

@Entity('ParentSequelizeClasses')
export class ATestParentEntity {
  @PrimaryGeneratedColumn({
    type: 'int',
    name: 'id'
  })
  id: number;

  @OneToMany(type => ATestEntity, ATestEntity => ATestEntity.parent)
  children: ATestEntity[];

  @ManyToOne(type => ATestGrandParentEntity, ATestGrandParentEntity => ATestGrandParentEntity.children, { name: 'parentId' })
  parent: ATestGrandParentEntity;

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
    type: 'int',
    name: 'parentId',
    default: 99
  })
  includedId: number;

  @Column({
    type: 'string',
    name: 'name'
  })
  name: string;

  @ManyToOne(type => ATestParentEntity, ATestParentEntity => ATestParentEntity.children, {
    name: 'parentId'
  })
  parent: ATestParentEntity;

  @ManyToOne(type => ATestGrandParentEntity, ATestGrandParentEntity => ATestGrandParentEntity.grandChildren, { name: 'grandParentId' })
  grandParent: ATestGrandParentEntity;

  excludedId: string;

  constructor(props?: Partial<ATestEntity>) {
    Object.assign(this, props);
  }
}
