import { Request, Response } from 'express';
import { ReportService } from '../services/report.service';

export class ReportController {
  static async getPendingReports(req: Request, res: Response) {
    try { res.json(await ReportService.getPendingReports()); } 
    catch (e: any) { res.status(500).json({ detail: e.message }); }
  }

  static async approveReport(req: Request, res: Response) {
    try { res.json(await ReportService.approveReport(req.params.id)); } 
    catch (e: any) { res.status(400).json({ detail: e.message }); }
  }

  static async rejectReport(req: Request, res: Response) {
    try { res.json(await ReportService.rejectReport(req.params.id, req.body.admin_note)); } 
    catch (e: any) { res.status(400).json({ detail: e.message }); }
  }
}