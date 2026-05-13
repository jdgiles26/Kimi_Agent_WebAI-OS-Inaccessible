import { AppLayout } from '@/apps/AppLayout';
import { Sparkles } from 'lucide-react';

export default function PriceTracker() {
  return (
    <AppLayout title="Price Tracker" description="Monitor price drops">
      <div className="flex flex-col items-center justify-center h-full text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#7c6bff]/10 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-[#7c6bff]" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-[#e8e8f0]">Price Tracker</h3>
          <p className="text-[11px] text-[#585870] mt-1 max-w-xs">Add product URLs to track price changes. You'll receive notifications when prices drop.</p>
        </div>
        <div className="text-[10px] text-[#585870] bg-[#12121a] px-3 py-1.5 rounded-lg">
          Powered by WebGPU AI
        </div>
      </div>
    </AppLayout>
  );
}
