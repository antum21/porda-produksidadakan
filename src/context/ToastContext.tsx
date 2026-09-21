import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = 'toast-' + Math.random().toString(36).substring(2, 9);
      const duration = toast.duration || 4000;
      const newItem: ToastItem = { ...toast, id, duration };

      setToasts((prev) => [newItem, ...prev.slice(0, 4)]); // Keep max 5

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'success', title, message });
    },
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'error', title, message, duration: 6000 });
    },
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'warning', title, message, duration: 5000 });
    },
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'info', title, message });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, removeToast }}>
      {children}
      
      {/* Toast Overlay Container */}
      <div
        id="toast-notification-root"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const isSuccess = t.type === 'success';
            const isError = t.type === 'error';
            const isWarning = t.type === 'warning';

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                className={`pointer-events-auto rounded-2xl p-3.5 shadow-xl border backdrop-blur-md flex items-start gap-3 relative overflow-hidden ${
                  isSuccess
                    ? 'bg-white/95 border-emerald-200 text-slate-800 shadow-emerald-500/10'
                    : isError
                    ? 'bg-white/95 border-red-200 text-slate-800 shadow-red-500/10'
                    : isWarning
                    ? 'bg-white/95 border-amber-200 text-slate-800 shadow-amber-500/10'
                    : 'bg-white/95 border-blue-200 text-slate-800 shadow-blue-500/10'
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    isSuccess
                      ? 'bg-emerald-100 text-emerald-600'
                      : isError
                      ? 'bg-red-100 text-red-600'
                      : isWarning
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {isSuccess && <CheckCircle2 className="w-4 h-4" />}
                  {isError && <AlertCircle className="w-4 h-4" />}
                  {isWarning && <AlertTriangle className="w-4 h-4" />}
                  {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{t.title}</h4>
                  {t.message && <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{t.message}</p>}
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Progress countdown indicator */}
                {t.duration && t.duration > 0 && (
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: t.duration / 1000, ease: 'linear' }}
                    className={`absolute bottom-0 left-0 h-0.5 ${
                      isSuccess
                        ? 'bg-emerald-500'
                        : isError
                        ? 'bg-red-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                    }`}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
