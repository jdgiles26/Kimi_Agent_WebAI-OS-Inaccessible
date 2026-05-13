import { useCallback, useEffect, useRef, useState } from 'react';
import { GripHorizontal, Minus, PanelBottomOpen, Square, X } from 'lucide-react';
import type { WindowState } from '@/types/os';
import { getAppById } from './appRegistry';
import * as Icons from 'lucide-react';

interface AppWindowProps {
  window: WindowState;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  children: React.ReactNode;
}

/**
 * Position drift while dragging is tracked as a delta from the window's
 * canonical (x, y) in the window store. We never copy x/y into local state,
 * so a store update for this window's position lands immediately on the next
 * render without an effect-driven sync.
 *
 * Equivalent reasoning holds for size, which is currently controlled by the
 * store alone (no in-component resize handle exists yet).
 */
export default function AppWindow({
  window: win,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  children,
}: AppWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState({ dx: 0, dy: 0 });
  const dragStart = useRef({ x: 0, y: 0 });

  const app = getAppById(win.appId);
  const iconMap = Icons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
  >;
  const IconComponent = app ? iconMap[app.icon] || Icons.Circle : Icons.Circle;

  const handleMouseDown = useCallback(() => {
    onFocus();
  }, [onFocus]);

  const handleTitleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (win.isMaximized) return;
      dragStart.current = { x: e.clientX, y: e.clientY };
      setDragDelta({ dx: 0, dy: 0 });
      setIsDragging(true);
      onFocus();
    },
    [win.isMaximized, onFocus],
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      setDragDelta({
        dx: e.clientX - dragStart.current.x,
        dy: e.clientY - dragStart.current.y,
      });
    };
    const handleUp = () => {
      setIsDragging(false);
      setDragDelta({ dx: 0, dy: 0 });
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  if (win.isMinimized) return null;

  const pos = {
    x: Math.max(0, win.x + (isDragging ? dragDelta.dx : 0)),
    y: Math.max(0, win.y + (isDragging ? dragDelta.dy : 0)),
  };

  // On narrow viewports (phones, companion mode) force every window to be
  // full-screen so drag/resize never strands content off-canvas.
  const isNarrow =
    typeof window !== 'undefined' && window.innerWidth < 768;
  const isMaxed = win.isMaximized || isNarrow;
  const style: React.CSSProperties = isMaxed
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 'calc(100% - 48px)',
        zIndex: win.zIndex,
        opacity: win.isFocused ? 1 : 0.85,
      }
    : {
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
        opacity: win.isFocused ? 1 : 0.85,
        transition: isDragging ? 'none' : 'opacity 0.2s',
      };

  return (
    <div
      ref={windowRef}
      style={style}
      className="flex flex-col overflow-hidden"
      onMouseDown={handleMouseDown}
    >
      <div
        className="rounded-xl flex flex-col h-full"
        style={{
          background: 'rgba(10, 10, 15, 0.65)',
          backdropFilter: 'blur(40px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.2)',
          border: win.isFocused
            ? '1px solid rgba(124, 107, 255, 0.3)'
            : '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: win.isFocused
            ? '0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,107,255,0.3)'
            : '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Title Bar */}
        <div
          onMouseDown={handleTitleMouseDown}
          className="flex items-center justify-between px-3 h-9 shrink-0 cursor-grab active:cursor-grabbing select-none"
          style={{
            background: win.isFocused
              ? 'rgba(124,107,255,0.08)'
              : 'transparent',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <GripHorizontal className="w-3 h-3 text-[#585870] shrink-0" />
            <IconComponent className="w-4 h-4 text-[#7c6bff] shrink-0" />
            <span className="text-xs text-[#e8e8f0] font-medium truncate">
              {win.title}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Minimize"
              onClick={onMinimize}
              className="w-6 h-6 rounded-md flex items-center justify-center text-[#585870] hover:text-[#e8e8f0] hover:bg-white/[0.06] transition-all"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label={isMaxed ? 'Restore' : 'Maximize'}
              onClick={onMaximize}
              className="w-6 h-6 rounded-md flex items-center justify-center text-[#585870] hover:text-[#e8e8f0] hover:bg-white/[0.06] transition-all"
            >
              {isMaxed ? (
                <PanelBottomOpen className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="w-6 h-6 rounded-md flex items-center justify-center text-[#585870] hover:text-[#f87171] hover:bg-[#f87171]/10 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">{children}</div>
      </div>
    </div>
  );
}
