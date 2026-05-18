import { Response } from 'express';
import { prisma } from '../repositories/prisma.client';
import { StorageUtil } from '../utils/storage.util';
import { FolderService } from '../services/folder.service';
import { AuthRequest } from '../middlewares/studio.middleware';

export class GenerationController {
  static async triggerGenerationFromStudio(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studioId = req.user.id;
      const { model_user_id, prompt, is_explicit } = req.body;

      // 1. Validar propiedad de la modelo
      const model = await prisma.user.findFirst({
        where: { id: model_user_id, studio_id: studioId, role: 'MODELO' },
      });

      if (!model) {
        res.status(404).json({ detail: 'La modelo no pertenece al estudio o no existe.' });
        return;
      }

      // 2. Validar creditos de la modelo
      if (!model.is_unlimited && model.used_quota >= model.daily_limit) {
        res.status(429).json({ detail: 'Creditos diarios insuficientes para esta modelo.' });
        return;
      }

      // 3. Asegurar carpetas de fecha existen
      await FolderService.ensureDateFolders(model.email, !!is_explicit);

      // 4. Generar la ruta dinamica (correo, fecha, tipo)
      const targetStoragePath = StorageUtil.generateDynamicPath(model.email, !!is_explicit);

      // 5. AQUI SE ENCOLA EL TRABAJO HACIA LA IA (BullMQ/Redis)
      // Ejemplo: await queue.add('generate', { prompt, path: targetStoragePath, ... })

      res.json({
        message: 'Tarea de generacion encolada con exito',
        model: model.name || model.email,
        expected_path: targetStoragePath,
      });
    } catch (e: any) {
      res.status(500).json({ detail: e.message });
    }
  }
}
