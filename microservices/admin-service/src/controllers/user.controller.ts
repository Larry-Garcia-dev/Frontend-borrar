import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  static async getStats(req: Request, res: Response) {
    try { res.json(await UserService.getStats()); } 
    catch (e: any) { res.status(500).json({ detail: e.message }); }
  }

  static async getUsers(req: Request, res: Response) {
    try { res.json(await UserService.getUsers()); } 
    catch (e: any) { res.status(500).json({ detail: e.message }); }
  }

  static async createUser(req: Request, res: Response) {
    try { res.status(201).json(await UserService.createUser(req.body)); } 
    catch (e: any) { res.status(400).json({ detail: e.message }); }
  }

  static async createStudio(req: Request, res: Response) {
    try {
      const { email, name, max_models_limit, daily_limit } = req.body;
      res.status(201).json(await UserService.createStudio(email, name, max_models_limit, daily_limit));
    } catch (e: any) { res.status(400).json({ detail: e.message }); }
  }

  static async updateUser(req: Request, res: Response) {
    try { res.json(await UserService.updateUser(req.params.id, req.body)); } 
    catch (e: any) { res.status(400).json({ detail: e.message }); }
  }

  static async resetQuota(req: Request, res: Response) {
    try { res.json(await UserService.resetQuota(req.params.id)); } 
    catch (e: any) { res.status(400).json({ detail: e.message }); }
  }

  static async deleteUser(req: Request, res: Response) {
    try { await UserService.deleteUser(req.params.id); res.status(204).send(); } 
    catch (e: any) { res.status(400).json({ detail: e.message }); }
  }

  // Añade estos métodos al UserController
  static async getUsersCost(req: Request, res: Response) {
    try { res.json(await UserService.getUsersCost()); } 
    catch (e: any) { res.status(500).json({ detail: e.message }); }
  }

  static async getUserMedia(req: Request, res: Response) {
    try { res.json(await UserService.getUserMedia(req.params.id)); } 
    catch (e: any) { res.status(500).json({ detail: e.message }); }
  }
}