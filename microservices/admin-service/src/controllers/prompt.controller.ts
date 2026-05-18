import { Request, Response } from 'express';
import { PromptService } from '../services/prompt.service';

export class PromptController {
  // --- PROMPTS BASE ---
  static async getSystemPrompts(req: Request, res: Response) {
    try { res.json(await PromptService.getSystemPrompts()); } 
    catch (e: any) { res.status(500).json({ detail: e.message }); }
  }

  static async createSystemPrompt(req: Request, res: Response) {
    try {
      const { name, content, created_by } = req.body;
      res.status(201).json(await PromptService.createSystemPrompt(name, content, created_by));
    } catch (e: any) { res.status(400).json({ detail: e.message }); }
  }

  static async activateSystemPrompt(req: Request, res: Response) {
    try { res.json(await PromptService.activateSystemPrompt(req.params.id)); } 
    catch (e: any) { res.status(400).json({ detail: e.message }); }
  }

  static async deleteSystemPrompt(req: Request, res: Response) {
    try { await PromptService.deleteSystemPrompt(req.params.id); res.status(204).send(); } 
    catch (e: any) { res.status(400).json({ detail: e.message }); }
  }

  // --- PLANTILLAS DE ESTILO ---
  static async getPromptTemplates(req: Request, res: Response) {
    try { res.json(await PromptService.getPromptTemplates()); } 
    catch (e: any) { res.status(500).json({ detail: e.message }); }
  }

  static async createPromptTemplate(req: Request, res: Response) {
    try {
      const { name, content, description, sort_order, created_by } = req.body;
      res.status(201).json(await PromptService.createPromptTemplate(name, content, description, sort_order, created_by));
    } catch (e: any) { res.status(400).json({ detail: e.message }); }
  }

  static async togglePromptTemplate(req: Request, res: Response) {
    try { res.json(await PromptService.togglePromptTemplate(req.params.id, req.body.is_active)); } 
    catch (e: any) { res.status(400).json({ detail: e.message }); }
  }

  static async deletePromptTemplate(req: Request, res: Response) {
    try { await PromptService.deletePromptTemplate(req.params.id); res.status(204).send(); } 
    catch (e: any) { res.status(400).json({ detail: e.message }); }
  }
}