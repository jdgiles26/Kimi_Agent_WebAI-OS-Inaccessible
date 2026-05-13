import { useState } from 'react';
import {
  Monitor,
  Volume2,
  Wifi,
  Shield,
  Zap,
  Info,
  ChevronRight,
} from 'lucide-react';
import { unloadAll } from '@/lib/ai/runtime';
import { clearStore } from '@/lib/storage/db';

interface SettingSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: {
    label: string;
    description?: string;
    type: 'toggle' | 'select' | 'button';
    value?: boolean;
    options?: string[];
    onToggle?: (next: boolean) => void;
    onClick?: () => void;
  }[];
}

function ToggleControl({
  initial,
  onChange,
}: {
  initial: boolean;
  onChange: (next: boolean) => void;
}) {
  const [on, setOn] = useState(initial);
  return (
    <button
      onClick={() => {
        const next = !on;
        setOn(next);
        onChange(next);
      }}
      className={`w-9 h-5 rounded-full transition-all relative ${on ? 'bg-[#7c6bff]' : 'bg-[#222230]'}`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
          on ? 'left-4.5' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState('display');

  const sections: SettingSection[] = [
    {
      id: 'display',
      title: 'Display',
      icon: Monitor,
      items: [
        { label: 'Dark Mode', type: 'toggle', value: true },
        { label: 'Window Transparency', description: 'Enable liquid glass effects', type: 'toggle', value: true },
        { label: 'Animations', description: 'Window and UI animations', type: 'toggle', value: true },
        { label: 'Scale', type: 'select', options: ['100%', '125%', '150%'] },
      ],
    },
    {
      id: 'sound',
      title: 'Sound',
      icon: Volume2,
      items: [
        { label: 'System Sounds', type: 'toggle', value: true },
        { label: 'Notification Sounds', type: 'toggle', value: true },
        { label: 'Volume', type: 'select', options: ['Mute', '25%', '50%', '75%', '100%'] },
      ],
    },
    {
      id: 'network',
      title: 'Network',
      icon: Wifi,
      items: [
        { label: 'Wi-Fi', type: 'toggle', value: true },
        { label: 'WebGPU Access', description: 'Allow GPU-accelerated AI', type: 'toggle', value: true },
        { label: 'Cache Models', description: 'Keep AI models in browser cache', type: 'toggle', value: true },
      ],
    },
    {
      id: 'ai',
      title: 'AI Engine',
      icon: Zap,
      items: [
        { label: 'WebGPU Acceleration', description: 'Use GPU for AI inference', type: 'toggle', value: true },
        { label: 'Model Quantization', description: 'Use compressed models', type: 'toggle', value: true },
        {
          label: 'Auto-load Models',
          description: 'Off by default. Enable to pre-warm the 25MB embedding model at launch for instant first-run performance.',
          type: 'toggle',
          value: localStorage.getItem('webai:autoload-models') === 'on',
          onToggle: (next: boolean) => {
            localStorage.setItem('webai:autoload-models', next ? 'on' : 'off');
          },
        },
        {
          label: 'Unload All Models',
          description: 'Drop loaded pipelines from memory (model files remain cached)',
          type: 'button',
          onClick: () => {
            void unloadAll();
          },
        },
        {
          label: 'Clear Custom Tools & Models',
          description: 'Permanently delete your tool library and custom model entries',
          type: 'button',
          onClick: async () => {
            await clearStore('customTools');
            await clearStore('customModels');
            window.dispatchEvent(new Event('webai:custom-tools-updated'));
          },
        },
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy',
      icon: Shield,
      items: [
        { label: 'Block Trackers', type: 'toggle', value: true },
        { label: 'Auto-deny Cookies', type: 'toggle', value: false },
        { label: 'Phishing Protection', type: 'toggle', value: true },
        { label: 'Local-only AI', description: 'Never send data to servers', type: 'toggle', value: true },
      ],
    },
    {
      id: 'about',
      title: 'About',
      icon: Info,
      items: [
        { label: 'Version', description: 'WebAI OS v1.0.0', type: 'button' },
        { label: 'WebGPU', description: navigator.gpu ? 'Supported' : 'Not Available', type: 'button' },
        { label: 'Browser', description: navigator.userAgent.split(')')[0] + ')', type: 'button' },
        { label: 'Apps', description: '62 AI-powered applications', type: 'button' },
        { label: 'License', description: 'MIT License', type: 'button' },
      ],
    },
  ];

  const current = sections.find((s) => s.id === activeSection);

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-48 border-r border-white/[0.06] p-2 shrink-0 overflow-auto">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                activeSection === section.id
                  ? 'bg-[#7c6bff]/15 text-[#7c6bff]'
                  : 'text-[#9090a8] hover:text-[#e8e8f0] hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium">{section.title}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {current && (
          <div>
            <h2 className="text-sm font-semibold text-[#e8e8f0] mb-4">
              {current.title}
            </h2>
            <div className="space-y-1">
              {current.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-white/[0.03] transition-colors"
                >
                  <div>
                    <div className="text-xs text-[#e8e8f0]">{item.label}</div>
                    {item.description && (
                      <div className="text-[10px] text-[#585870] mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </div>
                  {item.type === 'toggle' && (
                    <ToggleControl
                      initial={!!item.value}
                      onChange={(next) => item.onToggle?.(next)}
                    />
                  )}
                  {item.type === 'select' && (
                    <div className="flex items-center gap-1 text-[11px] text-[#9090a8]">
                      {item.options?.[0]}
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  )}
                  {item.type === 'button' && (
                    item.onClick ? (
                      <button
                        onClick={item.onClick}
                        className="text-[11px] text-[#7c6bff] hover:text-[#9b8fff]"
                      >
                        Run
                      </button>
                    ) : item.description ? (
                      <span className="text-[11px] text-[#585870]">{item.description}</span>
                    ) : null
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
