import multer from 'multer';

// Configuracion de multer para almacenar en memoria
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max por archivo
    files: 20, // Maximo 20 archivos por request
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se aceptan imagenes.'));
    }
  },
});
