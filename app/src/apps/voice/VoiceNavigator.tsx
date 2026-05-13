import AudioWorkbench from '@/apps/_shared/AudioWorkbench';
import { getPlanForApp } from '@/lib/ai/toolModelMap';

export default function VoiceNavigator({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const plan = getPlanForApp('voicenav')!;
  return (
    <AudioWorkbench
      title="Voice Navigator"
      description="Record a voice command and we'll transcribe it (full app routing coming soon)"
      plan={plan}
      webGPUSupported={!!webGPUStatus?.supported}
    />
  );
}
