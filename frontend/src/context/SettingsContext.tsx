import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiBaseUrl, setApiBaseUrl as saveApiBaseUrl, auditApi } from '../api/auditApi';

export interface AuditHistoryItem {
  audit_id: string;
  created_at: string;
  algorithm: string;
  engine: string;
  status: string;
  total_hashes?: number;
  cracked_count?: number;
}

interface SettingsContextType {
  apiUrl: string;
  setApiUrl: (url: string) => void;
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  isBackendOnline: boolean | null;
  checkBackendHealth: () => Promise<boolean>;
  auditHistory: AuditHistoryItem[];
  saveAuditToHistory: (item: AuditHistoryItem) => void;
  updateAuditHistoryItem: (auditId: string, updates: Partial<AuditHistoryItem>) => void;
  removeAuditFromHistory: (auditId: string) => void;
  clearAuditHistory: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiUrl, setApiUrlState] = useState<string>(getApiBaseUrl());
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [demoMode, setDemoModeState] = useState<boolean>(() => {
    return localStorage.getItem('hashscope_demo_mode') === 'true';
  });

  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('hashscope_theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hashscope_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
  };

  const [auditHistory, setAuditHistory] = useState<AuditHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('hashscope_audit_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const setApiUrl = (url: string) => {
    setApiUrlState(url);
    saveApiBaseUrl(url);
  };

  const setDemoMode = (enabled: boolean) => {
    setDemoModeState(enabled);
    localStorage.setItem('hashscope_demo_mode', String(enabled));
  };

  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      const res = await auditApi.checkHealth();
      const online = res.status === 'healthy';
      setIsBackendOnline(online);
      return online;
    } catch {
      setIsBackendOnline(false);
      return false;
    }
  };

  const saveAuditToHistory = (item: AuditHistoryItem) => {
    setAuditHistory((prev) => {
      const filtered = prev.filter((a) => a.audit_id !== item.audit_id);
      const updated = [item, ...filtered];
      localStorage.setItem('hashscope_audit_history', JSON.stringify(updated));
      return updated;
    });
  };

  const updateAuditHistoryItem = (auditId: string, updates: Partial<AuditHistoryItem>) => {
    setAuditHistory((prev) => {
      const updated = prev.map((item) =>
        item.audit_id === auditId ? { ...item, ...updates } : item
      );
      localStorage.setItem('hashscope_audit_history', JSON.stringify(updated));
      return updated;
    });
  };

  const removeAuditFromHistory = (auditId: string) => {
    setAuditHistory((prev) => {
      const updated = prev.filter((item) => item.audit_id !== auditId);
      localStorage.setItem('hashscope_audit_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAuditHistory = () => {
    setAuditHistory([]);
    localStorage.removeItem('hashscope_audit_history');
  };

  // Initial health check and 10s polling interval
  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(() => {
      checkBackendHealth();
    }, 10000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  return (
    <SettingsContext.Provider
      value={{
        apiUrl,
        setApiUrl,
        demoMode,
        setDemoMode,
        theme,
        toggleTheme,
        setTheme,
        isBackendOnline,
        checkBackendHealth,
        auditHistory,
        saveAuditToHistory,
        updateAuditHistoryItem,
        removeAuditFromHistory,
        clearAuditHistory,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
