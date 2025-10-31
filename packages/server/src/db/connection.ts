import { DataSource } from 'typeorm';
import { User } from '../entities/UserEntities';
import { dbConfig } from './config';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  entities: [User],
  synchronize: process.env.NODE_ENV === 'development',
});
