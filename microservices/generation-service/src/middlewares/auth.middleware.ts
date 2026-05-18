import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    studio_id?: string;
  };
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ detail: 'Token no proporcionado' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    (req as AuthRequest).user = {
      id: decoded.sub || decoded.id,
      email: decoded.email,
      role: decoded.role,
      studio_id: decoded.studio_id,
    };
    next();
  } catch (error) {
    res.status(401).json({ detail: 'Token invalido o expirado' });
  }
};
