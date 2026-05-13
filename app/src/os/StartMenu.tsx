import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bluetooth,
  LogOut,
  Power,
  Search,
  Sun,
  User,
  Volume2,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import type { AppCategory } from '@/types/os';
import { appCategories, appRegistry, searchApps } from './appRegistry';
import * as Icons from 'lucide-react';

/** Pseudo-category used for the "My Tools" custom-tool group. */
const MY_TOOLS = 'My Tools' as const;
type ExpandableCategory = AppCategory | typeof MY_TOOLS;

interface StartMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchApp: (appId: string) => void;
  customTools?: { id: string; name: string; description: string; icon: string }[];
  user?: { name?: string; email?: string; avatar?: string } | null;
  onLogout?: () => void;
}

export default function StartMenu({
  isOpen,
  onClose,
  onLaunchApp,
  customTools = [],
  user,
  onLogout,
}: StartMenuProps) {
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<ExpandableCategory | null>('System');
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus the search input when the menu opens. The "clear search on close"
  // behaviour is handled in `closeMenu` so we don't touch state during the
  // close effect (which would otherwise cascade renders).
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => searchRef.current?.focus(), 100);
    return () => clearTimeout(id);
  }, [isOpen]);

  const closeMenu = () => {
    setSearch('');
    onClose();
  };

  const filteredApps = useMemo(() => {
    if (!search.trim()) return null;
    return searchApps(search).filter((a) => a.id !== 'customtool');
  }, [search]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9997] flex items-end justify-center pb-14"
      onClick={closeMenu}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Menu Panel */}
      <div
        className="liquid-glass relative w-full max-w-3xl mx-4 rounded-2xl overflow-hidden flex flex-col"
        style={{
          maxHeight: 'calc(100vh - 120px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-[#585870] shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search apps, files, and commands..."
              className="flex-1 bg-transparent text-sm text-[#e8e8f0] placeholder-[#585870] outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Escape') closeMenu();
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-[#585870] hover:text-[#e8e8f0] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-56 border-r border-white/[0.06] p-3 flex flex-col gap-2 shrink-0">
            {/* User Profile */}
            <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] mb-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7c6bff] to-[#38bdf8] flex items-center justify-center">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    className="w-9 h-9 rounded-full"
                  />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-medium text-[#e8e8f0] truncate">
                  {user?.name || 'Guest'}
                </div>
                <div className="text-[10px] text-[#585870] truncate">
                  {user?.email || 'Local Session'}
                </div>
              </div>
            </div>

            {/* Quick Settings */}
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {[
                { icon: Wifi, label: 'WiFi', active: true },
                { icon: Bluetooth, label: 'BT', active: false },
                { icon: Volume2, label: 'Vol', active: true },
                { icon: Sun, label: 'Light', active: true },
              ].map((s) => (
                <button
                  key={s.label}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] transition-all ${
                    s.active
                      ? 'bg-[#7c6bff]/15 text-[#9b8fff]'
                      : 'bg-white/[0.03] text-[#585870] hover:text-[#9090a8]'
                  }`}
                >
                  <s.icon className="w-3 h-3" />
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Power / Logout */}
            {user && onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-[#585870] hover:text-[#f87171] hover:bg-[#f87171]/10 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            )}
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-[#585870] hover:text-[#e8e8f0] hover:bg-white/[0.06] transition-all">
              <Power className="w-3.5 h-3.5" />
              Shutdown
            </button>
          </div>

          {/* App List */}
          <div className="flex-1 overflow-y-auto p-3">
            {filteredApps ? (
              <div>
                <div className="text-[10px] text-[#585870] uppercase tracking-wider mb-2 px-2">
                  Search Results ({filteredApps.length})
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {filteredApps.map((app) => {
                    const IconComponent =
                      ((Icons as unknown) as Record<string, React.ComponentType<{ className?: string }>>)[app.icon] ||
                      Icons.Circle;
                    return (
                      <button
                        key={app.id}
                        onClick={() => {
                          onLaunchApp(app.id);
                          closeMenu();
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] transition-all text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#12121a] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:border-[#7c6bff]/30 transition-colors">
                          <IconComponent className="w-4 h-4 text-[#7c6bff]" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-xs font-medium text-[#e8e8f0]">
                            {app.name}
                          </div>
                          <div className="text-[10px] text-[#585870] truncate">
                            {app.description}
                          </div>
                        </div>
                        <span className="ml-auto text-[9px] text-[#585870] bg-white/[0.04] px-1.5 py-0.5 rounded shrink-0">
                          {app.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {customTools.length > 0 && (
                  <div>
                    <button
                      onClick={() => setExpandedCategory((c) => (c === MY_TOOLS ? null : MY_TOOLS))}
                      className="w-full flex items-center justify-between px-2 py-2 text-[11px] font-medium text-[#9090a8] hover:text-[#e8e8f0] transition-colors"
                    >
                      <span>My Tools</span>
                      <span className="text-[10px] text-[#585870]">
                        {expandedCategory === MY_TOOLS ? '−' : `+${customTools.length}`}
                      </span>
                    </button>
                    {expandedCategory === MY_TOOLS && (
                      <div className="grid grid-cols-1 gap-0.5 pl-2">
                        {customTools.map((tool) => {
                          const Ico =
                            ((Icons as unknown) as Record<string, React.ComponentType<{ className?: string }>>)[tool.icon] ||
                            Icons.Sparkles;
                          return (
                            <button
                              key={tool.id}
                              onClick={() => {
                                onLaunchApp(`custom:${tool.id}`);
                                closeMenu();
                              }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-all text-left group"
                            >
                              <div className="w-7 h-7 rounded-lg bg-[#12121a] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:border-[#7c6bff]/30 transition-colors">
                                <Ico className="w-3.5 h-3.5 text-[#7c6bff]" />
                              </div>
                              <div className="overflow-hidden">
                                <div className="text-[11px] font-medium text-[#e8e8f0]">{tool.name}</div>
                                <div className="text-[10px] text-[#585870] truncate">
                                  {tool.description || 'Custom tool'}
                                </div>
                              </div>
                              <Zap className="w-3 h-3 text-[#7c6bff] ml-auto shrink-0 opacity-50" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {appCategories.map((category) => {
                  const apps = appRegistry.filter(
                    (a) => a.category === category && a.id !== 'customtool'
                  );
                  const isExpanded = expandedCategory === category;

                  return (
                    <div key={category}>
                      <button
                        onClick={() =>
                          setExpandedCategory(isExpanded ? null : category)
                        }
                        className="w-full flex items-center justify-between px-2 py-2 text-[11px] font-medium text-[#9090a8] hover:text-[#e8e8f0] transition-colors"
                      >
                        <span>{category}</span>
                        <span className="text-[10px] text-[#585870]">
                          {isExpanded ? '−' : `+${apps.length}`}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="grid grid-cols-1 gap-0.5 pl-2">
                          {apps.map((app) => {
                            const IconComponent =
                              ((Icons as unknown) as Record<string, React.ComponentType<{ className?: string }>>)[
                                app.icon
                              ] || Icons.Circle;
                            return (
                              <button
                                key={app.id}
                                onClick={() => {
                                  onLaunchApp(app.id);
                                  closeMenu();
                                }}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-all text-left group"
                              >
                                <div className="w-7 h-7 rounded-lg bg-[#12121a] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:border-[#7c6bff]/30 transition-colors">
                                  <IconComponent className="w-3.5 h-3.5 text-[#7c6bff]" />
                                </div>
                                <div className="overflow-hidden">
                                  <div className="text-[11px] font-medium text-[#e8e8f0]">
                                    {app.name}
                                  </div>
                                  <div className="text-[10px] text-[#585870] truncate">
                                    {app.description}
                                  </div>
                                </div>
                                {app.requiresWebGPU && (
                                  <Zap className="w-3 h-3 text-[#7c6bff] ml-auto shrink-0 opacity-50" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
