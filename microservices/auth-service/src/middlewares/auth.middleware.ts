import { Request, Response, NextFunction } from 'express';
import { JwtUtil } from '../utils/jwt.util';
import { UserRepository } from '../repositories/user.repository';

// Ampliamos el objeto Request de Express para guardar el usuario
export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ detail: 'No autorizado. Token faltante.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = JwtUtil.verifyToken(token);

    const user = await UserRepository.findById(payload.sub);
    if (!user || !user.is_active) {
      res.status(401).json({ detail: 'Usuario no encontrado o inactivo.' });
      return;
    }

    req.user = user; // Guardamos el usuario en la request
    next();
  } catch (error) {
    res.status(401).json({ detail: 'Token inválido o expirado.' });
  }
};