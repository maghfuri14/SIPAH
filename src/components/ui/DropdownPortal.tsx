import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface DropdownPortalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  align?: 'right' | 'left';
}

export const DropdownPortal: React.FC<DropdownPortalProps> = ({
  isOpen,
  onClose,
  triggerRef,
  children,
  align = 'right',
}) => {
  const [coords, setCoords] = useState<{
    top: number;
    left?: number;
    right?: number;
    isTopDirection: boolean;
  }>({
    top: 0,
    isTopDirection: false,
  });

  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const isTopDirection = spaceBelow < 200; // If less than 200px available below, show above

    const topPosition = isTopDirection ? rect.top - 4 : rect.bottom + 4;

    if (align === 'right') {
      const rightPosition = window.innerWidth - rect.right;
      setCoords({
        top: topPosition,
        right: Math.max(8, rightPosition),
        isTopDirection,
      });
    } else {
      setCoords({
        top: topPosition,
        left: Math.max(8, rect.left),
        isTopDirection,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();

      const handleScrollOrResize = () => {
        updatePosition();
      };

      const handleOutsideClick = (e: MouseEvent) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(e.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(e.target as Node)
        ) {
          onClose();
        }
      };

      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      document.addEventListener('mousedown', handleOutsideClick);

      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }
  }, [isOpen, triggerRef, align, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: coords.isTopDirection ? undefined : `${coords.top}px`,
        bottom: coords.isTopDirection ? `${window.innerHeight - coords.top}px` : undefined,
        right: coords.right !== undefined ? `${coords.right}px` : undefined,
        left: coords.left !== undefined ? `${coords.left}px` : undefined,
        zIndex: 9999,
      }}
      className="w-48 bg-white border border-[#E2E8F0] rounded-xl shadow-2xl p-1.5 text-left text-xs font-medium space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
    >
      {children}
    </div>,
    document.body
  );
};

export default DropdownPortal;
