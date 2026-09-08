import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Terminal, Download, Settings, Play, ChevronDown, ChevronUp } from 'lucide-react';

interface EngineGuidanceAlertProps {
  errorMessage: string;
  onRetry?: () => void;
  onSwitchToMock?: () => void;
}

export const EngineGuidanceAlert: React.FC<EngineGuidanceAlertProps> = ({
  errorMessage,
  onRetry,
  onSwitchToMock,
}) => {
  const navigate = useNavigate();
  const [showCheckedPaths, setShowCheckedPaths] = useState(false);

  // Detect OS from navigator.userAgent if possible
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  const isWindows = userAgent.includes('win');
  const isMac = userAgent.includes('mac');
  const isLinux = !isWindows && !isMac;

  // Extract checked paths list if present in error message string
  const checkedIndex = errorMessage.indexOf('Checked: [');
  const mainMessage = checkedIndex !== -1 ? errorMessage.slice(0, checkedIndex).trim() : errorMessage;
  const checkedPathsRaw = checkedIndex !== -1 ? errorMessage.slice(checkedIndex) : null;


  return (
    <div className="bg-[#101719] border border-red-800/80 rounded-xl p-5 shadow-xl space-y-4 font-sans">
      {/* Primary Error Banner */}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-red-950/80 text-red-400 border border-red-800 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-red-300 flex items-center gap-2">
            Cracking Engine Binary Not Found
          </h3>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed font-mono">
            {mainMessage}
          </p>

          {checkedPathsRaw && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowCheckedPaths(!showCheckedPaths)}
                className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {showCheckedPaths ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showCheckedPaths ? 'Hide checked paths' : 'View checked lookup locations'}
              </button>

              {showCheckedPaths && (
                <div className="mt-2 p-3 bg-[#0a0f11] border border-[#1b282a] rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto max-h-36">
                  {checkedPathsRaw}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* OS Installation Guidance */}
      <div className="bg-[#0a0f11] border border-[#1b282a] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1b282a] pb-2">
          <span className="text-xs font-semibold text-[#10b981] uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Recommended Installation Steps
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30">
            Detected OS: {isWindows ? 'Windows' : isMac ? 'macOS' : 'Linux'}
          </span>
        </div>

        <div className="text-xs space-y-2.5 font-mono">
          {/* Windows Section */}
          <div className={`p-2.5 rounded border transition-colors ${isWindows ? 'bg-[#0e2224] border-[#10b981]/50 text-slate-200' : 'bg-[#101719]/40 border-[#1b282a] text-slate-400'}`}>
            <p className="font-bold text-[#10b981] flex items-center gap-1.5 mb-1">
              <Terminal className="w-3.5 h-3.5" /> Windows:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] pl-1">
              <li>
                Download official package from{' '}
                <a
                  href="https://hashcat.net/hashcat/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#10b981] underline hover:text-[#34d399]"
                >
                  hashcat.net/hashcat
                </a>
              </li>
              <li>Or install via Chocolatey: <code className="bg-[#0a0f11] px-1 py-0.5 rounded text-amber-300">choco install hashcat</code></li>
              <li>Or install via Scoop: <code className="bg-[#0a0f11] px-1 py-0.5 rounded text-amber-300">scoop install hashcat</code></li>
            </ul>
          </div>

          {/* Linux Section */}
          <div className={`p-2.5 rounded border transition-colors ${isLinux ? 'bg-[#0e2224] border-[#10b981]/50 text-slate-200' : 'bg-[#101719]/40 border-[#1b282a] text-slate-400'}`}>
            <p className="font-bold text-[#10b981] flex items-center gap-1.5 mb-1">
              <Terminal className="w-3.5 h-3.5" /> Linux (Debian / Ubuntu / Fedora):
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] pl-1">
              <li>Debian/Ubuntu: <code className="bg-[#0a0f11] px-1 py-0.5 rounded text-amber-300">sudo apt update && sudo apt install hashcat john</code></li>
              <li>Fedora/RHEL: <code className="bg-[#0a0f11] px-1 py-0.5 rounded text-amber-300">sudo dnf install hashcat john</code></li>
            </ul>
          </div>

          {/* macOS Section */}
          <div className={`p-2.5 rounded border transition-colors ${isMac ? 'bg-[#0e2224] border-[#10b981]/50 text-slate-200' : 'bg-[#101719]/40 border-[#1b282a] text-slate-400'}`}>
            <p className="font-bold text-[#10b981] flex items-center gap-1.5 mb-1">
              <Terminal className="w-3.5 h-3.5" /> macOS (Homebrew):
            </p>
            <p className="text-[11px] pl-1">
              Run: <code className="bg-[#0a0f11] px-1 py-0.5 rounded text-amber-300">brew install hashcat john</code>
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="pt-2 border-t border-[#1b282a] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3.5 py-1.5 bg-[#10b981] hover:bg-[#34d399] text-[#0a0f11] font-bold rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Retry Audit
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="px-3.5 py-1.5 bg-[#0e2224] hover:bg-[#132d30] text-[#10b981] border border-[#1b3235] rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" /> Configure Path in Settings
          </button>
        </div>

        {onSwitchToMock && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">Or preview as demo:</span>
            <button
              type="button"
              onClick={onSwitchToMock}
              className="px-3 py-1.5 bg-[#172426] hover:bg-[#1f3134] text-slate-300 border border-[#23383c] rounded-lg text-xs font-mono transition-colors cursor-pointer"
            >
              Run Demo Mode (Mock Engine)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
