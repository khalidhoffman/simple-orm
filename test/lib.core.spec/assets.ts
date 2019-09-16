import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne
} from '../../lib';


@Entity('ParentSequelizeClasses')
export class ATestParentEntity {
  @PrimaryGeneratedColumn({
    type: 'int',
    name: 'id'
  })
  id: number;

  @OneToMany(type => ATestEntity, ATestEntity => ATestEntity.parent)
  children: ATestEntity[];

  constructor(props?: Partial<ATestEntity>) {
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

  @ManyToOne(type => ATestParentEntity, ATestParentEntity => ATestParentEntity.children, { name: 'includedId' })
  parent: ATestParentEntity;

  excludedId: string;

  constructor(props?: Partial<ATestEntity>) {
    Object.assign(this, props);
  }
}
