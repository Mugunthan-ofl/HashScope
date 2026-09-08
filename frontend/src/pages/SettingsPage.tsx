import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { useSettings } from '../context/SettingsContext';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Settings, Server, RefreshCw, Trash2, Cpu, CheckCircle2, XCircle, Wrench } from 'lucide-react';


import { auditApi } from '../api/auditApi';
import { EngineCheckResponse } from '../api/types';

export const SettingsPage: React.FC = () => {
  const { apiUrl, setApiUrl, demoMode, setDemoMode, isBackendOnline, checkBackendHealth } = useSettings();
  const [inputUrl, setInputUrl] = useState(apiUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Custom Engine Paths & Detection State
  const [hashcatPath, setHashcatPath] = useState('');
  const [johnPath, setJohnPath] = useState('');
  const [checkingEngines, setCheckingEngines] = useState(false);
  const [engineStatus, setEngineStatus] = useState<EngineCheckResponse | null>(null);
  const [engineSaveMsg, setEngineSaveMsg] = useState<string | null>(null);

  // Load engine config and status on page mount
  useEffect(() => {
    if (isBackendOnline) {
      loadEngineData();
    }
  }, [isBackendOnline]);

  const loadEngineData = async () => {
    try {
      setCheckingEngines(true);
      const config = await auditApi.getEngineConfig();
      setHashcatPath(config.hashcat_binary_path || '');
      setJohnPath(config.john_binary_path || '');

      const checkRes = await auditApi.checkEngines();
      setEngineStatus(checkRes);
    } catch {
      // Backend may be offline or initializing
    } finally {
      setCheckingEngines(false);
    }
  };

  const handleSaveApiUrl = (e: React.FormEvent) => {
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
      loadEngineData();
    } else {
      setTestResult('Connection test failed. Unable to reach FastAPI backend at ' + inputUrl);
    }
  };

  const handleCheckEngineInstallation = async () => {
    setCheckingEngines(true);
    setEngineSaveMsg(null);
    try {
      const checkRes = await auditApi.updateEngineConfig({
        hashcat_binary_path: hashcatPath,
        john_binary_path: johnPath,
      });
      setEngineStatus(checkRes);
      setEngineSaveMsg('Engine binary detection scan complete.');
    } catch (err: any) {
      setEngineSaveMsg('Failed to check engine installation: ' + (err.message || 'Unknown error'));
    } finally {
      setCheckingEngines(false);
    }
  };

  const handleConfirmClear = () => {
    localStorage.removeItem('hashscope_audit_history');
    setIsConfirmOpen(false);
    window.location.reload();
  };

  return (
    <Layout title="System & API Configuration">
      <div className="max-w-3xl mx-auto space-y-6 font-sans">
        {/* Header Title */}
        <div className="bg-[#101719] border border-[#1b282a] rounded-xl p-5 shadow-lg shadow-black/40">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#10b981]" /> HashScope Settings & Setup Validation
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure backend connection endpoints, custom cracking engine binary paths, and validate CLI tool installations.
          </p>
        </div>

        {/* Section 1: Cracking Engine Installation & Custom Paths */}
        <div className="bg-[#101719] border border-[#1b282a] rounded-xl p-6 space-y-6 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between border-b border-[#1b282a] pb-2">
            <h3 className="text-xs font-semibold text-[#10b981] uppercase tracking-wider font-mono flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#10b981]" /> Cracking Engine Installation & Path Detection
            </h3>
            <button
              type="button"
              onClick={handleCheckEngineInstallation}
              disabled={checkingEngines}
              className="px-3.5 py-1.5 bg-[#10b981] hover:bg-[#34d399] text-[#0a0f11] font-bold rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)] shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingEngines ? 'animate-spin' : ''}`} /> Check Engine Installation
            </button>
          </div>

          {/* Engine Status Cards */}
          <div className="grid grid-cols-1 gap-4">
            {/* Hashcat Status */}
            <div className="p-4 bg-[#0a0f11] border border-[#1b282a] rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 font-mono">Hashcat Engine Status</span>
                {engineStatus?.hashcat ? (
                  engineStatus.hashcat.status === 'found' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold font-mono px-2.5 py-1 rounded bg-[#0a2e27] text-[#10b981] border border-[#10b981]/40">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Found ({engineStatus.hashcat.version || 'Verified'})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold font-mono px-2.5 py-1 rounded bg-red-950/60 text-red-300 border border-red-800">
                      <XCircle className="w-3.5 h-3.5" /> Not Found
                    </span>
                  )
                ) : (
                  <span className="text-xs text-slate-500 font-mono">Status unknown</span>
                )}
              </div>

              {engineStatus?.hashcat && (
                <div className="text-xs font-mono text-slate-400 space-y-1 pt-1 border-t border-[#1b282a]">
                  {engineStatus.hashcat.binary_path ? (
                    <p className="text-[#10b981]">
                      <strong>Resolved Path:</strong> {engineStatus.hashcat.binary_path}
                    </p>
                  ) : (
                    <div>
                      <p className="text-red-400 font-semibold mb-1">Checked Paths:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400 max-h-28 overflow-y-auto">
                        {engineStatus.hashcat.checked_paths.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-300 mb-1 font-mono">
                  Custom Hashcat Binary Path (Optional)
                </label>
                <input
                  type="text"
                  value={hashcatPath}
                  onChange={(e) => setHashcatPath(e.target.value)}
                  placeholder="e.g. C:\hashcat\hashcat.exe or /usr/local/bin/hashcat"
                  className="w-full px-3 py-2 bg-[#101719] border border-[#1b282a] rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-[#10b981]"
                />
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Specify exact path if installed outside system PATH or standard folders.
                </p>
              </div>
            </div>

            {/* John the Ripper Status */}
            <div className="p-4 bg-[#0a0f11] border border-[#1b282a] rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 font-mono">John the Ripper Engine Status</span>
                {engineStatus?.john ? (
                  engineStatus.john.status === 'found' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold font-mono px-2.5 py-1 rounded bg-[#0a2e27] text-[#10b981] border border-[#10b981]/40">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Found ({engineStatus.john.version || 'Verified'})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold font-mono px-2.5 py-1 rounded bg-red-950/60 text-red-300 border border-red-800">
                      <XCircle className="w-3.5 h-3.5" /> Not Found
                    </span>
                  )
                ) : (
                  <span className="text-xs text-slate-500 font-mono">Status unknown</span>
                )}
              </div>

              {engineStatus?.john && (
                <div className="text-xs font-mono text-slate-400 space-y-1 pt-1 border-t border-[#1b282a]">
                  {engineStatus.john.binary_path ? (
                    <p className="text-[#10b981]">
                      <strong>Resolved Path:</strong> {engineStatus.john.binary_path}
                    </p>
                  ) : (
                    <div>
                      <p className="text-red-400 font-semibold mb-1">Checked Paths:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400 max-h-28 overflow-y-auto">
                        {engineStatus.john.checked_paths.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-300 mb-1 font-mono">
                  Custom John the Ripper Binary Path (Optional)
                </label>
                <input
                  type="text"
                  value={johnPath}
                  onChange={(e) => setJohnPath(e.target.value)}
                  placeholder="e.g. C:\john\run\john.exe or /usr/bin/john"
                  className="w-full px-3 py-2 bg-[#101719] border border-[#1b282a] rounded-lg text-xs text-slate-200 font-mono focus:outline-none focus:border-[#10b981]"
                />
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Specify exact path if installed outside system PATH or standard folders.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleCheckEngineInstallation}
              disabled={checkingEngines}
              className="px-5 py-2 bg-[#10b981] hover:bg-[#34d399] text-[#0a0f11] font-bold rounded-lg text-xs font-mono transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            >
              Save Custom Binary Paths
            </button>
          </div>

          {engineSaveMsg && (
            <div className="p-3 rounded-lg bg-[#0a2e27]/60 border border-[#10b981]/50 text-xs font-mono text-[#10b981]">
              {engineSaveMsg}
            </div>
          )}
        </div>

        {/* Section 2: Backend API Endpoint Configuration */}
        <form onSubmit={handleSaveApiUrl} className="bg-[#101719] border border-[#1b282a] rounded-xl p-6 space-y-6 shadow-lg shadow-black/40">
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
                Save Endpoint
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
                <p className="text-xs font-semibold text-slate-200">Demo Simulation Mode</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Forces mock cracking engine simulation for quick demo previews without requiring CLI binaries.
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
                onClick={() => setIsConfirmOpen(true)}
                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear History
              </button>
            </div>
          </div>
        </form>

        <ConfirmModal
          isOpen={isConfirmOpen}
          title="Clear Stored Audit History?"
          message="Are you sure you want to delete all local audit run history entries from your browser cache? This action cannot be undone."
          confirmLabel="Delete Audit History"
          onConfirm={handleConfirmClear}
          onCancel={() => setIsConfirmOpen(false)}
        />
      </div>
    </Layout>
  );
};

export default SettingsPage;
