import AudioWorkbench from '@/apps/_shared/AudioWorkbench';
import { getPlanForApp } from '@/lib/ai/toolModelMap';

export default function LiveTranscriber({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const plan = getPlanForApp('transcriber')!;
  return (
    <AudioWorkbench
      title="Live Transcriber"
      description="Record from mic or upload audio for transcription"
      plan={plan}
      webGPUSupported={!!webGPUStatus?.supported}
    />
  );
}
