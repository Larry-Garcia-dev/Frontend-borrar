import { Router } from 'express';
import { VendorStudioController } from '../controllers/vendor.controller';
import { GenerationVendorController } from '../controllers/generation.vendor.controller';
import { studioMiddleware } from '../middlewares/studio.middleware';

const router = Router();

router.use(studioMiddleware);

// Rutas de Generación e Inyección
router.get('/my-models-select', VendorStudioController.getModelsForSelect);
router.post('/generate-for-model', GenerationVendorController.triggerGenerationFromStudio);

// Nuevas rutas de gestión de modelos portadas al microservicio
router.post('/request-creation', VendorStudioController.requestModelCreation);
router.get('/my-requests', VendorStudioController.getMyModelRequests);
router.get('/my-models', VendorStudioController.getMyModels);

export default router;