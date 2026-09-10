import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Terminal, Download, Settings, Play, ChevronDown, ChevronUp } from 'lucide-react';

interface EngineGuidanceAlertProps {
  errorMessage: string;
  onRetry?: () => void;
}

export const EngineGuidanceAlert: React.FC<EngineGuidanceAlertProps> = ({
  errorMessage,
  onRetry,
}) => {
  const navigate = useNavigate();
  const [showCheckedPaths, setShowCheckedPaths] = useState(false);

  // Detect OS from navigator.userAgent if possible
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  const isWindows = userAgent.includes('win');
  const isMac = userAgent.includes('mac');
  const isLinux = !isWindows && !isMac;

  // Detect missing engine from errorMessage
  const isJohn = errorMessage.toLowerCase().includes('john');

  // Extract checked paths list if present in error message string
  const checkedIndex = errorMessage.indexOf('Checked: [');
  const mainMessage = checkedIndex !== -1 ? errorMessage.slice(0, checkedIndex).trim() : errorMessage;
  const checkedPathsRaw = checkedIndex !== -1 ? errorMessage.slice(checkedIndex) : null;

  return (
    <div className="bg-theme-surface border border-theme-error-border rounded-xl p-5 shadow-theme-lg space-y-4 font-sans transition-colors">
      {/* Primary Error Banner */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-theme-error-bg text-theme-error-text border border-theme-error-border shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-theme-error-text flex items-center gap-2">
            {isJohn ? 'John the Ripper Binary Not Found' : 'Cracking Engine Binary Not Found'}
          </h3>
          <p className="text-xs text-theme-text-sec mt-1 leading-relaxed font-mono">
            {mainMessage}
          </p>

          {checkedPathsRaw && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowCheckedPaths(!showCheckedPaths)}
                className="text-[11px] font-mono text-theme-text-muted hover:text-theme-text flex items-center gap-1 transition-colors cursor-pointer"
              >
                {showCheckedPaths ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showCheckedPaths ? 'Hide checked paths' : 'View checked lookup locations'}
              </button>

              {showCheckedPaths && (
                <div className="mt-2 p-3 bg-theme-surface-sec border border-theme rounded-lg text-[11px] font-mono text-theme-text-sec overflow-x-auto max-h-36">
                  {checkedPathsRaw}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* OS Installation Guidance */}
      <div className="bg-theme-surface-sec border border-theme rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-theme pb-2">
          <span className="text-xs font-semibold text-theme-accent uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Recommended Installation Steps ({isJohn ? 'John the Ripper' : 'Hashcat'})
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-theme-accent-bg text-theme-accent-text border border-theme-accent-border">
            Detected OS: {isWindows ? 'Windows' : isMac ? 'macOS' : 'Linux'}
          </span>
        </div>

        <div className="text-xs space-y-2.5 font-mono">
          {/* Windows Section */}
          <div className={`p-2.5 rounded border transition-colors ${isWindows ? 'bg-theme-accent-bg border-theme-accent-border text-theme-text' : 'bg-theme-surface border-theme text-theme-text-muted'}`}>
            <p className="font-bold text-theme-accent flex items-center gap-1.5 mb-1">
              <Terminal className="w-3.5 h-3.5" /> Windows:
            </p>
            {isJohn ? (
              <ul className="list-disc list-inside space-y-1 text-[11px] pl-1">
                <li>
                  Download official package from{' '}
                  <a
                    href="https://www.openwall.com/john/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-theme-accent underline hover:text-theme-accent-hover font-semibold"
                  >
                    openwall.com/john
                  </a>
                </li>
                <li>Or install via Chocolatey: <code className="bg-theme-surface px-1 py-0.5 rounded text-theme-warning-text font-bold">choco install john-the-ripper</code></li>
                <li>Or install via Scoop: <code className="bg-theme-surface px-1 py-0.5 rounded text-theme-warning-text font-bold">scoop install john</code></li>
              </ul>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-[11px] pl-1">
                <li>
                  Download official package from{' '}
                  <a
                    href="https://hashcat.net/hashcat/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-theme-accent underline hover:text-theme-accent-hover font-semibold"
                  >
                    hashcat.net/hashcat
                  </a>
                </li>
                <li>Or install via Chocolatey: <code className="bg-theme-surface px-1 py-0.5 rounded text-theme-warning-text font-bold">choco install hashcat</code></li>
                <li>Or install via Scoop: <code className="bg-theme-surface px-1 py-0.5 rounded text-theme-warning-text font-bold">scoop install hashcat</code></li>
              </ul>
            )}
          </div>

          {/* Linux Section */}
          <div className={`p-2.5 rounded border transition-colors ${isLinux ? 'bg-theme-accent-bg border-theme-accent-border text-theme-text' : 'bg-theme-surface border-theme text-theme-text-muted'}`}>
            <p className="font-bold text-theme-accent flex items-center gap-1.5 mb-1">
              <Terminal className="w-3.5 h-3.5" /> Linux (Debian / Ubuntu / Fedora):
            </p>
            {isJohn ? (
              <ul className="list-disc list-inside space-y-1 text-[11px] pl-1">
                <li>Debian/Ubuntu: <code className="bg-theme-surface px-1 py-0.5 rounded text-theme-warning-text font-bold">sudo apt update && sudo apt install john</code></li>
                <li>Fedora/RHEL: <code className="bg-theme-surface px-1 py-0.5 rounded text-theme-warning-text font-bold">sudo dnf install john</code></li>
              </ul>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-[11px] pl-1">
                <li>Debian/Ubuntu: <code className="bg-theme-surface px-1 py-0.5 rounded text-theme-warning-text font-bold">sudo apt update && sudo apt install hashcat</code></li>
                <li>Fedora/RHEL: <code className="bg-theme-surface px-1 py-0.5 rounded text-theme-warning-text font-bold">sudo dnf install hashcat</code></li>
              </ul>
            )}
          </div>

          {/* macOS Section */}
          <div className={`p-2.5 rounded border transition-colors ${isMac ? 'bg-theme-accent-bg border-theme-accent-border text-theme-text' : 'bg-theme-surface border-theme text-theme-text-muted'}`}>
            <p className="font-bold text-theme-accent flex items-center gap-1.5 mb-1">
              <Terminal className="w-3.5 h-3.5" /> macOS (Homebrew):
            </p>
            <p className="text-[11px] pl-1">
              Run: <code className="bg-theme-surface px-1 py-0.5 rounded text-theme-warning-text font-bold">{isJohn ? 'brew install john-jumbo' : 'brew install hashcat'}</code>
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="pt-2 border-t border-theme flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3.5 py-1.5 bg-theme-accent hover:bg-theme-accent-hover text-white font-bold rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Retry Audit
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="px-3.5 py-1.5 bg-theme-surface-sec hover:bg-theme-surface-hover text-theme-accent border border-theme-accent-border rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" /> Configure Path in Settings
          </button>
        </div>
      </div>
    </div>
  );
};
