import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Wallet,
  CalendarDays,
  Banknote,
  FileBarChart,
  Settings,
  LogOut,
} from 'lucide-react';
import { MENU_CONFIG, MenuItem } from './menuConfig';
import { authStore, AuthUser } from '../../store/authStore';

interface SidebarProps {
  user: AuthUser | null;
  onCloseMobile?: () => void;
}

const iconMap: Record<MenuItem['icon'], React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  UserPlus,
  Wallet,
  CalendarDays,
  Banknote,
  FileBarChart,
  Settings,
};

export const Sidebar: React.FC<SidebarProps> = ({ user, onCloseMobile }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = user?.role || 'admin';
  const visibleMenus = MENU_CONFIG.filter((item) => item.roles.includes(userRole));

  const handleMenuClick = (path: string) => {
    navigate(path);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleLogout = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    authStore.logout();
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Administrator';
      case 'pemilik':
        return 'Pengasuh';
      default:
        return 'Pengurus';
    }
  };

  const getInitial = (name?: string) => {
    if (!name) return 'A';
    return name.trim().charAt(0).toUpperCase();
  };

  return (
    <div className="flex flex-col h-full bg-[#047857] text-white select-none">
      {/* Header Logo */}
      <div className="p-4 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-full bg-[#ECFDF5] border-2 border-white flex items-center justify-center shrink-0 shadow-xs">
          <span className="text-[#047857] font-bold text-sm tracking-tight">AH</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-white leading-tight truncate">
            SI Al Hidayah
          </span>
          <span className="text-xs text-emerald-200 leading-tight truncate">
            Pondok Tertek
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b border-emerald-600/70 mx-3" />

      {/* Menu List with Custom Thin Scrollbar */}
      <div className="flex-1 overflow-y-auto custom-sidebar-scroll px-2.5 py-2 space-y-0.5">
        {visibleMenus.map((item) => {
          const IconComponent = iconMap[item.icon];
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.key}
              onClick={() => handleMenuClick(item.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 sm:py-2 rounded-lg text-sm font-medium transition-colors duration-150 outline-none text-left ${
                isActive
                  ? 'bg-white text-[#047857] font-semibold shadow-xs'
                  : 'text-emerald-100 hover:bg-emerald-700/60 hover:text-white'
              }`}
            >
              <IconComponent
                className={`w-[18px] h-[18px] shrink-0 ${
                  isActive ? 'text-[#047857]' : 'text-emerald-200'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer User Info & Logout */}
      <div className="p-3.5 border-t border-emerald-600/70 shrink-0 bg-emerald-800/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-400">
            {getInitial(user?.nama)}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-white truncate leading-tight">
              {user?.nama || 'Pengurus Pondok'}
            </span>
            <span className="text-[11px] text-emerald-200 truncate leading-tight mt-0.5">
              {getRoleBadge(user?.role)}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-2.5 w-full py-1.5 px-3 rounded-lg border border-emerald-500 text-emerald-100 hover:bg-red-600 hover:border-red-600 hover:text-white flex items-center justify-center gap-2 text-xs font-medium transition-colors duration-150 outline-none focus:ring-2 focus:ring-red-400"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
