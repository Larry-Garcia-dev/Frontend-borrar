import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class NotificationsAdminController {
  static async sendNotification(req: Request, res: Response) {
    try {
      const { user_id, title, message, notification_type, related_entity_type, related_entity_id } = req.body;
      
      const notification = await prisma.notification.create({
        data: {
          user_id,
          title,
          message,
          notification_type: notification_type || 'SYSTEM',
          related_entity_type,
          related_entity_id
        }
      });

      res.status(201).json(notification);
    } catch (e: any) {
      res.status(400).json({ detail: e.message });
    }
  }
}