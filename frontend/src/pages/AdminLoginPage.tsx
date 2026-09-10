import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { KeyRound, ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { Layout } from '../components/layout/Layout';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loginAdmin } = useSettings();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated as admin, redirect to /settings
  if (isAdmin) {
    return <Navigate to="/settings" replace />;
  }

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
      // On successful login, navigate to /settings
      navigate('/settings', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid admin password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="System Administration Login">
      <div className="max-w-md mx-auto my-12 font-sans">
        <div className="bg-theme-surface border border-theme rounded-xl p-6 shadow-theme-md space-y-6 transition-all">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-theme pb-4">
            <div className="p-2.5 rounded-xl bg-theme-accent-bg border border-theme-accent-border text-theme-accent shadow-sm">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-theme-text font-mono">Admin Portal Authentication</h2>
              <p className="text-xs text-theme-text-sec mt-0.5 font-mono">
                Enter master administrative credentials to access system settings.
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-lg bg-theme-error-bg border border-theme-error-border text-theme-error-text text-xs font-mono font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-theme-text-sec mb-1.5 font-mono">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoFocus
                className="w-full px-3.5 py-2.5 bg-theme-input border border-theme rounded-lg text-xs text-theme-text font-mono focus:outline-none focus:border-theme-accent shadow-inner"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-3.5 py-2 text-theme-text-sec hover:text-theme-text text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-theme-accent hover:bg-theme-accent-hover text-white font-bold rounded-lg text-xs font-mono flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Authenticating...
                  </>
                ) : (
                  'Login to Settings'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default AdminLoginPage;
