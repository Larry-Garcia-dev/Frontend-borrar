import { Response } from 'express';
import { AuthRequest } from '../middlewares/studio.middleware';
import { UserService } from '../services/user.service';
import { CreateVendorUserDTO, UpdateVendorUserDTO } from '../types';

export class UserController {
  static async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studioId = req.user.id;
      const users = await UserService.getVendorUsers(studioId);
      res.json(users);
    } catch (e: any) {
      res.status(e.status || 500).json({ detail: e.message });
    }
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studioId = req.user.id;
      const data: CreateVendorUserDTO = req.body;
      const user = await UserService.createVendorUser(studioId, req.user, data);
      res.status(201).json(user);
    } catch (e: any) {
      res.status(e.status || 500).json({ detail: e.message });
    }
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studioId = req.user.id;
      const userId = req.params.userId as string;
      const data: UpdateVendorUserDTO = req.body;
      const user = await UserService.updateVendorUser(studioId, userId, data);
      res.json(user);
    } catch (e: any) {
      res.status(e.status || 500).json({ detail: e.message });
    }
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const studioId = req.user.id;
      const userId = req.params.userId as string;
      await UserService.deleteVendorUser(studioId, req.user, userId);
      res.status(204).send();
    } catch (e: any) {
      res.status(e.status || 500).json({ detail: e.message });
    }
  }
}
