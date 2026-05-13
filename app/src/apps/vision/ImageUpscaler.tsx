import ImageWorkbench from '@/apps/_shared/ImageWorkbench';
import { getPlanForApp } from '@/lib/ai/toolModelMap';

export default function ImageUpscaler({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const plan = getPlanForApp('upscaler')!;
  return (
    <ImageWorkbench
      title="Image Classifier"
      description="Classify image content (super-resolution model not yet bundled — use Vision tools to describe the image)"
      plan={plan}
      webGPUSupported={!!webGPUStatus?.supported}
      actionLabel="Classify"
    />
  );
}
