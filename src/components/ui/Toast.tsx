import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

const TOAST_EVENT = 'al_hidayah_toast_event';

export function showToast(message: string, type: ToastType = 'success') {
  const event = new CustomEvent<ToastMessage>(TOAST_EVENT, {
    detail: {
      id: Date.now().toString() + Math.random().toString(),
      message,
      type,
    },
  });
  window.dispatchEvent(event);
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastMessage>;
      const newToast = customEvent.detail;
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3000);
    };

    window.addEventListener(TOAST_EVENT, handleToast);
    return () => window.removeEventListener(TOAST_EVENT, handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none">
      {toasts.map((toast) => {
        const bgStyles = {
          success: 'bg-[#059669] text-white',
          error: 'bg-[#DC2626] text-white',
          info: 'bg-slate-800 text-white',
        }[toast.type];

        const Icon = {
          success: CheckCircle2,
          error: AlertCircle,
          info: Info,
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${bgStyles}`}
          >
            <div className="flex items-center gap-2.5">
              <Icon className="w-5 h-5 shrink-0" />
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="p-1 hover:opacity-75 transition-opacity rounded-lg"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4 shrink-0" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
