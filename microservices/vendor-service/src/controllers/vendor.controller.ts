import { Response } from 'express';
import { prisma } from '../repositories/prisma.client';
import { AuthRequest } from '../middlewares/studio.middleware';

export class VendorStudioController {
  // Rellenar el selector "Todo en Uno"
  static async getModelsForSelect(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studioId = req.user.id;
      const models = await prisma.user.findMany({
        where: { studio_id: studioId, role: 'MODELO', is_active: true },
        select: { 
          id: true, email: true, name: true,
          daily_limit: true, used_quota: true, is_unlimited: true
        },
        orderBy: { name: 'asc' }
      });
      res.json(models);
    } catch (e: any) {
      res.status(500).json({ detail: e.message });
    }
  }

  // Crear solicitud de nueva modelo
  static async requestModelCreation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studioId = req.user.id;
      const { model_email, model_name, model_phone, training_photos, is_explicit, explicit_training_photos, model_info } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email: model_email } });
      if (existingUser) {
        res.status(400).json({ detail: "Este email ya está registrado" });
        return;
      }

      const request = await prisma.modelCreationRequest.create({
        data: {
          studio_id: studioId,
          model_email,
          model_name,
          model_phone,
          training_photos: training_photos || [],
          is_explicit: !!is_explicit,
          explicit_training_photos: is_explicit ? explicit_training_photos : [],
          model_info: model_info || {},
          status: 'PENDING',
          payment_required: true,
          payment_amount_usd: 50.00,
          payment_completed: false
        }
      });
      res.status(201).json(request);
    } catch (e: any) {
      res.status(500).json({ detail: e.message });
    }
  }

  // Obtener solicitudes enviadas por el estudio
  static async getMyModelRequests(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studioId = req.user.id;
      const requests = await prisma.modelCreationRequest.findMany({
        where: { studio_id: studioId },
        orderBy: { created_at: 'desc' }
      });
      res.json(requests);
    } catch (e: any) {
      res.status(500).json({ detail: e.message });
    }
  }

  // Obtener perfiles activos creados por el estudio
  static async getMyModels(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studioId = req.user.id;
      const profiles = await prisma.modelProfile.findMany({
        where: { studio_id: studioId },
        orderBy: { created_at: 'desc' }
      });
      res.json(profiles);
    } catch (e: any) {
      res.status(500).json({ detail: e.message });
    }
  }
}