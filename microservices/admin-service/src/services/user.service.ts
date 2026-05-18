import { UserRepository } from '../repositories/user.repository';

export class UserService {
  static async getStats() {
    return UserRepository.getStats();
  }

  static async getUsers() {
    const users = await UserRepository.getUsers();
    return users.map(u => ({
      id: u.id, email: u.email, name: u.name, role: u.role,
      daily_limit: u.daily_limit, used_quota: u.used_quota,
      is_unlimited: u.is_unlimited, max_models_limit: u.max_models_limit,
      studio_id: u.studio_id
    }));
  }

  static async createUser(data: any) {
    const existing = await UserRepository.findUserByEmail(data.email);
    if (existing) throw new Error("El email ya está registrado");

    const role = (data.role || 'MODELO').toUpperCase();
    return UserRepository.createUser({
      email: data.email,
      name: data.name,
      role: role,
      daily_limit: data.daily_limit ?? 10,
      max_models_limit: data.max_models_limit ?? 5,
      is_unlimited: !!data.is_unlimited,
      is_approved: true,
      is_active: true
    });
  }

  static async createStudio(email: string, name: string, maxModelsLimit = 5, dailyLimit = 100) {
    const existing = await UserRepository.findUserByEmail(email);
    if (existing) throw new Error("El email ya está registrado");

    return UserRepository.createUser({
      email, name, role: 'ESTUDIO_ADMIN',
      daily_limit: dailyLimit, max_models_limit: maxModelsLimit,
      is_unlimited: false, is_approved: true, is_active: true
    });
  }

  static async updateUser(userId: string, data: any) {
    const user = await UserRepository.findUserById(userId);
    if (!user) throw new Error("Usuario no encontrado");
    return UserRepository.updateUser(userId, data);
  }

  static async resetQuota(userId: string) {
    return UserRepository.updateUser(userId, { used_quota: 0 });
  }

  static async deleteUser(userId: string) {
    await UserRepository.deleteUser(userId);
    return true;
  }
}