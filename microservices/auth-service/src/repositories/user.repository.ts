import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export const prisma = new PrismaClient();

export class UserRepository {
  static async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  static async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  static async findPendingRequestByEmail(email: string) {
    return prisma.modelCreationRequest.findFirst({
      where: {
        model_email: email,
        status: { in: ['PENDING', 'PAYMENT_PENDING'] }
      }
    });
  }

  static async claimAccount(userId: string, passwordHash: string, name: string, phone?: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: passwordHash,
        name: name,
        phone: phone || null,
      }
    });
  }

  static async createMacondoAdmin(email: string, googleId: string, name: string, avatarUrl: string) {
    return prisma.user.create({
      data: {
        id: uuidv4(), // Inyección manual del UUID
        email,
        google_id: googleId,
        name,
        avatar_url: avatarUrl,
        role: 'MACONDO_ADMIN',
        is_approved: true,
        is_unlimited: true,
      }
    });
  }

  static async updateGoogleData(userId: string, googleId: string, name: string, avatarUrl: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        google_id: googleId,
        name,
        avatar_url: avatarUrl,
        role: 'MACONDO_ADMIN',
        is_unlimited: true,
      }
    });
  }

  static async logActivity(userId: string, action: string, ipAddress?: string, userAgent?: string, resourceType?: string) {
    return prisma.activityLog.create({
      data: {
        id: uuidv4(), // Inyección manual del UUID para asegurar la creación exitosa
        user_id: userId,
        action,
        ip_address: ipAddress,
        user_agent: userAgent,
        resource_type: resourceType,
      }
    });
  }
}