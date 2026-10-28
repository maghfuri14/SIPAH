import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileDrawer } from './MobileDrawer';
import { authStore } from '../../store/authStore';

export const AppLayout: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const user = authStore.getUser();

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* 1. SIDEBAR DESKTOP (Fixed Width) */}
      <div className="hidden lg:block w-[260px] shrink-0 h-full z-40">
        <Sidebar user={user} />
      </div>

      {/* 2. MOBILE DRAWER */}
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} user={user} />

      {/* 3. AREA KANAN (Topbar + Konten) */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* TOPBAR */}
        <Topbar user={user} onMenuClick={() => setDrawerOpen(true)} />

        {/* KONTEN UTAMA (Scrollable) */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F8FAFC]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
