import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
// NUEVO: Importamos UserRepository en lugar de AdminRepository
import { UserRepository } from '../repositories/user.repository'; 

export interface AuthRequest extends Request {
  user?: any;
}

export const adminMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ detail: 'No autorizado. Token faltante.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, ENV.JWT_SECRET) as any;

    // NUEVO: Usamos UserRepository
    const user = await UserRepository.findUserById(payload.sub); 
    
    // Verificamos que exista y que su rol sea MACONDO_ADMIN
    if (!user || user.role !== 'MACONDO_ADMIN') {
      res.status(403).json({ detail: 'Acceso denegado. Se requieren privilegios de Macondo Admin.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ detail: 'Token inválido o expirado.' });
  }
};