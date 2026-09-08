import React from 'react';
import { Menu, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, title }) => {
  const { isBackendOnline } = useSettings();

  return (
    <header className="h-16 border-b border-[#1b282a] bg-[#0a0f11]/90 backdrop-blur sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#121c1f]"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-semibold text-slate-200 tracking-tight">
          {title || 'Security Audit Workspace'}
        </h2>
      </div>

      {/* Backend Engine Status Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#101719] border border-[#1b282a] text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          {isBackendOnline === true ? (
            <span className="text-[#10b981] flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" /> Engine Ready
            </span>
          ) : isBackendOnline === false ? (
            <span className="text-red-400 flex items-center gap-1.5 font-semibold">
              <XCircle className="w-3.5 h-3.5 text-red-400" /> Engine Unavailable
            </span>
          ) : (
            <span className="text-slate-400 font-medium">Checking Engine...</span>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
