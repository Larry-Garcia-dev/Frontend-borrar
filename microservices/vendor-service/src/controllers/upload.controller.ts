import { Response } from 'express';
import { AuthRequest } from '../middlewares/studio.middleware';
import { FolderService } from '../services/folder.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export class UploadController {
  static async uploadPhotos(req: AuthRequest, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      const modelEmail = req.body.model_email;

      if (!files || files.length === 0) {
        res.status(400).json({ detail: 'Se requiere al menos un archivo.' });
        return;
      }

      const urls: string[] = [];

      // Carpeta segura basada en el email
      const safeFolder = modelEmail
        ? FolderService.sanitizeEmail(modelEmail)
        : 'unassigned';

      const folderPath = path.join('models', 'training', safeFolder);

      // Asegurar que existe la carpeta
      const fullFolderPath = path.resolve(folderPath);
      if (!fs.existsSync(fullFolderPath)) {
        fs.mkdirSync(fullFolderPath, { recursive: true });
      }

      for (const file of files) {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        const filename = `${uuidv4()}${ext}`;
        const filePath = path.join(fullFolderPath, filename);

        // Guardar archivo
        fs.writeFileSync(filePath, file.buffer);

        // Generar URL relativa
        const relativeUrl = `/${folderPath}/${filename}`.replace(/\\/g, '/');
        urls.push(relativeUrl);
      }

      res.status(201).json({ urls });
    } catch (e: any) {
      res.status(500).json({ detail: e.message });
    }
  }
}
