import { create } from 'zustand';

interface UIState {
  // Modals
  activeModal: string | null;
  modalData: Record<string, unknown> | null;

  // Sidebar
  sidebarCollapsed: boolean;

  // Theme
  theme: 'dark' | 'light';

  // Toasts
  toasts: Toast[];

  // Actions
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (toastId: string) => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export const useUIStore = create<UIState>((set, get) => ({
  activeModal: null,
  modalData: null,
  sidebarCollapsed: false,
  theme: 'dark',
  toasts: [],

  openModal: (modalId, data) => {
    set({ activeModal: modalId, modalData: data || null });
  },

  closeModal: () => {
    set({ activeModal: null, modalData: null });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setTheme: (theme) => {
    set({ theme });
    // Update document class for Tailwind dark mode
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },

  showToast: (toast) => {
    const id = `toast-${Date.now()}`;
    const newToast: Toast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-dismiss after duration
    const duration = toast.duration || 5000;
    setTimeout(() => {
      get().dismissToast(id);
    }, duration);
  },

  dismissToast: (toastId) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== toastId),
    }));
  },
}));
