import { UserRepository } from '../repositories/user.repository';
import { ModelRepository } from '../repositories/model.repository';
import { CreditService } from './credit.service';
import { VendorUserResponse, CreateVendorUserDTO, UpdateVendorUserDTO } from '../types';

export class UserService {
  static serializeUser(user: any): VendorUserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      daily_limit: user.daily_limit,
      used_quota: user.used_quota,
      is_unlimited: user.is_unlimited,
      quota_reset_at: user.quota_reset_at?.toISOString() || null,
    };
  }

  static async getVendorUsers(studioId: string): Promise<VendorUserResponse[]> {
    const users = await UserRepository.findByStudioId(studioId);
    return users.map(this.serializeUser);
  }

  static async createVendorUser(studioId: string, vendor: any, data: CreateVendorUserDTO) {
    // Verificar limite de modelos
    const currentCount = await UserRepository.countByStudioId(studioId);
    if (currentCount >= vendor.max_models_limit) {
      throw { status: 403, message: `Has alcanzado el limite de ${vendor.max_models_limit} modelos permitidos.` };
    }

    // Verificar duplicados
    const existing = await UserRepository.findByEmail(data.email);
    if (existing) {
      throw { status: 409, message: 'El email ya esta registrado.' };
    }

    // Validar creditos
    const dailyLimit = data.daily_limit || 10;
    const validation = await CreditService.validateStudioCredits(studioId, dailyLimit);
    if (!validation.isValid) {
      throw { status: 400, message: validation.message };
    }

    const user = await UserRepository.create({
      email: data.email,
      name: data.name,
      role: 'MODELO',
      daily_limit: dailyLimit,
      studio_id: studioId,
      vendor_id: studioId,
    });

    return this.serializeUser(user);
  }

  static async updateVendorUser(studioId: string, userId: string, data: UpdateVendorUserDTO) {
    const user = await UserRepository.findById(userId);
    if (!user || user.studio_id !== studioId) {
      throw { status: 404, message: 'Usuario no encontrado.' };
    }

    if (data.daily_limit < user.used_quota) {
      throw { status: 400, message: `No puedes reducir la cuota por debajo de los creditos ya consumidos (${user.used_quota}).` };
    }

    // Validar creditos excluyendo el usuario actual
    const validation = await CreditService.validateStudioCredits(studioId, data.daily_limit, userId);
    if (!validation.isValid) {
      throw { status: 400, message: validation.message };
    }

    const updated = await UserRepository.updateDailyLimit(userId, data.daily_limit);

    // Sincronizar perfil si existe
    const profile = await ModelRepository.findProfileByUserId(userId);
    if (profile) {
      await ModelRepository.updateProfileImagesPerOrder(profile.id, data.daily_limit);
    }

    return this.serializeUser(updated);
  }

  static async deleteVendorUser(studioId: string, vendor: any, userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user || user.studio_id !== studioId) {
      throw { status: 404, message: 'Usuario no encontrado.' };
    }

    // Ajustar balance si hay consumo
    if (user.used_quota > 0) {
      const newBalance = Math.max(0, vendor.daily_limit - user.used_quota);
      await UserRepository.updateStudioBalance(studioId, newBalance);
    }

    await UserRepository.delete(userId);
  }
}
