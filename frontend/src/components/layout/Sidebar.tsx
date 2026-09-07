import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Settings, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/audit/new', label: 'New Audit', icon: PlusCircle },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0d1416] border-r border-[#1b282a] w-64 select-none">
      {/* Brand Logo */}
      <div className="h-16 flex items-center px-6 border-b border-[#1b282a] gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#072c25] border border-[#0d594b] flex items-center justify-center text-[#10b981] shadow-lg shadow-[#10b981]/10">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-[#10b981] flex items-center gap-1">
            HashScope
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Threat Audit Suite</p>
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
                    ? 'bg-[#0a2e27] text-[#10b981] border border-[#10b981]/40 font-semibold shadow-sm shadow-[#10b981]/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#121c1f]'
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

      {/* System Status Footer */}
      <div className="p-4 border-t border-[#1b282a]">
        <div className="px-3 py-2 rounded-lg bg-[#0a0f11] border border-[#1b282a] text-[11px] text-slate-400 font-mono flex items-center justify-between">
          <span>Engine v0.1.0</span>
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
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
          <div className="fixed inset-0 bg-[#0a0f11]/80 backdrop-blur-sm" onClick={onClose} />
          <div className="relative z-50 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
