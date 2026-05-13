import type { AppDefinition } from '@/types/os';
import { appRegistry } from './appRegistry';
import * as Icons from 'lucide-react';
import { useCustomToolApps } from '@/hooks/useCustomToolApps';

interface DesktopProps {
  onLaunchApp: (appId: string) => void;
}

export default function Desktop({ onLaunchApp }: DesktopProps) {
  const customTools = useCustomToolApps();

  // Featured icons (3 columns × 6 rows). Mix system, AI Garden/Studio, and
  // a handful of highlight tools.
  // Typed with AppDefinition | undefined so TypeScript does not hide missing IDs.
  const desktopAppsRaw: { app: AppDefinition | undefined; row: number; col: number }[] = [
    // Col 1: System
    { app: appRegistry.find((a) => a.id === 'browser'), row: 0, col: 0 },
    { app: appRegistry.find((a) => a.id === 'terminal'), row: 1, col: 0 },
    { app: appRegistry.find((a) => a.id === 'files'), row: 2, col: 0 },
    { app: appRegistry.find((a) => a.id === 'settings'), row: 3, col: 0 },
    { app: appRegistry.find((a) => a.id === 'calc'), row: 4, col: 0 },
    { app: appRegistry.find((a) => a.id === 'calendar'), row: 5, col: 0 },
    // Col 2: AI essentials
    { app: appRegistry.find((a) => a.id === 'modelgarden'), row: 0, col: 1 },
    { app: appRegistry.find((a) => a.id === 'toolstudio'), row: 1, col: 1 },
    { app: appRegistry.find((a) => a.id === 'workflow'), row: 2, col: 1 },
    { app: appRegistry.find((a) => a.id === 'chatrag'), row: 3, col: 1 },
    { app: appRegistry.find((a) => a.id === 'tldr'), row: 4, col: 1 },
    { app: appRegistry.find((a) => a.id === 'factchecker'), row: 5, col: 1 },
    // Col 3: Highlights
    { app: appRegistry.find((a) => a.id === 'remote'), row: 0, col: 2 },
    { app: appRegistry.find((a) => a.id === 'codeexplainer'), row: 1, col: 2 },
    { app: appRegistry.find((a) => a.id === 'alttext'), row: 2, col: 2 },
    { app: appRegistry.find((a) => a.id === 'bgremover'), row: 3, col: 2 },
    { app: appRegistry.find((a) => a.id === 'transcriber'), row: 4, col: 2 },
    { app: appRegistry.find((a) => a.id === 'tts'), row: 5, col: 2 },
  ];
  // Filter undefined — if an ID is ever typo'd, only that icon disappears
  // (not the whole desktop) and we emit a dev-mode console warning so it
  // surfaces during development instead of being hidden in production.
  const desktopApps = desktopAppsRaw.filter((entry): entry is { app: AppDefinition; row: number; col: number } => {
    if (!entry.app) {
      if (import.meta.env.DEV) {
        console.warn('[Desktop] An app ID in the featured grid is missing from appRegistry. Check Desktop.tsx.');
      }
      return false;
    }
    return true;
  });

  return (
    <div className="absolute inset-0 pt-4 pb-16 px-4 overflow-auto">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 88px)',
          gridAutoRows: '88px',
          gap: '8px',
          alignContent: 'start',
          justifyContent: 'start',
        }}
      >
        {desktopApps.map(({ app, row, col }) => {
          if (!app) return null;
          const IconComponent =
            ((Icons as unknown) as Record<string, React.ComponentType<{ className?: string }>>)[app.icon] ||
            Icons.Circle;

          return (
            <button
              key={app.id}
              onClick={() => onLaunchApp(app.id)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all hover:bg-white/[0.06] group cursor-pointer"
              style={{ gridRow: row + 1, gridColumn: col + 1 }}
              title={`${app.name} — ${app.description}`}
            >
              <div className="w-12 h-12 rounded-xl bg-[#12121a]/80 border border-white/[0.06] flex items-center justify-center transition-all group-hover:border-[#7c6bff]/30 group-hover:shadow-[0_4px_16px_rgba(124,107,255,0.2)] group-hover:scale-105">
                <IconComponent className="w-6 h-6 text-[#7c6bff]" />
              </div>
              <span className="text-[10px] text-[#e8e8f0] font-medium text-center leading-tight max-w-full truncate px-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {app.name}
              </span>
            </button>
          );
        })}
      </div>

      {customTools.length > 0 && (
        <div className="mt-6 pl-1">
          <div className="text-[10px] uppercase tracking-wider text-[#9090a8] mb-2 px-1">
            My Tools
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 88px)',
              gridAutoRows: '88px',
              gap: '8px',
              alignContent: 'start',
              justifyContent: 'start',
            }}
          >
            {customTools.slice(0, 12).map((tool) => {
              const Ico =
                ((Icons as unknown) as Record<string, React.ComponentType<{ className?: string }>>)[tool.icon] ||
                Icons.Sparkles;
              return (
                <button
                  key={tool.id}
                  onClick={() => onLaunchApp(`custom:${tool.id}`)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all hover:bg-white/[0.06] group cursor-pointer"
                  title={`${tool.name} — ${tool.description || 'Custom tool'}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7c6bff]/20 to-[#38bdf8]/10 border border-[#7c6bff]/30 flex items-center justify-center transition-all group-hover:border-[#7c6bff] group-hover:scale-105">
                    <Ico className="w-6 h-6 text-[#9b8fff]" />
                  </div>
                  <span className="text-[10px] text-[#e8e8f0] font-medium text-center leading-tight max-w-full truncate px-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {tool.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
