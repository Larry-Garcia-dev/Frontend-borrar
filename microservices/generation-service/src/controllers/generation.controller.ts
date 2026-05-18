import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { GenerationService } from '../services/generation.service';
import { GenerationRequest } from '../types';
import { prisma } from '../config/prisma'; // Faltaba importar prisma

export class GenerationController {
  static async generateForModel(req: AuthRequest, res: Response): Promise<void> {
    console.log('[generation-controller] ====== INCOMING REQUEST ======');
    console.log('[generation-controller] Method:', req.method);
    console.log('[generation-controller] URL:', req.originalUrl);
    console.log('[generation-controller] User ID (Studio):', req.user?.id);
    console.log('[generation-controller] Body:', JSON.stringify(req.body, null, 2));
    
    try {
      const studioId = req.user.id;
      const data: GenerationRequest = req.body;

      if (!data.model_user_id) {
        console.error('[generation-controller] ERROR: model_user_id is required');
        res.status(400).json({ detail: 'model_user_id es requerido' });
        return;
      }

      if (!data.prompt) {
        console.error('[generation-controller] ERROR: prompt is required');
        res.status(400).json({ detail: 'prompt es requerido' });
        return;
      }

      console.log('[generation-controller] Calling GenerationService.generateForModel...');
      const result = await GenerationService.generateForModel(studioId, data);
      
      console.log('[generation-controller] SUCCESS - Generated', result.count, 'images');
      console.log('[generation-controller] Result:', JSON.stringify(result, null, 2));
      res.json(result);
    } catch (e: any) {
      console.error('[generation-controller] ERROR:', e.message);
      console.error('[generation-controller] Stack:', e.stack);
      res.status(e.status || 500).json({ detail: e.message });
    }
  }

  static async getModelGenerations(req: AuthRequest, res: Response): Promise<void> {
    console.log('[generation-controller] Getting generations for model:', req.params.modelUserId);
    try {
      const modelUserId = req.params.modelUserId;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const generations = await GenerationService.getModelGenerations(modelUserId, limit);
      console.log('[generation-controller] Found', generations.length, 'generations');
      res.json(generations);
    } catch (e: any) {
      console.error('[generation-controller] ERROR getting generations:', e.message);
      res.status(e.status || 500).json({ detail: e.message });
    }
  }

  // NUEVA FUNCIÓN AGREGADA PARA APROBAR LA IMAGEN
  static async approveMedia(req: AuthRequest, res: Response): Promise<void> {
    console.log('[generation-controller] Approving media:', req.params.mediaId);
    try {
      const { mediaId } = req.params;
      
      // Actualizamos la imagen en BD para marcarla como aprobada
      await prisma.media.update({
        where: { id: mediaId },
        data: { 
          isApproved: true,
          approvedAt: new Date()
        }
      });

      res.json({ detail: "Imagen aprobada exitosamente" });
    } catch (e: any) {
      console.error('[generation-controller] ERROR approving media:', e.message);
      res.status(500).json({ detail: "Error al aprobar la imagen" });
    }
  }
}