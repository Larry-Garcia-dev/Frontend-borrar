import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';

export interface JwtPayload {
  sub: string;
}

export class JwtUtil {
  static generateToken(userId: string): string {
    return jwt.sign({ sub: userId }, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN,
    });
  }

  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw new Error('Token inválido o expirado');
    }
  }
}