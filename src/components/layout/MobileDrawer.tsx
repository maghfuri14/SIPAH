import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { AuthUser } from '../../store/authStore';
import { X } from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose, user }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-label="Tutup menu"
        role="button"
        tabIndex={0}
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 left-0 w-[260px] bg-[#047857] z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Close button inside drawer header */}
        <button
          onClick={onClose}
          aria-label="Tutup menu"
          className="absolute top-4 right-3 p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/50 z-10 transition-colors duration-150"
        >
          <X className="w-5 h-5" />
        </button>

        <Sidebar user={user} onCloseMobile={onClose} />
      </div>
    </div>
  );
};

export default MobileDrawer;
