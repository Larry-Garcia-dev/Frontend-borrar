import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../repositories/prisma.client';
import { ENV } from '../config/env';

export interface AuthRequest extends Request {
  user?: any;
}

export const studioMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ detail: 'Token de autorización faltante.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, ENV.JWT_SECRET) as any;

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    
    // Validar que exista y tenga el rol correcto
    if (!user || (user.role !== 'ESTUDIO_ADMIN' && user.role !== 'MACONDO_ADMIN')) {
      res.status(403).json({ detail: 'Acceso denegado. Se requiere rol ESTUDIO_ADMIN.' });
      return;
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ detail: 'Token inválido o expirado.' });
  }
};