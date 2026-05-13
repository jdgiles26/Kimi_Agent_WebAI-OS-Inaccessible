import ImageWorkbench from '@/apps/_shared/ImageWorkbench';
import { getPlanForApp } from '@/lib/ai/toolModelMap';

export default function VisualShopper({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const plan = getPlanForApp('visualshopper')!;
  return (
    <ImageWorkbench
      title="Visual Shopper"
      description="Identify objects in an image to power a shopping search"
      plan={plan}
      webGPUSupported={!!webGPUStatus?.supported}
      actionLabel="Identify"
    />
  );
}
