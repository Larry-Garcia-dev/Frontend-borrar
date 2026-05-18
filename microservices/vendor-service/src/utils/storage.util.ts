import { v4 as uuidv4 } from 'uuid';

export class StorageUtil {
  /**
   * Genera la ruta exacta: generadas/{correo}/{AAAA-MM-DD}/{tipo}/{uuid}.{ext}
   */
  static generateDynamicPath(modelEmail: string, isExplicit: boolean, extension: string = 'png'): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Carpeta según el tipo de contenido
    const contentTypeFolder = isExplicit ? 'explicito' : 'implicito';
    
    // Limpiamos el email para evitar problemas en las URLs de S3/OSS
    const safeEmail = modelEmail.toLowerCase().trim().replace(/@/g, '_at_').replace(/\./g, '_');

    return `generadas/${safeEmail}/${dateStr}/${contentTypeFolder}/${uuidv4()}.${extension}`;
  }
}