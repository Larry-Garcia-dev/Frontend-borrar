import { Response } from 'express';
import { prisma } from '../repositories/prisma.client';
import { AuthRequest } from '../middlewares/studio.middleware';

const GENERATION_SERVICE_URL = process.env.GENERATION_SERVICE_URL || 'http://localhost:3003';
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'internal-service-secret';

export class GenerationController {
  static async triggerGenerationFromStudio(req: AuthRequest, res: Response): Promise<void> {
    console.log('[vendor-service] triggerGenerationFromStudio called');
    console.log('[vendor-service] Body:', JSON.stringify(req.body));
    
    try {
      const studioId = req.user.id;
      const studioEmail = req.user.email;
      const { model_user_id, prompt, is_explicit, num_images, width, height } = req.body;

      console.log('[vendor-service] Studio ID:', studioId);
      console.log('[vendor-service] Studio Email:', studioEmail);
      console.log('[vendor-service] Model User ID:', model_user_id);

      // 1. Validar que la modelo pertenece al estudio
      const profile = await prisma.modelProfile.findFirst({
        where: { user_id: model_user_id, studio_id: studioId },
      });

      if (!profile) {
        console.log('[vendor-service] ERROR: Model profile not found or does not belong to studio');
        res.status(404).json({ detail: 'La modelo no pertenece al estudio o no existe.' });
        return;
      }
      console.log('[vendor-service] Found profile:', profile.id);

      // 2. Verificar que el perfil esta activo
      const activeStatuses = ['APPROVED', 'ACTIVE', 'READY'];
      if (!activeStatuses.includes(profile.status)) {
        console.log('[vendor-service] ERROR: Model not active, status:', profile.status);
        res.status(400).json({ detail: `La modelo no esta activa (estado: ${profile.status})` });
        return;
      }

      // 3. Llamar al generation-service con headers internos
      console.log('[vendor-service] Calling generation-service at:', GENERATION_SERVICE_URL);
      
      const generationResponse = await fetch(`${GENERATION_SERVICE_URL}/api/generation/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Secret': INTERNAL_SERVICE_SECRET,
          'X-User-Id': studioId,
          'X-User-Email': studioEmail,
          'X-User-Role': 'ESTUDIO',
          'X-Studio-Id': studioId,
        },
        body: JSON.stringify({
          model_user_id,
          prompt,
          is_explicit: is_explicit || false,
          num_images: num_images || 1,
          width: width || 1024,
          height: height || 1024,
        }),
      });

      console.log('[vendor-service] Generation service response status:', generationResponse.status);

      if (!generationResponse.ok) {
        const errorBody = await generationResponse.text();
        console.log('[vendor-service] Generation service error:', errorBody);
        res.status(generationResponse.status).json({ 
          detail: `Error del servicio de generacion: ${errorBody}` 
        });
        return;
      }

      const result = await generationResponse.json();
      console.log('[vendor-service] Generation result:', JSON.stringify(result));
      
      res.json(result);
    } catch (e: any) {
      console.error('[vendor-service] ERROR in triggerGenerationFromStudio:', e.message);
      console.error('[vendor-service] Stack:', e.stack);
      res.status(500).json({ detail: e.message });
    }
  }
}
