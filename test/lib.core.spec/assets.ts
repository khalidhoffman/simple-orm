import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne
} from '../../lib';


@Entity('ParentSequelizeClass')
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


  @ManyToOne(type => ATestParentEntity, ATestParentEntity => ATestParentEntity.children, { name: 'parentId' })
  parent: ATestParentEntity;

  excludedId: string;

  constructor(props?: Partial<ATestEntity>) {
    Object.assign(this, props);
  }
}
