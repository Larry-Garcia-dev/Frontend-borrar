import { Router } from 'express';
import { adminMiddleware } from '../middlewares/admin.middleware';

// Importamos los Controladores de cada Módulo
import { UserController } from '../controllers/user.controller';
import { ReportController } from '../controllers/report.controller';
import { PromptController } from '../controllers/prompt.controller';

const router = Router();

// Middleware: Todas las rutas de aquí hacia abajo requieren ser MACONDO_ADMIN
router.use(adminMiddleware);

// ==========================================
// 1. MÓDULO DE USUARIOS Y ESTADÍSTICAS
// ==========================================
router.get('/stats', UserController.getStats);
router.get('/users', UserController.getUsers);
router.post('/users', UserController.createUser);
router.post('/studios', UserController.createStudio);
router.patch('/users/:id', UserController.updateUser);
router.post('/users/:id/reset-quota', UserController.resetQuota);
router.delete('/users/:id', UserController.deleteUser);

// ==========================================
// 2. MÓDULO DE REPORTES DE CALIDAD
// ==========================================
router.get('/reports', ReportController.getPendingReports);
router.post('/reports/:id/approve', ReportController.approveReport);
router.post('/reports/:id/reject', ReportController.rejectReport);

// ==========================================
// 3. MÓDULO DE PROMPTS Y PLANTILLAS
// ==========================================
// Prompt Base (System Prompts)
router.get('/prompts', PromptController.getSystemPrompts);
router.post('/prompts', PromptController.createSystemPrompt);
router.post('/prompts/:id/activate', PromptController.activateSystemPrompt);
router.delete('/prompts/:id', PromptController.deleteSystemPrompt);

// Plantillas de Usuario (Templates)
router.get('/prompt-templates', PromptController.getPromptTemplates);
router.post('/prompt-templates', PromptController.createPromptTemplate);
router.patch('/prompt-templates/:id', PromptController.togglePromptTemplate);
router.delete('/prompt-templates/:id', PromptController.deletePromptTemplate);
router.get('/users-cost', UserController.getUsersCost);
router.get('/users/:id/media', UserController.getUserMedia);

export default router;