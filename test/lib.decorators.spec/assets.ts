import {
  Entity,
  Column,
  PrimaryGeneratedColumn
} from "../../lib";

@Entity('some_table')
export class ATestEntity {
  @PrimaryGeneratedColumn({
    type: 'int',
    name: 'a_property'
  })
  id: number;

  @Column({
    type: 'int',
    name: 'a_property',
    default: -1
  })
  aProperty: number;

  constructor(props?: Partial<ATestEntity>) {
    Object.assign(this, props);
  }
}
