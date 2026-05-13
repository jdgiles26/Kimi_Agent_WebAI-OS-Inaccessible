import ImageWorkbench from '@/apps/_shared/ImageWorkbench';
import { getPlanForApp } from '@/lib/ai/toolModelMap';

export default function AltTextGenerator({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const plan = getPlanForApp('alttext')!;
  return (
    <ImageWorkbench
      title="Alt Text Generator"
      description="Generate accessibility descriptions for images"
      plan={plan}
      webGPUSupported={!!webGPUStatus?.supported}
      actionLabel="Describe"
    />
  );
}
