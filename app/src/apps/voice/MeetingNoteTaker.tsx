import AudioWorkbench from '@/apps/_shared/AudioWorkbench';
import { getPlanForApp } from '@/lib/ai/toolModelMap';

export default function MeetingNotes({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const plan = getPlanForApp('meetingnotes')!;
  return (
    <AudioWorkbench
      title="Meeting Notes"
      description="Transcribe a meeting recording (paste the transcript into TL;DR Generator for a summary)"
      plan={plan}
      webGPUSupported={!!webGPUStatus?.supported}
    />
  );
}
