import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { EngineGuidanceAlert } from '../components/common/EngineGuidanceAlert';
import { auditApi } from '../api/auditApi';
import { AuditConfig } from '../api/types';
import { useSettings } from '../context/SettingsContext';
import { Play, RotateCw, FileCode } from 'lucide-react';

const SAMPLE_PASSWORDS = [
  'password',
  '123456',
  'admin',
  'qwerty123456',
  'P@ssw0rd123!',
  'SuperSecurePass2026!',
];

export const NewAuditPage: React.FC = () => {
  const navigate = useNavigate();
  const { saveAuditToHistory, updateAuditHistoryItem, demoMode } = useSettings();

  const [algorithm, setAlgorithm] = useState<'md5' | 'sha1' | 'sha256' | 'ntlm' | 'bcrypt'>('md5');
  const [engine, setEngine] = useState<'mock' | 'hashcat' | 'john'>(demoMode ? 'mock' : 'hashcat');
  const [passwordsText, setPasswordsText] = useState<string>(SAMPLE_PASSWORDS.join('\n'));

  const [availableWordlists, setAvailableWordlists] = useState<string[]>([
    'rockyou.txt',
    'default.txt',
    'top1000.txt',
    'passwords.txt',
  ]);
  const [wordlistName, setWordlistName] = useState<string>('rockyou.txt');
  const [contextWordsText, setContextWordsText] = useState<string>('AcmeCorp, admin');
  const [minLength, setMinLength] = useState<number>(12);

  const [submitting, setSubmitting] = useState(false);
  const [pollStatus, setPollStatus] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch wordlists dynamically from backend on page load
  useEffect(() => {
    auditApi
      .getWordlists()
      .then((lists) => {
        if (lists && lists.length > 0) {
          setAvailableWordlists(lists);
          setWordlistName(lists[0]);
        }
      })
      .catch(() => {
        // Fallback to default options
      });
  }, []);

  const handleLoadSamples = () => {
    setPasswordsText(SAMPLE_PASSWORDS.join('\n'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const passwordsList = passwordsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (passwordsList.length === 0) {
      setError('Please enter at least one test password sample string to audit.');
      return;
    }

    const contextWords = contextWordsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const config: AuditConfig = {
      algorithm,
      engine,
      passwords: passwordsList,
      wordlist_name: wordlistName,
      context_words: contextWords,
      min_password_length: minLength,
    };

    setSubmitting(true);
    setPollStatus('Submitting audit request...');

    try {
      // 1. Trigger Audit
      const initialStatus = await auditApi.createAudit(config);
      const auditId = initialStatus.audit_id;

      // Save initial state to history context
      saveAuditToHistory({
        audit_id: auditId,
        created_at: new Date().toISOString(),
        algorithm,
        engine,
        status: 'pending',
        total_hashes: passwordsList.length,
      });

      setPollStatus('Audit job queued. Executing pipeline...');

      // 2. Poll Status until completion
      let completed = false;
      let attempts = 0;

      while (!completed && attempts < 30) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 500));

        const statusRes = await auditApi.getAuditStatus(auditId);
        setProgressPct(statusRes.progress_percent);
        setPollStatus(`Status: ${statusRes.status} (${statusRes.progress_percent}%)`);

        if (statusRes.status === 'completed') {
          completed = true;
          try {
            const finalReport = await auditApi.getAuditReport(auditId);
            updateAuditHistoryItem(auditId, {
              status: 'completed',
              cracked_count: finalReport.summary.cracked_count,
              total_hashes: finalReport.summary.total_hashes,
            });
          } catch {
            updateAuditHistoryItem(auditId, { status: 'completed' });
          }
          break;
        } else if (statusRes.status === 'failed') {
          updateAuditHistoryItem(auditId, { status: 'failed' });
          throw new Error(statusRes.error_message || 'Audit pipeline execution failed.');
        }
      }

      // 3. Redirect to Report Page
      navigate(`/audit/${auditId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to execute audit job.');
      setSubmitting(false);
    }
  };

  return (
    <Layout title="Configure New Password Policy Audit">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="bg-theme-surface border border-theme rounded-xl p-5 shadow-theme-md transition-colors">
          <h2 className="text-base font-bold text-theme-text flex items-center gap-2">
            <Play className="w-4 h-4 text-theme-accent" /> New Audit Execution Setup
          </h2>
          <p className="text-xs text-theme-text-sec mt-1 font-mono">
            Configure hash algorithm, cracking engine mode, and test password samples for automated evaluation.
          </p>
        </div>

        {error && (
          <div className="space-y-2">
            {error.includes('not found') || error.includes('Checked:') || error.includes('Hashcat') || error.includes('John') ? (
              <EngineGuidanceAlert
                errorMessage={error}
                onRetry={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                onSwitchToMock={() => {
                  setEngine('mock');
                  setError(null);
                }}
              />
            ) : (
              <ErrorAlert message={error} onRetry={() => setError(null)} />
            )}
          </div>
        )}

        {/* Polling / Processing Modal overlay */}
        {submitting && (
          <div className="bg-theme-surface border border-theme-accent-border rounded-xl p-6 text-center space-y-4 animate-pulse transition-colors">
            <div className="w-10 h-10 rounded-full bg-theme-accent-bg border border-theme-accent-border flex items-center justify-center text-theme-accent mx-auto">
              <RotateCw className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-theme-text font-mono">{pollStatus}</h3>
              <p className="text-xs text-theme-text-sec mt-1 font-mono">
                Running pipeline: Hash Generation → Cracking → Scoring → Policy Checks → Reporting
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-theme-surface-sec rounded-full h-2 overflow-hidden border border-theme max-w-md mx-auto">
              <div
                className="bg-theme-accent h-full transition-all duration-300 shadow-sm"
                style={{ width: `${progressPct}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-theme-surface border border-theme rounded-xl p-6 space-y-6 shadow-theme-md transition-colors">
          {/* Section 1: Engine & Algorithm */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-theme-accent uppercase tracking-wider font-mono border-b border-theme pb-2">
              1. Engine & Hash Specification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-theme-text-sec mb-1 font-mono">
                  Execution Engine
                </label>
                <select
                  value={engine}
                  onChange={(e: any) => setEngine(e.target.value)}
                  className="w-full px-3 py-2 bg-theme-input border border-theme rounded-lg text-xs text-theme-text font-mono focus:outline-none focus:border-theme-accent cursor-pointer"
                >
                  <option value="hashcat">Hashcat CLI Engine</option>
                  <option value="john">John the Ripper CLI Engine</option>
                  <option value="mock">Mock Engine (Demo Simulation Mode)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-text-sec mb-1 font-mono">
                  Hash Algorithm
                </label>
                <select
                  value={algorithm}
                  onChange={(e: any) => setAlgorithm(e.target.value)}
                  className="w-full px-3 py-2 bg-theme-input border border-theme rounded-lg text-xs text-theme-text font-mono focus:outline-none focus:border-theme-accent uppercase cursor-pointer"
                >
                  <option value="md5">MD5</option>
                  <option value="sha1">SHA-1</option>
                  <option value="sha256">SHA-256</option>
                  <option value="ntlm">NTLM (Windows NT Hash)</option>
                  <option value="bcrypt">bcrypt (Blowfish Crypt)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Test Password Samples Input */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-theme pb-2">
              <h3 className="text-xs font-semibold text-theme-accent uppercase tracking-wider font-mono">
                2. Test Password Samples
              </h3>
              <button
                type="button"
                onClick={handleLoadSamples}
                className="text-[11px] font-mono text-theme-accent hover:text-theme-accent-hover flex items-center gap-1 cursor-pointer transition-colors"
              >
                <FileCode className="w-3.5 h-3.5" /> Load Lab Sample Set
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-theme-text-sec mb-1 font-mono">
                Test Password Samples (One per line)
              </label>
              <textarea
                rows={6}
                value={passwordsText}
                onChange={(e) => setPasswordsText(e.target.value)}
                placeholder="Enter test password sample strings to generate hashes and audit..."
                className="w-full p-3 bg-theme-input border border-theme rounded-lg text-xs text-theme-text font-mono focus:outline-none focus:border-theme-accent resize-y"
              />
            </div>
          </div>

          {/* Section 3: Wordlist & Context Options */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-theme-accent uppercase tracking-wider font-mono border-b border-theme pb-2">
              3. Context & Dictionary Settings
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-theme-text-sec mb-1 font-mono">
                  Dictionary Wordlist Selection
                </label>
                <select
                  value={wordlistName}
                  onChange={(e) => setWordlistName(e.target.value)}
                  className="w-full px-3 py-2 bg-theme-input border border-theme rounded-lg text-xs text-theme-text font-mono focus:outline-none focus:border-theme-accent cursor-pointer"
                >
                  {availableWordlists.map((wl) => (
                    <option key={wl} value={wl}>
                      {wl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-theme-text-sec mb-1 font-mono">
                  Context Words (Comma separated)
                </label>
                <input
                  type="text"
                  value={contextWordsText}
                  onChange={(e) => setContextWordsText(e.target.value)}
                  placeholder="AcmeCorp, admin, appname"
                  className="w-full px-3 py-2 bg-theme-input border border-theme rounded-lg text-xs text-theme-text font-mono focus:outline-none focus:border-theme-accent"
                />
              </div>
            </div>

            {/* Minimum Password Length Threshold */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-theme-text-sec mb-1 font-mono">
                Minimum Password Length Threshold
              </label>
              <input
                type="number"
                min={6}
                max={32}
                value={minLength}
                onChange={(e) => setMinLength(Number(e.target.value))}
                className="w-full sm:w-64 px-3 py-2 bg-theme-input border border-theme rounded-lg text-xs text-theme-text font-mono focus:outline-none focus:border-theme-accent"
              />
              <p className="text-[11px] text-theme-text-muted mt-1 font-mono">
                Default: 12. Defines threshold for policy length warning evaluations.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-theme flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-theme-accent hover:bg-theme-accent-hover disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-2 transition-all font-mono cursor-pointer shadow-md"
            >
              <Play className="w-4 h-4 fill-current" /> Execute Audit Pipeline
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default NewAuditPage;
