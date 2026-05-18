import { prisma } from './prisma.client';

export class UserRepository {
  static async findByStudioId(studioId: string) {
    return prisma.user.findMany({
      where: { studio_id: studioId },
      orderBy: { created_at: 'desc' },
    });
  }

  static async findById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  }

  static async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  static async countByStudioId(studioId: string): Promise<number> {
    return prisma.user.count({ where: { studio_id: studioId } });
  }

  static async sumDailyLimitsByStudio(studioId: string, excludeUserId?: string): Promise<number> {
    const result = await prisma.user.aggregate({
      where: {
        studio_id: studioId,
        ...(excludeUserId && { id: { not: excludeUserId } }),
      },
      _sum: { daily_limit: true },
    });
    return result._sum.daily_limit || 0;
  }

  static async create(data: {
    email: string;
    name?: string;
    role: string;
    daily_limit: number;
    studio_id: string;
    vendor_id: string;
  }) {
    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        daily_limit: data.daily_limit,
        studio_id: data.studio_id,
        vendor_id: data.vendor_id,
        used_quota: 0,
      },
    });
  }

  static async updateDailyLimit(userId: string, dailyLimit: number) {
    return prisma.user.update({
      where: { id: userId },
      data: { daily_limit: dailyLimit },
    });
  }

  static async delete(userId: string) {
    return prisma.user.delete({ where: { id: userId } });
  }

  static async updateStudioBalance(studioId: string, newDailyLimit: number) {
    return prisma.user.update({
      where: { id: studioId },
      data: { daily_limit: newDailyLimit },
    });
  }
}
