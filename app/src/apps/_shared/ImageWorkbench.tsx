import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, Check, Copy, Cpu, Loader2, Sparkles, Upload } from 'lucide-react';
import { AppLayout } from '@/apps/AppLayout';
import { runModel } from '@/lib/ai/runtime';
import { getModelById } from '@/lib/ai/modelGarden';
import type { ToolPlan } from '@/lib/ai/toolModelMap';
import type { AIDtype } from '@/lib/ai/types';
import { formatPipelineResult } from '@/lib/ai/format';

interface ImageWorkbenchProps {
  title: string;
  description?: string;
  plan: ToolPlan;
  webGPUSupported: boolean;
  /** How to render the result alongside the source image. */
  renderResult?: (result: unknown, srcUrl: string) => React.ReactNode;
  /** Override the default action button label. */
  actionLabel?: string;
}

/**
 * Reusable panel for image-input tools: classification, captioning, segmentation.
 * - Lets the user drop an image, paste a URL, or use the camera.
 * - Runs the configured pipeline.
 * - Renders a default text result; or a custom renderer (e.g., mask overlay).
 */
export default function ImageWorkbench({
  title,
  description,
  plan,
  webGPUSupported,
  renderResult,
  actionLabel = 'Run',
}: ImageWorkbenchProps) {
  const [imgUrl, setImgUrl] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [text, setText] = useState<string>('');
  const [resultNode, setResultNode] = useState<React.ReactNode>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const card = getModelById(plan.modelId);

  const handleFile = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = () => setImgUrl(String(reader.result));
    reader.readAsDataURL(f);
  }, []);

  const handleUrl = useCallback((url: string) => setImgUrl(url.trim()), []);

  const run = useCallback(async () => {
    if (!imgUrl || !card) return;
    setRunning(true);
    setError(null);
    setText('');
    setResultNode(null);
    setProgress(0);
    try {
      const raw: unknown = await runModel({
        task: plan.task,
        modelId: card.hfId,
        input: imgUrl,
        pretrainedOptions: card.pretrainedOptions,
        options: {
          dtype: card.dtype as AIDtype | undefined,
          onProgress: (e) => {
            if (typeof e.progress === 'number') setProgress(e.progress);
          },
        },
      });
      if (renderResult) {
        setResultNode(renderResult(raw, imgUrl));
      } else {
        setText(formatPipelineResult(raw, plan.task));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }, [imgUrl, card, plan.task, renderResult]);

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
          <label className="text-[11px] font-medium text-[#9090a8] uppercase tracking-wider">Image</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={imgUrl.startsWith('data:') ? '(uploaded file)' : imgUrl}
              onChange={(e) => handleUrl(e.target.value)}
              placeholder="Paste image URL or upload below…"
              className="flex-1 h-9 px-3 rounded-lg bg-[#12121a] border border-white/[0.06] text-xs text-[#e8e8f0] placeholder-[#585870] focus:border-[#7c6bff] focus:outline-none"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-9 px-3 rounded-lg text-[11px] font-medium bg-white/[0.06] text-[#e8e8f0] hover:bg-white/[0.1]"
            >
              <Upload className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
              Upload
            </button>
          </div>
        </div>

        {imgUrl && (
          <div className="rounded-lg overflow-hidden border border-white/[0.06] bg-[#12121a] max-h-52 flex items-center justify-center">
            <img src={imgUrl} alt="input" className="max-h-52 object-contain" />
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={run}
            disabled={!imgUrl || running}
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
                {actionLabel}
              </>
            )}
          </button>
        </div>

        {(text || resultNode || error) && (
          <div className="flex-1 bg-[#12121a] border border-white/[0.06] rounded-lg p-3 overflow-auto min-h-0">
            {error ? (
              <div className="text-xs text-[#f87171] whitespace-pre-wrap">{error}</div>
            ) : resultNode ? (
              resultNode
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
