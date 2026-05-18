import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { GenerationService } from '../services/generation.service';
import { GenerationRequest } from '../types';

export class GenerationController {
  static async generateForModel(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studioId = req.user.id;
      const data: GenerationRequest = req.body;

      if (!data.model_user_id) {
        res.status(400).json({ detail: 'model_user_id es requerido' });
        return;
      }

      if (!data.prompt) {
        res.status(400).json({ detail: 'prompt es requerido' });
        return;
      }

      const result = await GenerationService.generateForModel(studioId, data);
      res.json(result);
    } catch (e: any) {
      res.status(e.status || 500).json({ detail: e.message });
    }
  }

  static async getModelGenerations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const modelUserId = req.params.modelUserId;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const generations = await GenerationService.getModelGenerations(modelUserId, limit);
      res.json(generations);
    } catch (e: any) {
      res.status(e.status || 500).json({ detail: e.message });
    }
  }
}
