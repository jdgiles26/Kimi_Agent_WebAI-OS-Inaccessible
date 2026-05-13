import { useCallback, useRef, useState } from 'react';
import { Mic, Square, Upload, Loader2, Sparkles, Copy, Check, AlertTriangle, Cpu } from 'lucide-react';
import { AppLayout } from '@/apps/AppLayout';
import { runModel } from '@/lib/ai/runtime';
import { getModelById } from '@/lib/ai/modelGarden';
import type { ToolPlan } from '@/lib/ai/toolModelMap';
import type { AIDtype } from '@/lib/ai/types';
import { formatPipelineResult } from '@/lib/ai/format';

/** Shape returned by the SpeechT5 text-to-audio pipeline. */
interface TTSResult {
  audio: Float32Array;
  sampling_rate?: number;
}

function isTTSResult(v: unknown): v is TTSResult {
  return !!v && typeof v === 'object' && (v as { audio?: unknown }).audio instanceof Float32Array;
}

interface AudioWorkbenchProps {
  title: string;
  description?: string;
  plan: ToolPlan;
  webGPUSupported: boolean;
}

/**
 * Audio input panel: upload a file or record from the mic, then transcribe.
 */
export default function AudioWorkbench({ title, description, plan, webGPUSupported }: AudioWorkbenchProps) {
  const card = getModelById(plan.modelId);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [recording, setRecording] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [text, setText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const handleFile = useCallback((f: File) => {
    setAudioUrl(URL.createObjectURL(f));
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
    } catch (err) {
      setError(`Mic access denied: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const stopRecording = useCallback(() => {
    recRef.current?.stop();
    setRecording(false);
  }, []);

  const run = useCallback(async () => {
    if (!audioUrl || !card) return;
    setRunning(true);
    setError(null);
    setText('');
    setProgress(0);
    try {
      const raw: unknown = await runModel({
        task: plan.task,
        modelId: card.hfId,
        input: audioUrl,
        pretrainedOptions: card.pretrainedOptions,
        options: {
          dtype: card.dtype as AIDtype | undefined,
          callOptions:
            plan.task === 'automatic-speech-recognition' ? { return_timestamps: false } : {},
          onProgress: (e) => {
            if (typeof e.progress === 'number') setProgress(e.progress);
          },
        },
      });
      if (plan.task === 'text-to-audio') {
        if (!isTTSResult(raw)) {
          setError('TTS model returned an unexpected shape.');
        } else {
          try {
            const blob = float32ToWavBlob(raw.audio, raw.sampling_rate ?? 16000);
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
            setText('(synthesized audio — play below)');
          } catch (e) {
            setError(
              `TTS post-processing failed: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        }
      } else {
        setText(formatPipelineResult(raw, plan.task));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }, [audioUrl, card, plan.task]);

  return (
    <AppLayout title={title} description={description}>
      <div className="h-full flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[10px] text-[#7c6bff]/80 bg-[#7c6bff]/8 border border-[#7c6bff]/15 px-2.5 py-1.5 rounded-md">
          <Cpu className="w-3 h-3" />
          <span>{plan.modelLabel}</span>
          {!webGPUSupported && <span className="ml-auto text-[#fbbf24]">CPU fallback</span>}
        </div>

        {plan.serverOnlyReason && (
          <div className="flex items-start gap-2 text-[10px] text-[#fbbf24] bg-[#fbbf24]/8 border border-[#fbbf24]/20 px-2.5 py-1.5 rounded-md">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{plan.serverOnlyReason}</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-medium text-[#9090a8] uppercase tracking-wider">Audio</label>
          <div className="flex gap-2 flex-wrap">
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="h-9 px-3 rounded-lg text-[11px] font-medium bg-white/[0.06] text-[#e8e8f0] hover:bg-white/[0.1]"
            >
              <Upload className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
              Upload audio
            </button>
            {plan.task === 'automatic-speech-recognition' && (
              <button
                onClick={recording ? stopRecording : startRecording}
                className="h-9 px-3 rounded-lg text-[11px] font-medium bg-white/[0.06] text-[#e8e8f0] hover:bg-white/[0.1]"
              >
                {recording ? (
                  <>
                    <Square className="w-3.5 h-3.5 inline -mt-0.5 mr-1 text-[#f87171]" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                    Record
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {audioUrl && (
          <audio src={audioUrl} controls className="w-full" />
        )}

        <div className="flex justify-end">
          <button
            onClick={run}
            disabled={!audioUrl || running}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7c6bff 0%, #6b5ce0 100%)', color: 'white' }}
          >
            {running ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {progress != null && progress < 100 ? `Loading ${Math.round(progress)}%` : 'Running…'}
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                {plan.task === 'text-to-audio' ? 'Synthesize' : 'Transcribe'}
              </>
            )}
          </button>
        </div>

        {(text || error) && (
          <div className="flex-1 bg-[#12121a] border border-white/[0.06] rounded-lg p-3 overflow-auto min-h-0">
            {error ? (
              <div className="text-xs text-[#f87171] whitespace-pre-wrap">{error}</div>
            ) : (
              <>
                <div className="flex items-center justify-end mb-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(text);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="flex items-center gap-1 text-[10px] text-[#585870] hover:text-[#e8e8f0]"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-[#4ade80]" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="text-xs text-[#e8e8f0] whitespace-pre-wrap">{text}</div>
              </>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

/** Convert a Float32Array of audio samples to a 16-bit PCM WAV Blob. */
function float32ToWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
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
