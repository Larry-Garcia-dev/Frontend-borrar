"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  AlertTriangle,
  CreditCard,
  Image,
  UserPlus,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationsStore } from "@/lib/store/notifications-store";
import { formatDistanceToNow } from "@/lib/utils";
import { Notification } from "@/lib/api-client";
import { useRouter } from "next/navigation"; // <- Añadir

const notificationIcons: Record<string, React.ElementType> = {
  REPORT_STATUS: AlertTriangle,
  BALANCE_LOW: CreditCard,
  PAYMENT_RECEIVED: CreditCard,
  MODEL_REQUEST_STATUS: UserPlus,
  GENERATION_COMPLETE: Image,
  SYSTEM: Info,
};

const notificationColors: Record<string, string> = {
  REPORT_STATUS: "text-amber-500",
  BALANCE_LOW: "text-red-500",
  PAYMENT_RECEIVED: "text-green-500",
  MODEL_REQUEST_STATUS: "text-blue-500",
  GENERATION_COMPLETE: "text-purple-500",
  SYSTEM: "text-muted-foreground",
};

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter(); // <- Añadir
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationsStore();

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => fetchNotifications(), 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    // Navegar al panel si es un reporte
    if (notification.related_entity_type === "REPORT") {
      router.push("/admin/reports");
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-xl border bg-card shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b p-4">
                <h3 className="font-semibold">Notificaciones</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="h-8 text-xs"
                    >
                      <CheckCheck className="mr-1 h-3 w-3" />
                      Marcar todas
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Notifications list */}
              <div className="max-h-96 overflow-y-auto">
                {isLoading && notifications.length === 0 ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                    <Bell className="mb-2 h-8 w-8" />
                    <p>No tienes notificaciones</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => {
                      const Icon = notificationIcons[notification.notification_type] || Info;
                      const iconColor = notificationColors[notification.notification_type] || "text-muted-foreground";

                      return (
                        <div
                          key={notification.id}
                          className={`group relative flex gap-3 p-4 transition-colors hover:bg-muted/50 ${
                            !notification.is_read ? "bg-primary/5" : ""
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className={`mt-0.5 ${iconColor}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium ${!notification.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                              )}
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at))}
                            </p>
                          </div>
                          <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1">
                            {!notification.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
