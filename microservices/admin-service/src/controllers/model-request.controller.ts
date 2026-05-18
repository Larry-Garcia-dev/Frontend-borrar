import { Request, Response } from 'express';
import { ModelsAdminService } from '../services/models.admin.service';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export class ModelRequestController {
  static async getPendingRequests(req: Request, res: Response) {
    try {
      const requests = await ModelsAdminService.getPendingRequests();
      res.json(requests);
    } catch (e: any) {
      res.status(500).json({ detail: e.message });
    }
  }

  static async approveRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminId = req.user?.id || 'unknown';
      const result = await ModelsAdminService.approveRequest(id, adminId);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ detail: e.message });
    }
  }

  static async rejectRequest(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminId = req.user?.id || 'unknown';
      const reason = req.query.reason as string || req.body.reason;
      
      if (!reason) {
        res.status(400).json({ detail: 'Debe proporcionar una razon' });
        return;
      }
      
      const result = await ModelsAdminService.rejectRequest(id, adminId, reason);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ detail: e.message });
    }
  }

  static async confirmPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await ModelsAdminService.confirmPayment(id);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ detail: e.message });
    }
  }
}
