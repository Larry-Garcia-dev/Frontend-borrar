import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { GoogleUtil } from '../utils/google.util';
import { AuthRequest } from '../middlewares/auth.middleware';
import { UserRepository } from '../repositories/user.repository';

export class AuthController {
  
  static async login(req: Request, res: Response) {
    try {
      // Soportamos tanto JSON como x-www-form-urlencoded (el formato de FastAPI)
      const email = req.body.username || req.body.email;
      const password = req.body.password;

      const { token, user } = await AuthService.login(email, password, req.ip, req.headers['user-agent']);
      
      res.json({
        access_token: token,
        token_type: 'bearer',
        user_id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_unlimited: user.is_unlimited,
        daily_limit: user.daily_limit,
        used_quota: user.used_quota,
        is_approved: user.is_approved
      });
    } catch (error: any) {
      res.status(401).json({ detail: error.message });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const { email, password, name, phone } = req.body;
      const { token, user } = await AuthService.claimAccount(email, password, name, phone, req.ip, req.headers['user-agent']);
      
      res.json({
        access_token: token,
        token_type: 'bearer',
        message: 'Cuenta activada y registrada exitosamente.',
        user_id: user.id,
        email: user.email,
        role: user.role
      });
    } catch (error: any) {
      res.status(400).json({ detail: error.message });
    }
  }

  static googleLogin(req: Request, res: Response) {
    const url = GoogleUtil.getAuthUrl();
    res.redirect(url);
  }

  static async googleCallback(req: Request, res: Response) {
    try {
      const code = req.query.code as string;
      if (!code) {
        res.status(400).json({ detail: 'Código de autorización faltante.' });
        return;
      }

      const { token, user } = await AuthService.handleGoogleAuth(code, req.ip, req.headers['user-agent']);
      
      res.json({
        access_token: token,
        token_type: 'bearer',
        user_id: user.id,
        email: user.email,
        role: user.role
      });
    } catch (error: any) {
      res.status(400).json({ detail: error.message });
    }
  }

  static async me(req: AuthRequest, res: Response) {
    // Si llegó aquí, el authMiddleware ya validó el token y puso al usuario en req.user
    const user = req.user;
    res.json({
      user_id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      daily_limit: user.daily_limit,
      used_quota: user.used_quota,
      is_unlimited: user.is_unlimited,
      quota_reset_at: user.quota_reset_at,
    });
  }

  static async logout(req: AuthRequest, res: Response) {
    if (req.user) {
      UserRepository.logActivity(req.user.id, 'LOGOUT', req.ip, req.headers['user-agent']).catch(console.error);
    }
    res.json({ message: 'Sesión cerrada exitosamente' });
  }
}