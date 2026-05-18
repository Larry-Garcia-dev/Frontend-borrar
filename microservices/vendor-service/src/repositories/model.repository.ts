import { prisma } from './prisma.client';
import { Prisma } from '@prisma/client';
import { ModelInfoDTO } from '../types';

export class ModelRepository {
  static async createRequest(data: {
    studio_id: string;
    model_email: string;
    model_name: string;
    model_phone?: string;
    training_photos: string[];
    is_explicit: boolean;
    explicit_training_photos: string[];
    model_info?: ModelInfoDTO;
  }) {
    return prisma.modelCreationRequest.create({
      data: {
        studio_id: data.studio_id,
        model_email: data.model_email,
        model_name: data.model_name,
        model_phone: data.model_phone,
        training_photos: data.training_photos,
        is_explicit: data.is_explicit,
        explicit_training_photos: data.explicit_training_photos,
        model_info: (data.model_info || {}) as Prisma.InputJsonValue,
        status: 'PENDING',
        payment_required: true,
        payment_amount_usd: 50.0,
        payment_completed: false,
      },
    });
  }

  static async findRequestsByStudio(studioId: string) {
    return prisma.modelCreationRequest.findMany({
      where: { studio_id: studioId },
      orderBy: { created_at: 'desc' },
    });
  }

  static async findPendingRequestsByStudio(studioId: string) {
    return prisma.modelCreationRequest.findMany({
      where: {
        studio_id: studioId,
        status: { in: ['PENDING', 'PAYMENT_PENDING'] },
      },
    });
  }

  static async findProfilesByStudio(studioId: string) {
    return prisma.modelProfile.findMany({
      where: { studio_id: studioId },
      orderBy: { created_at: 'desc' },
    });
  }

  static async findProfileById(profileId: string) {
    return prisma.modelProfile.findUnique({ where: { id: profileId } });
  }

  static async updateProfileStatus(profileId: string, status: string) {
    return prisma.modelProfile.update({
      where: { id: profileId },
      data: { status },
    });
  }

  static async findProfileByUserId(userId: string) {
    return prisma.modelProfile.findFirst({ where: { user_id: userId } });
  }

  static async updateProfileImagesPerOrder(profileId: string, imagesPerOrder: number) {
    return prisma.modelProfile.update({
      where: { id: profileId },
      data: { images_per_order: imagesPerOrder },
    });
  }
}
