import { useEffect, useState } from 'react';
import {
  Zap,
  Wifi,
  Volume2,
  Battery,
  ChevronUp,
  Bell,
} from 'lucide-react';
import type { WindowState, WebGPUStatus } from '@/types/os';
import { appRegistry } from './appRegistry';
import * as Icons from 'lucide-react';

interface TaskbarProps {
  windows: WindowState[];
  onStartClick: () => void;
  onWindowClick: (id: string) => void;
  onWindowRestore: (id: string) => void;
  webGPUStatus: WebGPUStatus;
  startOpen: boolean;
  notifications: { id: string; title: string; type: string }[];
}

export default function Taskbar({
  windows,
  onStartClick,
  onWindowClick,
  onWindowRestore,
  webGPUStatus,
  startOpen,
  notifications,
}: TaskbarProps) {
  const [time, setTime] = useState(new Date());
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const pinnedApps = ['browser', 'terminal', 'files', 'chatrag', 'settings'];

  const getWebGPUDotColor = () => {
    switch (webGPUStatus.state) {
      case 'inferencing':
        return 'bg-[#4ade80]';
      case 'loading':
        return 'bg-[#fbbf24]';
      case 'unsupported':
        return 'bg-[#f87171]';
      default:
        return 'bg-[#585870]';
    }
  };

  return (
    <div
      className="liquid-glass fixed bottom-0 left-0 right-0 h-12 flex items-center px-2 gap-1 z-[9998]"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 0,
      }}
    >
      {/* Start Button */}
      <button
        type="button"
        aria-label="Start"
        onClick={onStartClick}
        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
          startOpen
            ? 'bg-[#7c6bff]/20 text-[#9b8fff]'
            : 'text-[#9090a8] hover:text-[#e8e8f0] hover:bg-white/[0.06]'
        }`}
      >
        <Zap className="w-5 h-5" />
      </button>

      <div className="w-px h-6 bg-white/[0.06] mx-1" />

      {/* Pinned / Open Apps */}
      <div className="flex-1 flex items-center gap-0.5 overflow-hidden">
        {pinnedApps.map((appId) => {
          const app = appRegistry.find((a) => a.id === appId);
          if (!app) return null;
          const appWindows = windows.filter((w) => w.appId === appId && !w.isMinimized);
          const hasOpen = appWindows.length > 0;
          const isFocused = appWindows.some((w) => w.isFocused);
          const IconComponent =
            ((Icons as unknown) as Record<string, React.ComponentType<{ className?: string }>>)[
              app.icon
            ] || Icons.Circle;

          return (
            <button
              key={appId}
              onClick={() => {
                const wins = windows.filter((w) => w.appId === appId);
                if (wins.length === 0) {
                  onWindowClick(appId);
                } else {
                  const minimized = wins.find((w) => w.isMinimized);
                  if (minimized) {
                    onWindowRestore(minimized.id);
                  } else {
                    const unfocused = wins.find((w) => !w.isFocused);
                    if (unfocused) onWindowRestore(unfocused.id);
                    else onWindowClick(appId);
                  }
                }
              }}
              className={`h-10 px-2.5 rounded-lg flex items-center gap-2 transition-all min-w-0 ${
                isFocused
                  ? 'bg-[#7c6bff]/15 text-[#e8e8f0]'
                  : hasOpen
                  ? 'bg-white/[0.04] text-[#9090a8] hover:text-[#e8e8f0] hover:bg-white/[0.08]'
                  : 'text-[#585870] hover:text-[#9090a8] hover:bg-white/[0.04]'
              }`}
              title={app.name}
            >
              <IconComponent className="w-4.5 h-4.5 shrink-0" />
              {hasOpen && (
                <span className="text-[11px] truncate max-w-[80px] hidden sm:inline">
                  {app.name}
                </span>
              )}
              {appWindows.length > 1 && (
                <span className="text-[9px] bg-white/10 rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                  {appWindows.length}
                </span>
              )}
              {hasOpen && (
                <div
                  className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full ${
                    isFocused ? 'bg-[#7c6bff]' : 'bg-white/20'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* System Tray */}
      <div className="flex items-center gap-1">
        {/* WebGPU Indicator */}
        <div
          className="h-8 px-2 rounded-lg flex items-center gap-1.5"
          title={webGPUStatus.message}
        >
          <div
            className={`w-2 h-2 rounded-full ${getWebGPUDotColor()} ${
              webGPUStatus.state === 'inferencing' ? 'animate-pulse' : ''
            }`}
          />
          <Zap className="w-3.5 h-3.5 text-[#585870]" />
        </div>

        {/* Notifications */}
        <button
          onClick={() => setShowNotifs(!showNotifs)}
          className="relative h-8 w-8 rounded-lg flex items-center justify-center text-[#585870] hover:text-[#e8e8f0] hover:bg-white/[0.06] transition-all"
        >
          <Bell className="w-4 h-4" />
          {notifications.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#f87171] rounded-full text-[9px] text-white flex items-center justify-center font-medium">
              {notifications.length}
            </span>
          )}
        </button>

        <div className="w-px h-5 bg-white/[0.06] mx-1" />

        {/* System Icons */}
        <div className="hidden md:flex items-center gap-1 text-[#585870]">
          <Wifi className="w-4 h-4" />
          <Volume2 className="w-4 h-4" />
          <Battery className="w-4 h-4" />
        </div>

        {/* Clock */}
        <div className="h-8 px-2 rounded-lg flex items-center text-[#9090a8]">
          <span className="text-xs font-medium tabular-nums">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <button className="h-8 w-5 flex items-center justify-center text-[#585870] hover:text-[#e8e8f0] transition-all">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
