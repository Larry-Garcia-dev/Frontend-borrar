import { prisma } from '../repositories/prisma.client';

export class ModelsAdminService {
  static async getPendingRequests() {
    return prisma.modelCreationRequest.findMany({
      where: { status: { in: ['PENDING', 'PAYMENT_PENDING'] } },
      orderBy: { created_at: 'asc' }
    });
  }

  static async approveRequest(requestId: string, adminId: string) {
    const request = await prisma.modelCreationRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Solicitud no encontrada");
    if (request.status !== 'PENDING' && request.status !== 'PAYMENT_PENDING') {
      throw new Error("Esta solicitud ya fue procesada");
    }

    // Lógica de validación de pago
    if (request.payment_required && !request.payment_completed) {
      await prisma.modelCreationRequest.update({
        where: { id: requestId },
        data: { status: 'PAYMENT_PENDING' }
      });
      // TODO: Disparar notificación al estudio sobre pago pendiente
      return { message: "Solicitud aprobada. Pendiente de pago.", status: "PAYMENT_PENDING" };
    }

    // 1. Crear el Usuario (Modelo)
    const assignedLimit = (request.model_info as any)?.assigned_daily_limit || 10;
    
    // Usamos transacción para garantizar que se creen ambos registros
    const [modelUser, _] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: request.model_email,
          name: request.model_name,
          phone: request.model_phone,
          role: 'MODELO',
          user_type: 'STUDIO_MODEL',
          studio_id: request.studio_id,
          daily_limit: Number(assignedLimit),
          is_approved: true,
          approved_at: new Date(),
          approved_by_id: adminId,
        }
      }),
      // 2. Marcar la solicitud como completada
      prisma.modelCreationRequest.update({
        where: { id: requestId },
        data: { 
          status: 'COMPLETED', 
          reviewed_by_id: adminId, 
          reviewed_at: new Date() 
        }
      })
    ]);

    // 3. Crear el Perfil (ModelProfile)
    await prisma.modelProfile.create({
      data: {
        user_id: modelUser.id,
        studio_id: request.studio_id,
        display_name: request.model_name,
        training_photos: request.training_photos || [],
        is_explicit: request.is_explicit,
        explicit_training_photos: request.explicit_training_photos || [],
        images_per_order: Number(assignedLimit),
        status: 'APPROVED',
        age: (request.model_info as any)?.age,
        gender: (request.model_info as any)?.gender,
      }
    });

    // TODO: Disparar notificación de aprobación al Estudio
    return { message: "Modelo creada exitosamente", user_id: modelUser.id };
  }

  static async rejectRequest(requestId: string, adminId: string, reason: string) {
    if (!reason || reason.length < 10) throw new Error("Debe proporcionar una razón detallada");
    
    return prisma.modelCreationRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejection_reason: reason,
        reviewed_by_id: adminId,
        reviewed_at: new Date()
      }
    });
  }

  static async confirmPayment(requestId: string) {
    return prisma.modelCreationRequest.update({
      where: { id: requestId },
      data: {
        payment_completed: true,
        payment_completed_at: new Date(),
        status: 'PENDING' // Vuelve a PENDING para que el admin genere el perfil
      }
    });
  }
}
