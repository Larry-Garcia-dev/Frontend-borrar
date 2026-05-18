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

const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'internal-service-secret';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  console.log('[generation-service] Auth middleware - checking authorization...');
  
  // Check for internal service call (from vendor-service)
  const internalSecret = req.headers['x-internal-service-secret'];
  if (internalSecret === INTERNAL_SERVICE_SECRET) {
    console.log('[generation-service] Internal service call detected');
    // For internal calls, extract user info from x-user-* headers
    (req as AuthRequest).user = {
      id: req.headers['x-user-id'] as string || 'internal',
      email: req.headers['x-user-email'] as string || 'internal@service',
      role: req.headers['x-user-role'] as string || 'SERVICE',
      studio_id: req.headers['x-studio-id'] as string,
    };
    console.log('[generation-service] User from internal headers:', (req as AuthRequest).user);
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[generation-service] No token provided');
    res.status(401).json({ detail: 'Token no proporcionado' });
    return;
  }

  const token = authHeader.split(' ')[1];
  console.log('[generation-service] Token received, length:', token.length);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    console.log('[generation-service] Token decoded:', JSON.stringify(decoded));
    (req as AuthRequest).user = {
      id: decoded.sub || decoded.id,
      email: decoded.email,
      role: decoded.role,
      studio_id: decoded.studio_id,
    };
    console.log('[generation-service] User authenticated:', (req as AuthRequest).user.email);
    next();
  } catch (error: any) {
    console.error('[generation-service] Token verification failed:', error.message);
    res.status(401).json({ detail: 'Token invalido o expirado' });
  }
};
