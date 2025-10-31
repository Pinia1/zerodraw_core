import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

export const generateToken = (payload: any): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET!);
};
