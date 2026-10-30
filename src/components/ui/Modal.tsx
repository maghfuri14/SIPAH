import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ModalShellProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  icon,
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-lg',
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      aria-hidden="true"
    />
    <div
      role="dialog"
      aria-modal="true"
      className={`relative z-10 flex max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-none bg-white shadow-2xl sm:rounded-2xl`}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup modal"
          className="ml-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
      {footer && (
        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          {footer}
        </div>
      )}
    </div>
  </div>
);

export const modalInputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-emerald-500';

export const modalLabelClass = 'mb-1 block text-sm font-medium text-slate-900';

export const ModalFooterButtons: React.FC<{
  onCancel: () => void;
  submitLabel: string;
  submitType?: 'submit' | 'button';
  onSubmit?: () => void;
  danger?: boolean;
}> = ({ onCancel, submitLabel, submitType = 'submit', onSubmit, danger = false }) => (
  <div className="flex justify-end gap-3">
    <button
      type="button"
      onClick={onCancel}
      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
    >
      Batal
    </button>
    <button
      type={submitType}
      onClick={onSubmit}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white ${
        danger
          ? 'bg-red-600 hover:bg-red-700'
          : 'bg-emerald-600 hover:bg-emerald-700'
      }`}
    >
      {!danger && <CheckCircle2 className="h-4 w-4" />}
      <span>{submitLabel}</span>
    </button>
  </div>
);
