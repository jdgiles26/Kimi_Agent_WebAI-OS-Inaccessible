import ImageWorkbench from '@/apps/_shared/ImageWorkbench';
import { getPlanForApp } from '@/lib/ai/toolModelMap';

export default function UIToCode({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const plan = getPlanForApp('uitocode')!;
  return (
    <ImageWorkbench
      title="UI to Description"
      description="Upload a UI screenshot — the model describes it. Paste the description into Code Explainer to draft React/Tailwind."
      plan={plan}
      webGPUSupported={!!webGPUStatus?.supported}
      actionLabel="Describe UI"
    />
  );
}
