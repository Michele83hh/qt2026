import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

export interface ConfirmDialog {
  id: string;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface NotificationStore {
  notifications: Notification[];
  confirmDialog: ConfirmDialog | null;

  addNotification: (message: string, type?: NotificationType, duration?: number) => void;
  removeNotification: (id: string) => void;

  showConfirm: (config: Omit<ConfirmDialog, 'id'>) => void;
  hideConfirm: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  confirmDialog: null,

  addNotification: (message, type = 'info', duration = 5000) => {
    const id = Date.now().toString() + Math.random().toString(36);
    set((state) => ({
      notifications: [...state.notifications, { id, message, type, duration }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, duration);
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  showConfirm: (config) => {
    const id = Date.now().toString();
    set({ confirmDialog: { ...config, id } });
  },

  hideConfirm: () => {
    set({ confirmDialog: null });
  },
}));

// Helper functions for easy usage
export const notify = {
  success: (message: string) => useNotificationStore.getState().addNotification(message, 'success'),
  error: (message: string) => useNotificationStore.getState().addNotification(message, 'error'),
  warning: (message: string) => useNotificationStore.getState().addNotification(message, 'warning'),
  info: (message: string) => useNotificationStore.getState().addNotification(message, 'info'),
};

export const confirm = (
  message: string,
  onConfirm: () => void,
  options?: {
    title?: string;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
  }
) => {
  useNotificationStore.getState().showConfirm({
    title: options?.title || 'Bestätigung',
    message,
    onConfirm,
    onCancel: options?.onCancel,
    confirmText: options?.confirmText || 'Bestätigen',
    cancelText: options?.cancelText || 'Abbrechen',
    type: options?.type || 'info',
  });
};
