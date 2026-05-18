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
    console.log('[generation-service] ========== STARTING GENERATION ==========');
    console.log('[generation-service] Studio ID:', studioId);
    console.log('[generation-service] Model User ID:', data.model_user_id);
    console.log('[generation-service] Prompt:', data.prompt?.substring(0, 100) + '...');
    console.log('[generation-service] Is Explicit:', data.is_explicit);
    console.log('[generation-service] Num Images:', data.num_images);
    console.log('[generation-service] Size:', data.width, 'x', data.height);

    // 1. Buscar perfil de la modelo
    console.log('[generation-service] Step 1: Looking for model profile...');
    const profile = await prisma.modelProfile.findFirst({
      where: { user_id: data.model_user_id },
    });

    if (!profile) {
      console.error('[generation-service] ERROR: Model profile not found for user:', data.model_user_id);
      throw { status: 404, message: 'Perfil de modelo no encontrado' };
    }
    console.log('[generation-service] Found profile:', profile.id, '- Display name:', profile.display_name);

    // Verificar que el perfil pertenece al estudio
    if (profile.studio_id !== studioId) {
      console.error('[generation-service] ERROR: Studio mismatch - Profile studio:', profile.studio_id, '- Request studio:', studioId);
      throw { status: 403, message: 'No tienes permiso para generar imagenes de esta modelo' };
    }

    // Verificar estado del perfil
    const activeStatuses = ['APPROVED', 'ACTIVE', 'READY'];
    if (!activeStatuses.includes(profile.status)) {
      console.error('[generation-service] ERROR: Model not active - Status:', profile.status);
      throw { status: 400, message: `La modelo no esta activa (estado: ${profile.status})` };
    }
    console.log('[generation-service] Profile status OK:', profile.status);

    // 2. Buscar usuario (modelo)
    console.log('[generation-service] Step 2: Looking for user...');
    const user = await prisma.user.findUnique({ where: { id: data.model_user_id } });
    if (!user) {
      console.error('[generation-service] ERROR: User not found:', data.model_user_id);
      throw { status: 404, message: 'Usuario modelo no encontrado' };
    }
    console.log('[generation-service] Found user:', user.email);

    // 3. Seleccionar fotos de entrenamiento al azar
    console.log('[generation-service] Step 3: Selecting training photos...');
    const isExplicit = data.is_explicit && profile.is_explicit;
    const trainingPhotos = isExplicit 
      ? (profile.explicit_training_photos as string[]) 
      : (profile.training_photos as string[]);

    console.log('[generation-service] Using explicit photos:', isExplicit);
    console.log('[generation-service] Available training photos:', trainingPhotos?.length || 0);

    if (!trainingPhotos || trainingPhotos.length === 0) {
      console.error('[generation-service] ERROR: No training photos available');
      throw { status: 400, message: 'La modelo no tiene fotos de entrenamiento' };
    }

    // Seleccionar hasta 4 fotos al azar
    const numPhotos = Math.min(4, trainingPhotos.length);
    const selectedPhotos = shuffleArray(trainingPhotos).slice(0, numPhotos);
    console.log('[generation-service] Selected', selectedPhotos.length, 'random photos for reference');

    // 4. Convertir fotos a base64
    console.log('[generation-service] Step 4: Converting photos to base64...');
    const refImagesB64: string[] = [];
    for (const photoUrl of selectedPhotos) {
      try {
        console.log('[generation-service] Converting:', photoUrl.substring(0, 50) + '...');
        const b64 = await urlToBase64DataUri(photoUrl);
        refImagesB64.push(b64);
        console.log('[generation-service] Converted successfully, base64 length:', b64.length);
      } catch (err: any) {
        console.error('[generation-service] Error converting photo:', photoUrl, err.message);
      }
    }

    if (refImagesB64.length === 0) {
      console.error('[generation-service] ERROR: No photos could be converted to base64');
      throw { status: 400, message: 'No se pudieron cargar las fotos de referencia' };
    }
    console.log('[generation-service] Successfully converted', refImagesB64.length, 'photos to base64');

    // 5. Preparar directorio de salida
    console.log('[generation-service] Step 5: Preparing output directory...');
    const outputPath = getGenerationPath(user.email, isExplicit);
    ensureDirectoryExists(outputPath);
    console.log('[generation-service] Output path:', outputPath);

    // 6. Generar imagenes con Alibaba
    const numImages = data.num_images || 1;
    const actualNum = Math.max(1, Math.min(10, numImages));
    const storageUrls: string[] = [];
    const model = IMAGE_TO_IMAGE_MODEL;

    console.log('[generation-service] Step 6: Starting Alibaba image generation...');
    console.log('[generation-service] Using model:', model);
    console.log('[generation-service] Generating', actualNum, 'images');

    for (let i = 0; i < actualNum; i++) {
      console.log(`[generation-service] --- Image ${i + 1}/${actualNum} ---`);
      try {
        // Agregar variacion al prompt
        const variationPrompt = i < VARIATIONS.length 
          ? `${data.prompt}${VARIATIONS[i]}` 
          : data.prompt;
        console.log('[generation-service] Variation prompt:', variationPrompt.substring(0, 80) + '...');

        // Llamar a Alibaba API
        console.log('[generation-service] Calling Alibaba API...');
        const response = await alibabaClient.generateWanImage({
          prompt: variationPrompt,
          model,
          negativePrompt: data.negative_prompt || '',
          width: data.width || 1024,
          height: data.height || 1024,
          refImagesB64,
          n: 1,
        });
        console.log('[generation-service] Alibaba response received');

        // Extraer URLs o hacer polling si es async
        let imageUrls = extractImageUrls(response);
        const taskId = response?.output?.task_id;
        console.log('[generation-service] Initial URLs found:', imageUrls.length, '- Task ID:', taskId || 'N/A');

        if (!imageUrls.length && taskId) {
          console.log('[generation-service] No immediate URLs, polling task...');
          const result = await pollAlibabaTask(taskId);
          imageUrls = extractImageUrls(result);
          console.log('[generation-service] After polling, URLs found:', imageUrls.length);
        }

        if (!imageUrls.length) {
          console.warn('[generation-service] WARNING: No URL obtained for image', i + 1);
          continue;
        }

        // Descargar imagen con retry
        console.log('[generation-service] Downloading image from:', imageUrls[0].substring(0, 60) + '...');
        let imageBytes: Buffer | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            imageBytes = await alibabaClient.downloadBytes(imageUrls[0]);
            console.log('[generation-service] Download successful, size:', imageBytes.length, 'bytes');
            break;
          } catch (err: any) {
            console.warn(`[generation-service] Download attempt ${attempt + 1}/3 failed:`, err.message);
            if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
          }
        }

        if (!imageBytes) {
          console.error('[generation-service] ERROR: Failed to download image', i + 1);
          continue;
        }

        // Guardar imagen
        const ext = guessExtension(imageUrls[0], 'png');
        const fileName = `${uuidv4()}.${ext}`;
        const fullPath = path.join(outputPath, fileName);
        fs.writeFileSync(fullPath, imageBytes);

        const storageUrl = fullPath.replace(env.STORAGE_PATH, '/generadas');
        storageUrls.push(storageUrl);

        console.log(`[generation-service] Image ${i + 1}/${actualNum} SAVED: ${fileName}`);

      } catch (err: any) {
        console.error(`[generation-service] ERROR in image ${i + 1}:`, err.message);
      }
    }

    if (storageUrls.length === 0) {
      console.error('[generation-service] ERROR: No images could be generated');
      throw { status: 500, message: 'No se pudo generar ninguna imagen' };
    }

    // 7. Guardar registros en la base de datos
    console.log('[generation-service] Step 7: Saving to database...');
    const createdMedia = [];
    for (const url of storageUrls) {
      const media = await prisma.media.create({
        data: {
          id: uuidv4(),
          user_id: data.model_user_id,
          storage_url: url,
          prompt: data.prompt,
          original_prompt: data.prompt,
          media_type: 'PHOTO',
          edit_count: 0,
          is_approved: false,
          created_at: new Date(),
        },
      });
      createdMedia.push(media);
      console.log('[generation-service] Saved media record:', media.id);
    }

    console.log('[generation-service] ========== GENERATION COMPLETE ==========');
    console.log('[generation-service] Total images generated:', storageUrls.length, '/', actualNum);

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
