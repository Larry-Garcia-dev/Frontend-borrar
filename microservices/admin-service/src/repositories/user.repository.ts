import { prisma } from './prisma.client';

export class UserRepository {
  static async getStats() {
    const totalUsers = await prisma.user.count();
    const totalMedia = await prisma.media.count();
    const adminCount = await prisma.user.count({ where: { role: 'MACONDO_ADMIN' } });
    const mediaWithCost = await prisma.media.aggregate({ _sum: { cost_usd: true } });

    return {
      total_users: totalUsers,
      total_media: totalMedia,
      admin_count: adminCount,
      total_cost_usd: mediaWithCost._sum.cost_usd ? Number(mediaWithCost._sum.cost_usd) : 0.0
    };
  }

  static async getUsers() {
    return prisma.user.findMany({ orderBy: { created_at: 'desc' } });
  }

  static async findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  static async findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  static async createUser(data: any) {
    return prisma.user.create({ data });
  }

  static async updateUser(id: string, data: any) {
    return prisma.user.update({ where: { id }, data });
  }

  static async deleteUser(id: string) {
    return prisma.user.delete({ where: { id } });
  }
  // Añade estos métodos al final de tu UserRepository
  static async getUsersCost() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        media: { select: { cost_usd: true } },
        _count: { select: { media: true } }
      }
    });

    // Mapeamos y sumamos los costos de forma segura
    return users.map(u => ({
      user_id: u.id,
      email: u.email,
      total_cost_usd: u.media.reduce((acc, m) => acc + Number(m.cost_usd || 0), 0),
      media_count: u._count.media
    })).sort((a, b) => b.total_cost_usd - a.total_cost_usd); // Ordenar por mayor gasto
  }

  static async getUserMedia(userId: string) {
    return prisma.media.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        media_type: true,
        original_prompt: true,
        storage_url: true,
        created_at: true,
        cost_usd: true,
        model_used: true
      }
    });
  }
}
