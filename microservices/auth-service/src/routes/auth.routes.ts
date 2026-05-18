import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Rutas Públicas
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.get('/google', AuthController.googleLogin);
router.get('/google/callback', AuthController.googleCallback);

// Rutas Protegidas (Requieren Token)
router.get('/me', authMiddleware, AuthController.me);
router.post('/logout', authMiddleware, AuthController.logout);

export default router;