import { prisma } from './prisma.client';

export class PromptRepository {
  // --- PROMPTS BASE DEL SISTEMA ---
  static async getSystemPrompts() {
    return prisma.systemPrompt.findMany({
      orderBy: { created_at: 'desc' }
    });
  }

  static async createSystemPrompt(data: any) {
    return prisma.systemPrompt.create({ data });
  }

  static async deactivateAllSystemPrompts() {
    return prisma.systemPrompt.updateMany({
      where: { is_active: true },
      data: { is_active: false }
    });
  }

  static async activateSystemPrompt(id: string) {
    return prisma.systemPrompt.update({
      where: { id },
      data: { is_active: true, updated_at: new Date() }
    });
  }

  static async deleteSystemPrompt(id: string) {
    return prisma.systemPrompt.delete({ where: { id } });
  }

  // --- PLANTILLAS DE ESTILO (TEMPLATES) ---
  static async getPromptTemplates() {
    return prisma.promptTemplate.findMany({
      orderBy: { sort_order: 'asc' }
    });
  }

  static async findTemplateById(id: string) {
    return prisma.promptTemplate.findUnique({ where: { id } });
  }

  static async createPromptTemplate(data: any) {
    return prisma.promptTemplate.create({ data });
  }

  static async updatePromptTemplate(id: string, data: any) {
    return prisma.promptTemplate.update({
      where: { id },
      data
    });
  }

  static async deletePromptTemplate(id: string) {
    return prisma.promptTemplate.delete({ where: { id } });
  }
}