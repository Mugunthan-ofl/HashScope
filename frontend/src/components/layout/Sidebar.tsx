import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Settings, ShieldCheck } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isAdmin } = useSettings();

  // Show Settings link ONLY for authenticated admin users
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/audit/new', label: 'New Audit', icon: PlusCircle },
    ...(isAdmin ? [{ to: '/settings', label: 'Settings', icon: Settings }] : []),
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-theme-sidebar border-r border-theme w-64 select-none transition-colors">
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-theme gap-3">
        <div className="w-8 h-8 rounded-lg bg-theme-accent-bg border border-theme-accent-border flex items-center justify-center text-theme-accent shadow-sm">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-theme-accent flex items-center gap-1">
            HashScope
          </h1>
          <p className="text-[10px] text-theme-text-muted uppercase tracking-wider font-mono">Threat Audit Suite</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 px-3 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-theme-accent-bg text-theme-accent border border-theme-accent-border font-semibold shadow-sm'
                    : 'text-theme-text-sec hover:text-theme-text hover:bg-theme-surface-hover'
                }`
              }
              end={item.to === '/'}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-theme space-y-2">
        <div className="px-3 py-1.5 rounded-lg bg-theme-surface-sec border border-theme text-[10px] text-theme-text-sec font-mono flex items-center justify-between">
          <span>Engine v0.1.0</span>
          <span className="w-2 h-2 rounded-full bg-theme-accent animate-pulse"></span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <div className="relative z-50 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
