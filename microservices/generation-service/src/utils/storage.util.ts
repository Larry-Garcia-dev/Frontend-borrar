import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';
import sharp from 'sharp';

const DASHSCOPE_MAX_BYTES = 9 * 1024 * 1024; // 9MB
const MAX_DIMENSION = 1920;

export function sanitizeEmail(email: string): string {
  return email.toLowerCase()
    .replace(/@/g, '_at_')
    .replace(/\./g, '_');
}

export function getTodayFolder(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getGenerationPath(email: string, isExplicit: boolean): string {
  const sanitized = sanitizeEmail(email);
  const dateFolder = getTodayFolder();
  const contentType = isExplicit ? 'explicito' : 'implicito';
  return path.join(env.STORAGE_PATH, sanitized, dateFolder, contentType);
}

export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function generateFileName(): string {
  return `${uuidv4()}.png`;
}

export function selectRandomPhotos(photos: string[], count: number = 4): string[] {
  const shuffled = [...photos].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, photos.length));
}

/**
 * Convierte una URL de imagen local o remota a Data URI Base64 compatible con DashScope.
 * Redimensiona si excede el limite de 9MB.
 * 
 * TRAINING_PHOTOS_PATH debe apuntar a la carpeta raiz donde estan las fotos.
 * Por ejemplo: ../vendor-service/models/training
 */
export async function urlToBase64DataUri(url: string): Promise<string> {
  let imageBuffer: Buffer;

  console.log('[storage-util] urlToBase64DataUri called with:', url);
  console.log('[storage-util] TRAINING_PHOTOS_PATH:', env.TRAINING_PHOTOS_PATH);
  
  // Resolver TRAINING_PHOTOS_PATH a ruta absoluta
  const trainingBasePath = path.resolve(process.cwd(), env.TRAINING_PHOTOS_PATH);
  console.log('[storage-util] Resolved training base path:', trainingBasePath);

  // Si es URL local (archivo en el servidor)
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith(env.TRAINING_PHOTOS_PATH)) {
    let localPath: string;
    
    // La URL viene como /models/training/user/file.jpg
    // Necesitamos construir la ruta real usando TRAINING_PHOTOS_PATH
    if (url.startsWith('/models/training/')) {
      // Extraer la parte despues de /models/training/
      const relativePart = url.replace('/models/training/', '');
      localPath = path.join(trainingBasePath, relativePart);
    } else if (url.startsWith('/media/')) {
      localPath = path.join(trainingBasePath, url.replace('/media/', ''));
    } else if (url.startsWith('./')) {
      localPath = path.resolve(process.cwd(), url);
    } else if (url.startsWith('/')) {
      // Otras rutas absolutas
      const relativePart = url.substring(1); // quitar el /
      localPath = path.join(trainingBasePath, relativePart);
    } else {
      localPath = path.resolve(process.cwd(), url);
    }
    
    // Normalizar la ruta para el sistema operativo
    localPath = path.normalize(localPath);
    
    console.log('[storage-util] Resolved local path:', localPath);
    console.log('[storage-util] File exists:', fs.existsSync(localPath));
    
    if (!fs.existsSync(localPath)) {
      throw new Error(`Archivo no encontrado: ${localPath}`);
    }
    imageBuffer = fs.readFileSync(localPath);
    console.log('[storage-util] File read successfully, size:', imageBuffer.length);
  } else if (url.startsWith('http')) {
    // URL remota
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error descargando imagen: ${response.status}`);
    }
    imageBuffer = Buffer.from(await response.arrayBuffer());
  } else {
    throw new Error(`URL no soportada: ${url}`);
  }

  // Si el tamaño es aceptable, retornar directamente
  if (imageBuffer.length <= DASHSCOPE_MAX_BYTES) {
    const base64 = imageBuffer.toString('base64');
    const mime = getMimeType(url) || 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  }

  // Redimensionar si es muy grande
  let img = sharp(imageBuffer);
  const metadata = await img.metadata();
  
  if (metadata.width && metadata.height) {
    const maxDim = Math.max(metadata.width, metadata.height);
    if (maxDim > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / maxDim;
      img = img.resize(
        Math.round(metadata.width * scale),
        Math.round(metadata.height * scale)
      );
    }
  }

  // Comprimir como JPEG
  let quality = 85;
  let outputBuffer: Buffer;
  
  do {
    outputBuffer = await img.jpeg({ quality }).toBuffer();
    quality -= 15;
  } while (outputBuffer.length > DASHSCOPE_MAX_BYTES && quality >= 20);

  const base64 = outputBuffer.toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

function getMimeType(url: string): string {
  const ext = path.extname(url).toLowerCase();
  const mimes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  return mimes[ext] || 'image/jpeg';
}
