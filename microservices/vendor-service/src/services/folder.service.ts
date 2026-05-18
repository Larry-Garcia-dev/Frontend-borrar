import * as fs from 'fs';
import * as path from 'path';

export class FolderService {
  private static readonly BASE_PATH = 'generadas';

  /**
   * Sanitiza el email para usarlo como nombre de carpeta
   * camila@gmail.com -> camila_at_gmail_com
   */
  static sanitizeEmail(email: string): string {
    return email
      .toLowerCase()
      .trim()
      .replace(/@/g, '_at_')
      .replace(/\./g, '_');
  }

  /**
   * Asegura que un directorio existe, creandolo si es necesario
   */
  private static async ensureDirectory(dirPath: string): Promise<void> {
    const fullPath = path.resolve(dirPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  /**
   * Crea la estructura de carpetas para un modelo:
   * generadas/{email_sanitizado}/implicito/
   * generadas/{email_sanitizado}/explicito/
   */
  static async createModelFolders(modelEmail: string): Promise<void> {
    const safeEmail = this.sanitizeEmail(modelEmail);
    const basePath = path.join(this.BASE_PATH, safeEmail);

    await this.ensureDirectory(path.join(basePath, 'implicito'));
    await this.ensureDirectory(path.join(basePath, 'explicito'));
  }

  /**
   * Genera la ruta completa para guardar una imagen generada
   * generadas/{email}/{YYYY-MM-DD}/{tipo}/{filename}
   */
  static generateImagePath(modelEmail: string, isExplicit: boolean, filename: string): string {
    const safeEmail = this.sanitizeEmail(modelEmail);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const contentType = isExplicit ? 'explicito' : 'implicito';

    return path.join(this.BASE_PATH, safeEmail, dateStr, contentType, filename);
  }

  /**
   * Asegura que existen las carpetas para la fecha actual
   */
  static async ensureDateFolders(modelEmail: string, isExplicit: boolean): Promise<string> {
    const safeEmail = this.sanitizeEmail(modelEmail);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const contentType = isExplicit ? 'explicito' : 'implicito';
    
    const fullPath = path.join(this.BASE_PATH, safeEmail, dateStr, contentType);
    await this.ensureDirectory(fullPath);
    
    return fullPath;
  }
}
