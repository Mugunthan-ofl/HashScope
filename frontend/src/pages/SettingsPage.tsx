import React, { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { useSettings } from '../context/SettingsContext';
import { Settings, Server, RefreshCw, Trash2, Cpu } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { apiUrl, setApiUrl, demoMode, setDemoMode, isBackendOnline, checkBackendHealth } = useSettings();
  const [inputUrl, setInputUrl] = useState(apiUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setApiUrl(inputUrl);
    setTestResult('Settings saved successfully.');
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const online = await checkBackendHealth();
    setTesting(false);
    if (online) {
      setTestResult('Connection test successful! Backend service is online and healthy.');
    } else {
      setTestResult('Connection test failed. Unable to reach FastAPI backend at ' + inputUrl);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear local audit run history?')) {
      localStorage.removeItem('hashscope_audit_history');
      window.location.reload();
    }
  };

  return (
    <Layout title="System & API Configuration">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="bg-[#101719] border border-[#1b282a] rounded-xl p-5 shadow-lg shadow-black/40">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#10b981]" /> HashScope Settings
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage FastAPI backend connection endpoint, execution modes, and application preferences.
          </p>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="bg-[#101719] border border-[#1b282a] rounded-xl p-6 space-y-6 shadow-lg shadow-black/40">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-[#10b981] uppercase tracking-wider font-mono border-b border-[#1b282a] pb-2 flex items-center gap-2">
              <Server className="w-4 h-4 text-[#10b981]" /> Backend API Endpoint
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 font-mono">
                FastAPI Base URL
              </label>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="w-full px-3 py-2 bg-[#0a0f11] border border-[#1b282a] rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-[#10b981]"
              />
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                Default: http://localhost:8000
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 bg-[#0e2224] hover:bg-[#132d30] text-[#10b981] border border-[#1b3235] rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} /> Test Connection
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-[#10b981] hover:bg-[#34d399] text-[#0a0f11] font-bold rounded-lg text-xs font-mono transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              >
                Save Settings
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono ${
                  isBackendOnline
                    ? 'bg-[#0a2e27]/60 border-[#10b981]/50 text-[#10b981]'
                    : 'bg-red-950/40 border-red-800 text-red-300'
                }`}
              >
                {testResult}
              </div>
            )}
          </div>

          {/* Demo Mode Toggle Section */}
          <div className="pt-6 border-t border-[#1b282a] space-y-4">
            <h3 className="text-xs font-semibold text-[#10b981] uppercase tracking-wider font-mono border-b border-[#1b282a] pb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#10b981]" /> Execution Modes
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-200">Demo Mode</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enables simulated mock cracking execution without requiring real Hashcat/John CLI binaries. (Off by default)
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={demoMode}
                  onChange={(e) => setDemoMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#0a0f11] border border-[#1b282a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10b981] peer-checked:after:bg-[#0a0f11]"></div>
              </label>
            </div>
          </div>

          {/* Maintenance & Reset */}
          <div className="pt-6 border-t border-[#1b282a] space-y-4">
            <h3 className="text-xs font-semibold text-[#10b981] uppercase tracking-wider font-mono border-b border-[#1b282a] pb-2">
              Local Data Maintenance
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-200">Clear Audit History</p>
                <p className="text-xs text-slate-500">Resets local audit run history saved in browser cache.</p>
              </div>

              <button
                type="button"
                onClick={handleClearHistory}
                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear History
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default SettingsPage;
