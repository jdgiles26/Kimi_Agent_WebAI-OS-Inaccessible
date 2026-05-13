import { useCallback, useState } from 'react';
import { Loader2, Play, Sparkles, AlertTriangle, Cpu } from 'lucide-react';
import { AppLayout } from '@/apps/AppLayout';
import { runModel } from '@/lib/ai/runtime';
import { getModelById } from '@/lib/ai/modelGarden';
import { getPlanForApp } from '@/lib/ai/toolModelMap';
import type { AIDtype } from '@/lib/ai/types';

interface TTSResult {
  audio: Float32Array;
  sampling_rate?: number;
}

function f32ToWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

const DEFAULT_SPEAKER_EMBEDDINGS =
  'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin';

export default function TextToSpeech({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const plan = getPlanForApp('tts')!;
  const card = getModelById(plan.modelId)!;
  const [text, setText] = useState('Hello from WebAI OS. This audio was synthesized entirely in your browser.');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const speak = useCallback(async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    setAudioUrl('');
    setProgress(0);
    try {
      const raw = (await runModel({
        task: 'text-to-audio',
        modelId: card.hfId,
        input: text.trim(),
        pretrainedOptions: card.pretrainedOptions,
        options: {
          dtype: card.dtype as AIDtype | undefined,
          callOptions: { speaker_embeddings: DEFAULT_SPEAKER_EMBEDDINGS },
          onProgress: (e) => {
            if (typeof e.progress === 'number') setProgress(e.progress);
          },
        },
      })) as TTSResult;
      const blob = f32ToWav(raw.audio, raw.sampling_rate ?? 16000);
      setAudioUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [text, card]);

  return (
    <AppLayout title="Text to Speech" description="Synthesize speech locally with SpeechT5">
      <div className="h-full flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[10px] text-[#7c6bff]/80 bg-[#7c6bff]/8 border border-[#7c6bff]/15 px-2.5 py-1.5 rounded-md">
          <Cpu className="w-3 h-3" />
          <span>{plan.modelLabel}</span>
          {!webGPUStatus?.supported && <span className="ml-auto text-[#fbbf24]">CPU fallback</span>}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type something to speak…"
          className="w-full h-28 bg-[#12121a] border border-white/[0.06] rounded-lg p-3 text-xs text-[#e8e8f0] placeholder-[#585870] resize-none focus:border-[#7c6bff] focus:outline-none"
        />

        <div className="flex justify-end">
          <button
            onClick={speak}
            disabled={busy || !text.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7c6bff 0%, #6b5ce0 100%)', color: 'white' }}
          >
            {busy ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {progress != null && progress < 100 ? `Loading ${Math.round(progress)}%` : 'Synthesizing…'}
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Speak
              </>
            )}
          </button>
        </div>

        {audioUrl && (
          <div className="flex items-center gap-2 bg-[#12121a] border border-white/[0.06] rounded-lg p-3">
            <Play className="w-4 h-4 text-[#7c6bff]" />
            <audio src={audioUrl} controls className="flex-1" />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-[10px] text-[#f87171] bg-[#f87171]/8 border border-[#f87171]/20 px-2.5 py-1.5 rounded-md">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
