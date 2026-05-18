import { Response } from 'express';
import { AuthRequest } from '../middlewares/studio.middleware';
import { ModelService } from '../services/model.service';
import { prisma } from '../repositories/prisma.client';
import { ModelCreationRequestDTO } from '../types';

export class ModelController {
  static async requestCreation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studioId = req.user.id;
      const data: ModelCreationRequestDTO = req.body;
      const request = await ModelService.requestModelCreation(studioId, data);
      res.status(201).json(request);
    } catch (e: any) {
      res.status(e.status || 500).json({ detail: e.message });
    }
  }

  static async getMyRequests(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studioId = req.user.id;
      const requests = await ModelService.getMyRequests(studioId);
      res.json(requests);
    } catch (e: any) {
      res.status(e.status || 500).json({ detail: e.message });
    }
  }

  static async getMyModels(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studioId = req.user.id;
      const models = await ModelService.getMyModels(studioId);
      res.json(models);
    } catch (e: any) {
      res.status(e.status || 500).json({ detail: e.message });
    }
  }

  static async getModelsForSelect(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studioId = req.user.id;
      const models = await prisma.user.findMany({
        where: { studio_id: studioId, role: 'MODELO', is_active: true },
        select: {
          id: true,
          email: true,
          name: true,
          daily_limit: true,
          used_quota: true,
          is_unlimited: true,
        },
        orderBy: { name: 'asc' },
      });
      res.json(models);
    } catch (e: any) {
      res.status(500).json({ detail: e.message });
    }
  }

  static async toggleStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studioId = req.user.id;
      const profileId = req.params.profileId as string;
      const profile = await ModelService.toggleModelStatus(studioId, profileId);
      res.json(profile);
    } catch (e: any) {
      res.status(e.status || 500).json({ detail: e.message });
    }
  }
}
