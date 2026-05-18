import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

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
