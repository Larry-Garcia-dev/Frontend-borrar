import { Router } from 'express';
import { studioMiddleware } from '../middlewares/studio.middleware';
import { UserController } from '../controllers/user.controller';
import { ModelController } from '../controllers/model.controller';
import { UploadController } from '../controllers/upload.controller';
import { GenerationController } from '../controllers/generation.controller';
import { upload } from '../config/multer.config';

const router = Router();

// Middleware de autenticacion para todas las rutas
router.use(studioMiddleware);

// =====================
// Rutas de Usuarios
// =====================
router.get('/users', UserController.list);
router.post('/users', UserController.create);
router.patch('/users/:userId', UserController.update);
router.delete('/users/:userId', UserController.delete);

// =====================
// Rutas de Modelos
// =====================
router.post('/request-creation', ModelController.requestCreation);
router.get('/my-requests', ModelController.getMyRequests);
router.get('/my-models', ModelController.getMyModels);
router.get('/my-models-select', ModelController.getModelsForSelect);
router.post('/profiles/:profileId/toggle-status', ModelController.toggleStatus);

// =====================
// Rutas de Upload
// =====================
router.post('/upload-photos', upload.array('files', 20), UploadController.uploadPhotos);

// =====================
// Rutas de Generacion
// =====================
router.post('/generate-for-model', GenerationController.triggerGenerationFromStudio);

export default router;
