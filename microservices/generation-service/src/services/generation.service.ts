import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { GenerationRequest, GenerationResult } from '../types';
import { 
  getGenerationPath, 
  ensureDirectoryExists, 
  generateFileName,
  selectRandomPhotos 
} from '../utils/storage.util';

export class GenerationService {
  static async generateForModel(
    studioId: string, 
    data: GenerationRequest
  ): Promise<GenerationResult> {
    // 1. Buscar perfil de la modelo
    const profile = await prisma.modelProfile.findFirst({
      where: { user_id: data.model_user_id },
    });

    if (!profile) {
      throw { status: 404, message: 'Perfil de modelo no encontrado' };
    }

    // Verificar que el perfil pertenece al estudio
    if (profile.studio_id !== studioId) {
      throw { status: 403, message: 'No tienes permiso para generar imagenes de esta modelo' };
    }

    // Verificar estado del perfil
    const activeStatuses = ['APPROVED', 'ACTIVE', 'READY'];
    if (!activeStatuses.includes(profile.status)) {
      throw { status: 400, message: `La modelo no esta activa (estado: ${profile.status})` };
    }

    // 2. Buscar usuario (modelo) para obtener el email
    const user = await prisma.user.findUnique({ where: { id: data.model_user_id } });
    if (!user) {
      throw { status: 404, message: 'Usuario modelo no encontrado' };
    }

    // 3. Seleccionar fotos de entrenamiento al azar
    const isExplicit = data.is_explicit && profile.is_explicit;
    const trainingPhotos = isExplicit 
      ? (profile.explicit_training_photos as string[]) 
      : (profile.training_photos as string[]);

    if (!trainingPhotos || trainingPhotos.length === 0) {
      throw { status: 400, message: 'La modelo no tiene fotos de entrenamiento' };
    }

    const selectedPhotos = selectRandomPhotos(trainingPhotos, 4);

    // 4. Preparar directorio de salida
    const outputPath = getGenerationPath(user.email, isExplicit);
    ensureDirectoryExists(outputPath);
    const fileName = generateFileName();
    const fullPath = path.join(outputPath, fileName);

    // 5. Llamar a la API de generacion externa
    try {
      const response = await axios.post(`${env.GENERATION_API_URL}/generate`, {
        prompt: data.prompt,
        reference_images: selectedPhotos,
        is_explicit: isExplicit,
        output_path: fullPath,
      }, {
        timeout: 120000, // 2 minutos timeout
      });

      // 6. Guardar registro en la base de datos
      const media = await prisma.generatedMedia.create({
        data: {
          user_id: data.model_user_id,
          storage_url: fullPath.replace(env.STORAGE_PATH, '/generadas'),
          prompt: data.prompt,
          media_type: 'IMAGE',
          width: 1024,
          height: 1024,
          status: 'COMPLETED',
        },
      });

      return {
        id: media.id,
        storage_url: media.storage_url,
        prompt: data.prompt,
        created_at: media.created_at.toISOString(),
      };

    } catch (error: any) {
      console.error('[Generation] Error llamando API externa:', error.message);
      
      // Si la API falla, guardar como pendiente
      const media = await prisma.generatedMedia.create({
        data: {
          user_id: data.model_user_id,
          storage_url: '',
          prompt: data.prompt,
          media_type: 'IMAGE',
          width: 1024,
          height: 1024,
          status: 'FAILED',
        },
      });

      throw { 
        status: 500, 
        message: 'Error al generar la imagen. Intentalo de nuevo.',
        mediaId: media.id 
      };
    }
  }

  static async getModelGenerations(modelUserId: string, limit: number = 20) {
    return prisma.generatedMedia.findMany({
      where: { user_id: modelUserId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }
}
