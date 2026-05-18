import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { GenerationRequest, GenerationResult } from '../types';
import { alibabaClient } from './alibaba/client';
import { extractImageUrls, pollAlibabaTask, guessExtension, shuffleArray } from '../utils/alibaba.util';
import { 
  getGenerationPath, 
  ensureDirectoryExists, 
  urlToBase64DataUri,
} from '../utils/storage.util';

// Modelos de Alibaba
const TEXT_TO_IMAGE_MODEL = 'wan2.6-image';
const IMAGE_TO_IMAGE_MODEL = 'wan2.7-image-pro';

// Variaciones para generar imagenes distintas
const VARIATIONS = [
  '',
  ' with slight angle variation',
  ' with subtle lighting variation',
  ' with warm tone variation',
  ' with cool tone variation',
  ' with high contrast variation',
  ' with soft focus variation',
  ' with dramatic shadow variation',
  ' with bright highlight variation',
  ' with cinematic color grading',
];

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

    // 2. Buscar usuario (modelo)
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

    // Seleccionar hasta 4 fotos al azar
    const numPhotos = Math.min(4, trainingPhotos.length);
    const selectedPhotos = shuffleArray(trainingPhotos).slice(0, numPhotos);

    // 4. Convertir fotos a base64
    const refImagesB64: string[] = [];
    for (const photoUrl of selectedPhotos) {
      try {
        const b64 = await urlToBase64DataUri(photoUrl);
        refImagesB64.push(b64);
      } catch (err) {
        console.error(`[Generation] Error convirtiendo foto: ${photoUrl}`, err);
      }
    }

    if (refImagesB64.length === 0) {
      throw { status: 400, message: 'No se pudieron cargar las fotos de referencia' };
    }

    // 5. Preparar directorio de salida
    const outputPath = getGenerationPath(user.email, isExplicit);
    ensureDirectoryExists(outputPath);

    // 6. Generar imagenes con Alibaba
    const numImages = data.num_images || 1;
    const actualNum = Math.max(1, Math.min(10, numImages));
    const storageUrls: string[] = [];
    const model = IMAGE_TO_IMAGE_MODEL; // Usamos Image2Image porque tenemos referencias

    console.log(`[Generation] Iniciando generacion de ${actualNum} imagenes para modelo ${data.model_user_id}`);

    for (let i = 0; i < actualNum; i++) {
      try {
        // Agregar variacion al prompt
        const variationPrompt = i < VARIATIONS.length 
          ? `${data.prompt}${VARIATIONS[i]}` 
          : data.prompt;

        // Llamar a Alibaba API
        const response = await alibabaClient.generateWanImage({
          prompt: variationPrompt,
          model,
          negativePrompt: data.negative_prompt || '',
          width: data.width || 1024,
          height: data.height || 1024,
          refImagesB64,
          n: 1,
        });

        // Extraer URLs o hacer polling si es async
        let imageUrls = extractImageUrls(response);
        const taskId = response?.output?.task_id;

        if (!imageUrls.length && taskId) {
          console.log(`[Generation] Polling task ${taskId}...`);
          const result = await pollAlibabaTask(taskId);
          imageUrls = extractImageUrls(result);
        }

        if (!imageUrls.length) {
          console.warn(`[Generation] No se obtuvo URL para imagen ${i + 1}`);
          continue;
        }

        // Descargar imagen con retry
        let imageBytes: Buffer | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            imageBytes = await alibabaClient.downloadBytes(imageUrls[0]);
            break;
          } catch (err) {
            console.warn(`[Generation] Download attempt ${attempt + 1}/3 failed`);
            if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
          }
        }

        if (!imageBytes) {
          console.error(`[Generation] Failed to download image ${i + 1}`);
          continue;
        }

        // Guardar imagen
        const ext = guessExtension(imageUrls[0], 'png');
        const fileName = `${uuidv4()}.${ext}`;
        const fullPath = path.join(outputPath, fileName);
        fs.writeFileSync(fullPath, imageBytes);

        const storageUrl = fullPath.replace(env.STORAGE_PATH, '/generadas');
        storageUrls.push(storageUrl);

        console.log(`[Generation] Imagen ${i + 1}/${actualNum} guardada: ${fileName}`);

      } catch (err: any) {
        console.error(`[Generation] Error en imagen ${i + 1}:`, err.message);
      }
    }

    if (storageUrls.length === 0) {
      throw { status: 500, message: 'No se pudo generar ninguna imagen' };
    }

    // 7. Guardar registros en la base de datos
    const createdMedia = [];
    for (const url of storageUrls) {
      const media = await prisma.media.create({
        data: {
          id: uuidv4(),
          user_id: data.model_user_id,
          storage_url: url,
          original_prompt: data.prompt,
          media_type: 'PHOTO',
          status: 'READY',
          created_at: new Date(),
        },
      });
      createdMedia.push(media);
    }

    console.log(`[Generation] Completado: ${storageUrls.length}/${actualNum} imagenes`);

    return {
      id: createdMedia[0].id,
      storage_urls: storageUrls,
      prompt: data.prompt,
      created_at: createdMedia[0].created_at.toISOString(),
      count: storageUrls.length,
    };
  }

  static async getModelGenerations(modelUserId: string, limit: number = 20) {
    return prisma.media.findMany({
      where: { user_id: modelUserId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }
}
