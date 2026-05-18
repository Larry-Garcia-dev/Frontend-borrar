import { UserRepository } from '../repositories/user.repository';
import { ModelRepository } from '../repositories/model.repository';
import { CreditValidation, ModelInfoDTO } from '../types';

export class CreditService {
  /**
   * Valida si el estudio tiene creditos disponibles para una nueva asignacion
   */
  static async validateStudioCredits(
    studioId: string,
    requestedAmount: number,
    excludeUserId?: string
  ): Promise<CreditValidation> {
    const studio = await UserRepository.findById(studioId);
    if (!studio) {
      return { isValid: false, available: 0, requested: requestedAmount, message: 'Estudio no encontrado' };
    }

    const currentModelsSum = await UserRepository.sumDailyLimitsByStudio(studioId, excludeUserId);
    const pendingRequests = await ModelRepository.findPendingRequestsByStudio(studioId);

    const pendingSum = pendingRequests.reduce((sum, req) => {
      const info = req.model_info as ModelInfoDTO | null;
      return sum + (info?.assigned_daily_limit || 10);
    }, 0);

    const totalUsed = currentModelsSum + pendingSum;
    const available = studio.daily_limit - totalUsed;

    if (requestedAmount > available) {
      return {
        isValid: false,
        available,
        requested: requestedAmount,
        message: `Creditos insuficientes. Limite: ${studio.daily_limit}. En uso: ${totalUsed}. Disponible: ${available}`,
      };
    }

    return { isValid: true, available, requested: requestedAmount };
  }

  /**
   * Calcula creditos disponibles del estudio
   */
  static async getAvailableCredits(studioId: string): Promise<number> {
    const validation = await this.validateStudioCredits(studioId, 0);
    return validation.available;
  }
}
