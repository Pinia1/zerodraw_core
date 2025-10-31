import { Repository } from 'typeorm';
import { AppDataSource } from '../db/connection';
import { User } from '../entities/UserEntities';

export const userRepository: Repository<User> = AppDataSource.getRepository(User);
