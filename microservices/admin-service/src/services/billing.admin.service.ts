import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class BillingAdminService {
  static async getAllBalances(skip = 0, limit = 100) {
    const balances = await prisma.userBalance.findMany({
      skip, take: limit,
      include: {
        user: { select: { id: true, email: true, name: true, role: true } }
      },
      orderBy: { balance_usd: 'asc' }
    });
    return balances;
  }

  static async recordTransaction(adminId: string, targetUserId: string, amountUsd: number, description: string, type: 'PAYMENT' | 'ADJUSTMENT') {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new Error("Usuario no encontrado");

    const record = await prisma.billingRecord.create({
      data: {
        user_id: targetUser.id,
        studio_id: targetUser.studio_id,
        record_type: type,
        description,
        amount_usd: type === 'PAYMENT' ? -Math.abs(amountUsd) : amountUsd, // Pagos restan a la deuda
        created_by_id: adminId
      }
    });

    // Recalcular balance
    await this.updateUserBalance(targetUser.id);
    return record;
  }

  // Método auxiliar para sincronizar el balance
  static async updateUserBalance(userId: string) {
    const records = await prisma.billingRecord.findMany({ where: { user_id: userId } });
    
    let costs = 0;
    let payments = 0;

    records.forEach(r => {
      const amount = Number(r.amount_usd);
      if (amount > 0) costs += amount;
      if (amount < 0) payments += Math.abs(amount);
    });

    return prisma.userBalance.upsert({
      where: { user_id: userId },
      update: {
        total_costs_usd: costs,
        total_payments_usd: payments,
        balance_usd: payments - costs,
        last_updated_at: new Date()
      },
      create: {
        user_id: userId,
        total_costs_usd: costs,
        total_payments_usd: payments,
        balance_usd: payments - costs
      }
    });
  }

  static async getActivityLog(skip = 0, limit = 100) {
    return prisma.activityLog.findMany({
      skip, take: limit,
      orderBy: { created_at: 'desc' }
    });
  }
}