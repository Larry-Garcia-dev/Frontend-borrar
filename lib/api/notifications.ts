import { BaseAPIClient } from './core';
import { NotificationListResponse } from './types';

export const createNotificationsApi = (client: BaseAPIClient) => ({
  async getNotifications(unreadOnly = false): Promise<NotificationListResponse> {
    const query = unreadOnly ? "?unread_only=true" : "";
    return client.request<NotificationListResponse>(`/notifications/${query}`);
  },
  async markNotificationRead(notificationId: string): Promise<void> {
    await client.request(`/notifications/${notificationId}/read`, { method: "POST" });
  },
  async markAllNotificationsRead(): Promise<void> {
    await client.request("/notifications/read-all", { method: "POST" });
  },
  async deleteNotification(notificationId: string): Promise<void> {
    await client.request(`/notifications/${notificationId}`, { method: "DELETE" });
  }
});