import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { GenerationController } from '../controllers/generation.controller';

const router = Router();

router.use(authMiddleware);

// Generar imagen para una modelo
router.post('/generate', GenerationController.generateForModel);

// Obtener generaciones de una modelo
router.get('/models/:modelUserId/generations', GenerationController.getModelGenerations);

export default router;
