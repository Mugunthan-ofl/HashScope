import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-theme-surface border border-theme rounded-xl max-w-md w-full p-6 space-y-5 shadow-theme-lg relative transition-colors">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-theme-text-sec hover:text-theme-text transition-colors p-1 rounded-lg hover:bg-theme-surface-hover cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${isDanger ? 'bg-theme-error-bg text-theme-error-text border border-theme-error-border' : 'bg-theme-warning-bg text-theme-warning-text border border-theme-warning-border'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-theme-text">{title}</h3>
            <p className="text-xs text-theme-text-sec mt-1 font-mono leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-theme">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-theme-surface-sec hover:bg-theme-surface-hover text-theme-text-sec border border-theme rounded-lg text-xs font-mono transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
              isDanger
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-md'
                : 'bg-amber-600 hover:bg-amber-500 text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
