import ImageWorkbench from '@/apps/_shared/ImageWorkbench';
import { getPlanForApp } from '@/lib/ai/toolModelMap';

export default function SketchToPhoto({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const plan = getPlanForApp('sketch2photo')!;
  return (
    <ImageWorkbench
      title="Sketch to Caption"
      description="Upload a sketch; the model captions it. (In-browser diffusion not yet bundled.)"
      plan={plan}
      webGPUSupported={!!webGPUStatus?.supported}
      actionLabel="Caption Sketch"
    />
  );
}
