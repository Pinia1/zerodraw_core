import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true, name: 'github_id' })
  @Index()
  githubId: number;

  @Column({ type: 'int', default: 0, name: 'view_num' })
  viewNum: number = 0;

  @Column({ type: 'varchar', length: 255, name: 'github_access_token' })
  githubAccessToken: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  username: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  blog?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location?: string;

  @Column({ type: 'int', default: 0, name: 'public_repos' })
  publicRepos?: number;

  @Column({ type: 'int', default: 0 })
  followers?: number;

  @Column({ type: 'int', default: 0 })
  following: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
