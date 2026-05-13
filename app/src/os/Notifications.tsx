import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import type { Notification } from '@/types/os';

interface NotificationsProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const iconMap = {
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
};

const colorMap = {
  success: 'border-l-[#4ade80] text-[#4ade80]',
  info: 'border-l-[#38bdf8] text-[#38bdf8]',
  warning: 'border-l-[#fbbf24] text-[#fbbf24]',
  error: 'border-l-[#f87171] text-[#f87171]',
};

export default function Notifications({ notifications, onDismiss }: NotificationsProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      {notifications.map((n) => {
        const Icon = iconMap[n.type];
        return (
          <div
            key={n.id}
            className={`liquid-glass rounded-lg px-4 py-3 min-w-[280px] max-w-[360px] border-l-[3px] ${colorMap[n.type]} animate-in slide-in-from-right-4 fade-in duration-300`}
            style={{
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              pointerEvents: 'auto',
            }}
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${colorMap[n.type].split(' ')[1]}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[#e8e8f0]">{n.title}</div>
                <div className="text-[11px] text-[#9090a8] mt-0.5">{n.message}</div>
              </div>
              <button
                onClick={() => onDismiss(n.id)}
                className="text-[#585870] hover:text-[#e8e8f0] transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
