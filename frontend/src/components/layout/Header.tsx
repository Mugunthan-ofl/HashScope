import React from 'react';
import { Menu, Activity, CheckCircle2, XCircle, AlertCircle, Sun, Moon } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, title }) => {
  const { isBackendOnline, engineStatus, theme, toggleTheme } = useSettings();

  const getStatusBadge = () => {
    if (isBackendOnline === false) {
      return (
        <span className="text-theme-error-text flex items-center gap-1.5 font-semibold">
          <XCircle className="w-3.5 h-3.5 text-theme-error-text" /> Backend Offline
        </span>
      );
    }
    if (isBackendOnline === null) {
      return <span className="text-theme-text-muted font-medium">Checking Backend...</span>;
    }

    const { hashcatFound, johnFound } = engineStatus;
    if (hashcatFound && johnFound) {
      return (
        <span className="text-theme-accent flex items-center gap-1.5 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 text-theme-accent" /> Engines Ready (Hashcat & John)
        </span>
      );
    } else if (hashcatFound && !johnFound) {
      return (
        <span className="text-amber-400 flex items-center gap-1.5 font-semibold" title="Hashcat is ready. John the Ripper binary is not installed or configured.">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Hashcat Ready (John Missing)
        </span>
      );
    } else if (!hashcatFound && johnFound) {
      return (
        <span className="text-amber-400 flex items-center gap-1.5 font-semibold" title="John the Ripper is ready. Hashcat binary is not installed or configured.">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> John Ready (Hashcat Missing)
        </span>
      );
    } else {
      return (
        <span className="text-theme-error-text flex items-center gap-1.5 font-semibold" title="Neither Hashcat nor John binaries were found.">
          <XCircle className="w-3.5 h-3.5 text-theme-error-text" /> Engines Missing
        </span>
      );
    }
  };

  return (
    <header className="h-16 border-b border-theme bg-theme-header backdrop-blur sticky top-0 z-20 px-4 md:px-8 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg text-theme-text-sec hover:text-theme-text hover:bg-theme-surface-hover transition-colors cursor-pointer"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-semibold text-theme-text tracking-tight">
          {title || 'Security Audit Workspace'}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle Button (Sun / Moon) */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-theme-text-sec hover:text-theme-text hover:bg-theme-surface-hover border border-theme bg-theme-surface transition-colors flex items-center justify-center cursor-pointer shadow-sm"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
          aria-label="Toggle theme mode"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-emerald-700" />
          )}
        </button>

        {/* Backend & Engine Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-theme-surface border border-theme text-xs font-mono">
          <Activity className="w-3.5 h-3.5 text-theme-text-muted" />
          {getStatusBadge()}
        </div>
      </div>
    </header>
  );
};

export default Header;
