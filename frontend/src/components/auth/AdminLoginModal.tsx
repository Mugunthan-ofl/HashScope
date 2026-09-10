import React, { useState } from 'react';
import { ShieldAlert, KeyRound, X, Loader2 } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { loginAdmin } = useSettings();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the admin password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await loginAdmin(password);
      setPassword('');
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Invalid admin password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-surface border border-theme rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-theme pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-theme-accent-bg border border-theme-accent-border text-theme-accent">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-theme-text font-mono">Admin Authentication</h3>
              <p className="text-[11px] text-theme-text-sec font-mono">Enter password to unlock system settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-theme-text-sec hover:text-theme-text hover:bg-theme-surface-hover transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-theme-error-bg border border-theme-error-border text-theme-error-text text-xs font-mono font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-theme-text-sec mb-1.5 font-mono">
              Admin Secret Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              autoFocus
              className="w-full px-3.5 py-2.5 bg-theme-input border border-theme rounded-lg text-xs text-theme-text font-mono focus:outline-none focus:border-theme-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-theme-surface-sec hover:bg-theme-surface-hover text-theme-text-sec rounded-lg text-xs font-mono transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-theme-accent hover:bg-theme-accent-hover text-white font-bold rounded-lg text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
                </>
              ) : (
                'Unlock Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginModal;
