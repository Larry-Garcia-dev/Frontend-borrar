import { PromptRepository } from '../repositories/prompt.repository';

export class PromptService {
  // --- PROMPTS BASE ---
  static async getSystemPrompts() {
    return PromptRepository.getSystemPrompts();
  }

  static async createSystemPrompt(name: string, content: string, createdBy: string = 'admin') {
    return PromptRepository.createSystemPrompt({
      name,
      content,
      created_by: createdBy,
      is_active: false // Siempre inician inactivos por seguridad
    });
  }

  static async activateSystemPrompt(promptId: string) {
    await PromptRepository.deactivateAllSystemPrompts();
    return PromptRepository.activateSystemPrompt(promptId);
  }

  static async deleteSystemPrompt(promptId: string) {
    return PromptRepository.deleteSystemPrompt(promptId);
  }

  // --- PLANTILLAS DE ESTILO ---
  static async getPromptTemplates() {
    return PromptRepository.getPromptTemplates();
  }

  static async createPromptTemplate(name: string, content: string, description?: string, sortOrder: number = 0, createdBy: string = 'admin') {
    return PromptRepository.createPromptTemplate({
      name,
      content,
      description: description || null,
      sort_order: sortOrder,
      is_active: true,
      created_by: createdBy
    });
  }

  static async togglePromptTemplate(templateId: string, isActive: boolean) {
    const template = await PromptRepository.findTemplateById(templateId);
    if (!template) throw new Error("Plantilla no encontrada");

    return PromptRepository.updatePromptTemplate(templateId, { is_active: isActive });
  }

  static async deletePromptTemplate(templateId: string) {
    return PromptRepository.deletePromptTemplate(templateId);
  }
}