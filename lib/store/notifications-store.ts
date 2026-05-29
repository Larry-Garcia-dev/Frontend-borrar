"use client";

import { create } from "zustand";
import { api, Notification, NotificationListResponse } from "@/lib/api-client";

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearError: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (unreadOnly = false) => {
    set({ isLoading: true, error: null });
    try {
      const response: NotificationListResponse = await api.getNotifications(unreadOnly);
      set({
        notifications: response.notifications,
        unreadCount: response.unread_count,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar notificaciones",
        isLoading: false,
      });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      await api.markNotificationRead(notificationId);
      const notifications = get().notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      );
      const unreadCount = notifications.filter((n) => !n.is_read).length;
      set({ notifications, unreadCount });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al marcar como leida",
      });
    }
  },

  markAllAsRead: async () => {
    try {
      await api.markAllNotificationsRead();
      const notifications = get().notifications.map((n) => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString(),
      }));
      set({ notifications, unreadCount: 0 });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al marcar todas como leidas",
      });
    }
  },

  deleteNotification: async (notificationId: string) => {
    try {
      await api.deleteNotification(notificationId);
      const notifications = get().notifications.filter((n) => n.id !== notificationId);
      const unreadCount = notifications.filter((n) => !n.is_read).length;
      set({ notifications, unreadCount });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al eliminar notificacion",
      });
    }
  },

  clearError: () => set({ error: null }),
}));
