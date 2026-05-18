import { UserRepository } from '../repositories/user.repository';
import { ModelRepository } from '../repositories/model.repository';
import { CreditService } from './credit.service';
import { FolderService } from './folder.service';
import { ModelCreationRequestDTO, ModelCreationRequestResponse, ModelProfileResponse, ModelInfoDTO } from '../types';

export class ModelService {
  static serializeRequest(req: any): ModelCreationRequestResponse {
    return {
      id: req.id,
      studio_id: req.studio_id,
      model_email: req.model_email,
      model_name: req.model_name,
      model_phone: req.model_phone,
      training_photos: req.training_photos as string[],
      is_explicit: req.is_explicit,
      explicit_training_photos: req.explicit_training_photos as string[],
      model_info: req.model_info as ModelInfoDTO | null,
      status: req.status,
      payment_required: req.payment_required,
      payment_amount_usd: req.payment_amount_usd ? Number(req.payment_amount_usd) : null,
      payment_completed: req.payment_completed,
      rejection_reason: req.rejection_reason,
      created_at: req.created_at.toISOString(),
    };
  }

  static serializeProfile(profile: any): ModelProfileResponse {
    return {
      id: profile.id,
      user_id: profile.user_id,
      studio_id: profile.studio_id,
      display_name: profile.display_name,
      bio: profile.bio,
      age: profile.age,
      gender: profile.gender,
      ethnicity: profile.ethnicity,
      hair_color: profile.hair_color,
      eye_color: profile.eye_color,
      height_cm: profile.height_cm,
      training_photos: profile.training_photos as string[],
      is_explicit: profile.is_explicit,
      explicit_training_photos: profile.explicit_training_photos as string[],
      ai_model_id: profile.ai_model_id,
      status: profile.status,
      rejection_reason: profile.rejection_reason,
      images_per_order: profile.images_per_order,
      created_at: profile.created_at.toISOString(),
    };
  }

  static async requestModelCreation(studioId: string, data: ModelCreationRequestDTO) {
    // Verificar email duplicado
    const existing = await UserRepository.findByEmail(data.model_email);
    if (existing) {
      throw { status: 400, message: 'Este email ya esta registrado' };
    }

    // Validar fotos de entrenamiento
    if (!data.training_photos || data.training_photos.length < 5) {
      throw { status: 400, message: 'Se requieren al menos 5 fotos de entrenamiento' };
    }

    // Validar fotos explicitas
    if (data.is_explicit && (!data.explicit_training_photos || data.explicit_training_photos.length < 8)) {
      throw { status: 400, message: 'Se requieren 8 fotos explicitas cuando is_explicit es True' };
    }

    // Validar creditos
    const assignedLimit = data.model_info?.assigned_daily_limit || 10;
    const validation = await CreditService.validateStudioCredits(studioId, assignedLimit);
    if (!validation.isValid) {
      throw { status: 400, message: validation.message };
    }

    const request = await ModelRepository.createRequest({
      studio_id: studioId,
      model_email: data.model_email,
      model_name: data.model_name,
      model_phone: data.model_phone,
      training_photos: data.training_photos,
      is_explicit: !!data.is_explicit,
      explicit_training_photos: data.is_explicit ? data.explicit_training_photos || [] : [],
      model_info: data.model_info,
    });

    // Crear carpetas de uploads para el modelo
    await FolderService.createModelFolders(data.model_email);

    return this.serializeRequest(request);
  }

  static async getMyRequests(studioId: string) {
    const requests = await ModelRepository.findRequestsByStudio(studioId);
    return requests.map(this.serializeRequest);
  }

  static async getMyModels(studioId: string) {
    const profiles = await ModelRepository.findProfilesByStudio(studioId);
    return profiles.map(this.serializeProfile);
  }

  static async toggleModelStatus(studioId: string, profileId: string) {
    const profile = await ModelRepository.findProfileById(profileId);
    if (!profile || profile.studio_id !== studioId) {
      throw { status: 404, message: 'Perfil no encontrado' };
    }

    const activeStatuses = ['ACTIVE', 'APPROVED', 'READY'];
    let newStatus: string;

    if (activeStatuses.includes(profile.status)) {
      newStatus = 'SUSPENDED';
    } else if (profile.status === 'SUSPENDED') {
      newStatus = 'ACTIVE';
    } else {
      throw { status: 400, message: `No se puede cambiar el estado actual (${profile.status})` };
    }

    const updated = await ModelRepository.updateProfileStatus(profileId, newStatus);
    return this.serializeProfile(updated);
  }
}
