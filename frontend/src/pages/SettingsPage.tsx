import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { useSettings } from '../context/SettingsContext';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Settings, Server, RefreshCw, Trash2, CheckCircle2, XCircle, Wrench, Sun, Moon, LogOut } from 'lucide-react';

import { auditApi } from '../api/auditApi';
import { EngineCheckResponse } from '../api/types';

export const SettingsPage: React.FC = () => {
  const { apiUrl, setApiUrl, theme, setTheme, isBackendOnline, checkBackendHealth, logoutAdmin } = useSettings();
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
        {/* Header Title with Admin Logout */}
        <div className="bg-theme-surface border border-theme rounded-xl p-5 shadow-theme-md transition-colors flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-theme-text flex items-center gap-2">
              <Settings className="w-4 h-4 text-theme-accent" /> HashScope Settings & Setup Validation
            </h2>
            <p className="text-xs text-theme-text-sec mt-1 font-mono">
              Configure backend connection endpoints, custom cracking engine binary paths, themes, and validate CLI tool installations.
            </p>
          </div>
          <button
            type="button"
            onClick={logoutAdmin}
            className="px-3 py-1.5 bg-theme-error-bg hover:opacity-90 border border-theme-error-border text-theme-error-text rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer font-bold shrink-0 ml-4"
            title="End Admin Session"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>

        {/* Section 0: Appearance / Theme Configuration */}
        <div className="bg-theme-surface border border-theme rounded-xl p-6 space-y-4 shadow-theme-md transition-colors">
          <h3 className="text-xs font-semibold text-theme-accent uppercase tracking-wider font-mono border-b border-theme pb-2 flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-theme-accent" /> : <Sun className="w-4 h-4 text-theme-accent" />} Appearance & Theme Mode
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-theme-text">Interface Theme</p>
              <p className="text-xs text-theme-text-sec mt-0.5 font-mono">
                Switch between Dark Mode (Cyber Obsidian) and Light Mode (Enterprise Slate).
              </p>
            </div>

            <div className="flex items-center bg-theme-surface-sec p-1 rounded-lg border border-theme">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-theme-surface text-amber-400 font-bold shadow-sm border border-theme'
                    : 'text-theme-text-sec hover:text-theme-text'
                }`}
              >
                <Moon className="w-3.5 h-3.5" /> Dark Mode
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  theme === 'light'
                    ? 'bg-theme-surface text-emerald-700 font-bold shadow-sm border border-theme'
                    : 'text-theme-text-sec hover:text-theme-text'
                }`}
              >
                <Sun className="w-3.5 h-3.5" /> Light Mode
              </button>
            </div>
          </div>
        </div>

        {/* Section 1: Cracking Engine Installation & Custom Paths */}
        <div className="bg-theme-surface border border-theme rounded-xl p-6 space-y-6 shadow-theme-md transition-colors">
          <div className="flex items-center justify-between border-b border-theme pb-2">
            <h3 className="text-xs font-semibold text-theme-accent uppercase tracking-wider font-mono flex items-center gap-2">
              <Wrench className="w-4 h-4 text-theme-accent" /> Cracking Engine Installation & Path Detection
            </h3>
            <button
              type="button"
              onClick={handleCheckEngineInstallation}
              disabled={checkingEngines}
              className="px-3.5 py-1.5 bg-theme-accent hover:bg-theme-accent-hover text-white font-bold rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingEngines ? 'animate-spin' : ''}`} /> Check Engine Installation
            </button>
          </div>

          {/* Engine Status Cards */}
          <div className="grid grid-cols-1 gap-4">
            {/* Hashcat Status */}
            <div className="p-4 bg-theme-surface-sec border border-theme rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-theme-text font-mono">Hashcat Engine Status</span>
                {engineStatus?.hashcat ? (
                  engineStatus.hashcat.status === 'found' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold font-mono px-2.5 py-1 rounded bg-theme-accent-bg text-theme-accent border border-theme-accent-border">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Found ({engineStatus.hashcat.version || 'Verified'})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold font-mono px-2.5 py-1 rounded bg-theme-error-bg text-theme-error-text border border-theme-error-border">
                      <XCircle className="w-3.5 h-3.5" /> Not Found
                    </span>
                  )
                ) : (
                  <span className="text-xs text-theme-text-muted font-mono">Status unknown</span>
                )}
              </div>

              {engineStatus?.hashcat && (
                <div className="text-xs font-mono text-theme-text-sec space-y-1 pt-1 border-t border-theme">
                  {engineStatus.hashcat.binary_path ? (
                    <p className="text-theme-accent">
                      <strong>Resolved Path:</strong> {engineStatus.hashcat.binary_path}
                    </p>
                  ) : (
                    <div>
                      <p className="text-theme-error-text font-semibold mb-1">Checked Paths:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-theme-text-sec max-h-28 overflow-y-auto font-mono">
                        {engineStatus.hashcat.checked_paths.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <label className="block text-xs font-medium text-theme-text-sec mb-1 font-mono">
                  Custom Hashcat Binary Path (Optional)
                </label>
                <input
                  type="text"
                  value={hashcatPath}
                  onChange={(e) => setHashcatPath(e.target.value)}
                  placeholder="e.g. C:\hashcat\hashcat.exe or /usr/local/bin/hashcat"
                  className="w-full px-3 py-2 bg-theme-input border border-theme rounded-lg text-xs text-theme-text font-mono focus:outline-none focus:border-theme-accent"
                />
                <p className="text-[11px] text-theme-text-muted mt-1 font-mono">
                  Specify exact path if installed outside system PATH or standard folders.
                </p>
              </div>
            </div>

            {/* John the Ripper Status */}
            <div className="p-4 bg-theme-surface-sec border border-theme rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-theme-text font-mono">John the Ripper Engine Status</span>
                {engineStatus?.john ? (
                  engineStatus.john.status === 'found' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold font-mono px-2.5 py-1 rounded bg-theme-accent-bg text-theme-accent border border-theme-accent-border">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Found ({engineStatus.john.version || 'Verified'})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold font-mono px-2.5 py-1 rounded bg-theme-error-bg text-theme-error-text border border-theme-error-border">
                      <XCircle className="w-3.5 h-3.5" /> Not Found
                    </span>
                  )
                ) : (
                  <span className="text-xs text-theme-text-muted font-mono">Status unknown</span>
                )}
              </div>

              {engineStatus?.john && (
                <div className="text-xs font-mono text-theme-text-sec space-y-1 pt-1 border-t border-theme">
                  {engineStatus.john.binary_path ? (
                    <p className="text-theme-accent">
                      <strong>Resolved Path:</strong> {engineStatus.john.binary_path}
                    </p>
                  ) : (
                    <div>
                      <p className="text-theme-error-text font-semibold mb-1">Checked Paths:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-theme-text-sec max-h-28 overflow-y-auto font-mono">
                        {engineStatus.john.checked_paths.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <label className="block text-xs font-medium text-theme-text-sec mb-1 font-mono">
                  Custom John the Ripper Binary Path (Optional)
                </label>
                <input
                  type="text"
                  value={johnPath}
                  onChange={(e) => setJohnPath(e.target.value)}
                  placeholder="e.g. C:\john\run\john.exe or /usr/bin/john"
                  className="w-full px-3 py-2 bg-theme-input border border-theme rounded-lg text-xs text-theme-text font-mono focus:outline-none focus:border-theme-accent"
                />
                <p className="text-[11px] text-theme-text-muted mt-1 font-mono">
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
              className="px-5 py-2 bg-theme-accent hover:bg-theme-accent-hover text-white font-bold rounded-lg text-xs font-mono transition-all cursor-pointer shadow-sm"
            >
              Save Custom Binary Paths
            </button>
          </div>

          {engineSaveMsg && (
            <div className="p-3 rounded-lg bg-theme-accent-bg border border-theme-accent-border text-xs font-mono text-theme-accent font-semibold">
              {engineSaveMsg}
            </div>
          )}
        </div>

        {/* Section 2: Backend API Endpoint Configuration */}
        <form onSubmit={handleSaveApiUrl} className="bg-theme-surface border border-theme rounded-xl p-6 space-y-6 shadow-theme-md transition-colors">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-theme-accent uppercase tracking-wider font-mono border-b border-theme pb-2 flex items-center gap-2">
              <Server className="w-4 h-4 text-theme-accent" /> Backend API Endpoint
            </h3>

            <div>
              <label className="block text-xs font-medium text-theme-text-sec mb-1 font-mono">
                FastAPI Base URL
              </label>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="w-full px-3 py-2 bg-theme-input border border-theme rounded-lg text-xs text-theme-text font-mono focus:outline-none focus:border-theme-accent"
              />
              <p className="text-[11px] text-theme-text-muted mt-1 font-mono">
                Default: http://localhost:8000
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 bg-theme-surface-sec hover:bg-theme-surface-hover text-theme-accent border border-theme-accent-border rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} /> Test Connection
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-theme-accent hover:bg-theme-accent-hover text-white font-bold rounded-lg text-xs font-mono transition-all cursor-pointer shadow-sm"
              >
                Save Endpoint
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono font-semibold ${
                  isBackendOnline
                    ? 'bg-theme-accent-bg border-theme-accent-border text-theme-accent'
                    : 'bg-theme-error-bg border-theme-error-border text-theme-error-text'
                }`}
              >
                {testResult}
              </div>
            )}
          </div>

          {/* Maintenance & Reset */}
          <div className="pt-6 border-t border-theme space-y-4">
            <h3 className="text-xs font-semibold text-theme-accent uppercase tracking-wider font-mono border-b border-theme pb-2">
              Local Data Maintenance
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-theme-text">Clear Audit History</p>
                <p className="text-xs text-theme-text-sec font-mono">Resets local audit run history saved in browser cache.</p>
              </div>

              <button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                className="px-3 py-1.5 bg-theme-error-bg hover:opacity-90 border border-theme-error-border text-theme-error-text rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer font-bold"
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
