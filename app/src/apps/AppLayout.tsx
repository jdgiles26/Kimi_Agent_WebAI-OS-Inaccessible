import { useCallback, useState, type FormEvent } from 'react';
import { AlertTriangle, Check, Copy, Cpu, Loader2, Sparkles } from 'lucide-react';
import { loadPipeline, runModel } from '@/lib/ai/runtime';
import { getModelById } from '@/lib/ai/modelGarden';
import { getPlanForApp, type ToolPlan } from '@/lib/ai/toolModelMap';
import { cleanGeneratedText, formatPipelineResult } from '@/lib/ai/format';
import type { AIDtype, AITask, ProgressEvent } from '@/lib/ai/types';

interface AppLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function AppLayout({ title, description, children }: AppLayoutProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div
        className="shrink-0 px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between"
        style={{ background: 'rgba(10,10,15,0.5)' }}
      >
        <div>
          <h2 className="text-sm font-semibold text-[#e8e8f0]">{title}</h2>
          {description && (
            <p className="text-[10px] text-[#585870] mt-0.5">{description}</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">{children}</div>
    </div>
  );
}

interface AIAppLayoutProps {
  title: string;
  description?: string;
  inputPlaceholder?: string;
  inputLabel?: string;
  inputType?: 'text' | 'textarea' | 'code';
  outputLabel?: string;
  isProcessing: boolean;
  onSubmit: (input: string) => void;
  output?: string;
  outputComponent?: React.ReactNode;
  actionLabel?: string;
  webGPUSupported?: boolean;
  modelLabel?: string;
  progress?: { progress: number; file?: string } | null;
  errorMessage?: string | null;
  warning?: string | null;
}

export function AIAppLayout({
  title,
  description,
  inputPlaceholder = 'Enter your input...',
  inputLabel = 'Input',
  inputType = 'textarea',
  outputLabel = 'Result',
  isProcessing,
  onSubmit,
  output,
  outputComponent,
  actionLabel = 'Generate',
  webGPUSupported = true,
  modelLabel,
  progress,
  errorMessage,
  warning,
}: AIAppLayoutProps) {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isProcessing) return;
      onSubmit(input.trim());
    },
    [input, isProcessing, onSubmit],
  );

  const handleCopy = useCallback(() => {
    if (output) {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [output]);

  const progressPct = progress?.progress
    ? Math.max(0, Math.min(100, Math.round(progress.progress)))
    : null;

  return (
    <AppLayout title={title} description={description}>
      <div className="h-full flex flex-col gap-3">
        {modelLabel && (
          <div className="flex items-center gap-2 text-[10px] text-[#7c6bff]/80 bg-[#7c6bff]/8 border border-[#7c6bff]/15 px-2.5 py-1.5 rounded-md">
            <Cpu className="w-3 h-3" />
            <span>{modelLabel}</span>
            {!webGPUSupported && (
              <span className="ml-auto text-[#fbbf24]">CPU fallback</span>
            )}
          </div>
        )}

        {warning && (
          <div className="flex items-start gap-2 text-[10px] text-[#fbbf24] bg-[#fbbf24]/8 border border-[#fbbf24]/20 px-2.5 py-1.5 rounded-md">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{warning}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-[#9090a8] uppercase tracking-wider">
              {inputLabel}
            </label>
          </div>

          {inputType === 'textarea' ? (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full h-24 bg-[#12121a] border border-white/[0.06] rounded-lg p-3 text-xs text-[#e8e8f0] placeholder-[#585870] resize-none focus:border-[#7c6bff] focus:outline-none transition-colors font-sans leading-relaxed"
              disabled={isProcessing}
            />
          ) : inputType === 'code' ? (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full h-32 bg-[#12121a] border border-white/[0.06] rounded-lg p-3 text-xs text-[#e8e8f0] placeholder-[#585870] resize-none focus:border-[#7c6bff] focus:outline-none transition-colors font-mono leading-relaxed"
              disabled={isProcessing}
              spellCheck={false}
            />
          ) : (
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={inputPlaceholder}
              className="w-full h-10 bg-[#12121a] border border-white/[0.06] rounded-lg px-3 text-xs text-[#e8e8f0] placeholder-[#585870] focus:border-[#7c6bff] focus:outline-none transition-colors"
              disabled={isProcessing}
            />
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isProcessing || !input.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: isProcessing
                  ? 'rgba(124,107,255,0.15)'
                  : 'linear-gradient(135deg, #7c6bff 0%, #6b5ce0 100%)',
                color: 'white',
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {progressPct != null && progressPct < 100 ? `Loading model ${progressPct}%` : 'Running…'}
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  {actionLabel}
                </>
              )}
            </button>
          </div>
        </form>

        {(output || outputComponent || isProcessing || errorMessage) && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-medium text-[#9090a8] uppercase tracking-wider">
                {outputLabel}
              </label>
              {output && !errorMessage && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[10px] text-[#585870] hover:text-[#e8e8f0] transition-colors"
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
              )}
            </div>

            <div className="flex-1 bg-[#12121a] border border-white/[0.06] rounded-lg p-3 overflow-auto">
              {errorMessage ? (
                <div className="text-xs text-[#f87171] leading-relaxed whitespace-pre-wrap font-sans">
                  {errorMessage}
                </div>
              ) : outputComponent ? (
                outputComponent
              ) : isProcessing && !output ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full border-2 border-[#7c6bff]/30 border-t-[#7c6bff] animate-spin" />
                      <Sparkles className="w-3 h-3 text-[#7c6bff] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-[11px] text-[#585870]">
                      {progressPct != null && progressPct < 100
                        ? `Downloading model${progress?.file ? ` (${progress.file})` : ''}… ${progressPct}%`
                        : webGPUSupported
                          ? 'Running on WebGPU…'
                          : 'Running on CPU…'}
                    </span>
                  </div>
                </div>
              ) : output ? (
                <div className="text-xs text-[#e8e8f0] leading-relaxed whitespace-pre-wrap font-sans">
                  {output}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

/**
 * useAIProcessor — backed by transformers.js. Each app passes its own appId so
 * the hook can resolve the right task, model, and prompt template from
 * `toolModelMap.ts`. The optional `planOverride` lets the Tool Studio /
 * CustomToolRunner inject a per-tool plan that isn't in the static map.
 *
 * The hook owns its own processing/error/progress state and exposes a single
 * `process(input)` callback. Callers do NOT pass WebGPU capability — the
 * runtime probes it once at load time (see `runtime.ts::detectWebGPU`) and
 * transparently falls back to WASM.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PipelineOutput = any;
type CallOptions = Record<string, unknown>;

// eslint-disable-next-line react-refresh/only-export-components -- co-located with AIAppLayout on purpose
export function useAIProcessor(appId?: string, planOverride?: ToolPlan) {
  const plan = planOverride ?? (appId ? getPlanForApp(appId) : undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [output, setOutput] = useState('');
  const [progress, setProgress] = useState<{ progress: number; file?: string } | null>(null);
  const [errorMessage, setError] = useState<string | null>(null);

  const process = useCallback(
    async (input: string) => {
      if (!plan) {
        setError('No model plan for this tool.');
        return;
      }
      if (plan.serverOnly) {
        setOutput(
          `This tool is marked offline-only in WebAI OS.\n\nReason: ${plan.serverOnlyReason ?? 'requires a backend.'}\n\nYour input was:\n${input.slice(0, 400)}${input.length > 400 ? '…' : ''}`,
        );
        return;
      }
      const card = getModelById(plan.modelId);
      if (!card) {
        setError(`Model "${plan.modelId}" not found in the garden.`);
        return;
      }

      setIsProcessing(true);
      setError(null);
      setOutput('');
      setProgress({ progress: 0 });

      const onProgress = (e: ProgressEvent) => {
        if (typeof e.progress === 'number') setProgress({ progress: e.progress, file: e.file });
      };
      const dtype = card.dtype as AIDtype | undefined;

      try {
        let raw: PipelineOutput;

        if (plan.task === 'text-generation') {
          const messages = [
            { role: 'system', content: plan.prompt?.system ?? 'You are a helpful assistant.' },
            { role: 'user', content: (plan.prompt?.userTemplate ?? '{input}').replace('{input}', input) },
          ];
          raw = await runModel({
            task: 'text-generation',
            modelId: card.hfId,
            input: messages,
            pretrainedOptions: card.pretrainedOptions,
            options: {
              dtype,
              callOptions: {
                max_new_tokens: plan.maxTokens ?? 256,
                temperature: 0.7,
                do_sample: true,
                return_full_text: false,
              },
              onProgress,
            },
          });
        } else if (
          plan.task === 'text2text-generation' ||
          plan.task === 'summarization' ||
          plan.task === 'translation'
        ) {
          const callOptions: CallOptions = {};
          const text = plan.prompt
            ? plan.prompt.userTemplate.replace('{input}', input)
            : input;
          if (plan.task === 'translation' && plan.translation) {
            callOptions.src_lang = plan.translation.src_lang;
            callOptions.tgt_lang = plan.translation.tgt_lang;
          }
          if (plan.task === 'summarization') {
            callOptions.max_new_tokens = 180;
            callOptions.min_new_tokens = 24;
          }
          raw = await runModel({
            task: plan.task,
            modelId: card.hfId,
            input: text,
            pretrainedOptions: card.pretrainedOptions,
            options: { dtype, callOptions, onProgress },
          });
        } else if (plan.task === 'zero-shot-classification') {
          raw = await runModel({
            task: 'zero-shot-classification',
            modelId: card.hfId,
            input,
            pretrainedOptions: card.pretrainedOptions,
            options: {
              dtype,
              callOptions: {
                candidate_labels: plan.candidateLabels ?? ['positive', 'neutral', 'negative'],
              },
              onProgress,
            },
          });
        } else if (
          plan.task === 'sentiment-analysis' ||
          plan.task === 'text-classification' ||
          plan.task === 'token-classification' ||
          plan.task === 'feature-extraction'
        ) {
          raw = await runModel({
            task: plan.task,
            modelId: card.hfId,
            input,
            pretrainedOptions: card.pretrainedOptions,
            options: {
              dtype,
              callOptions:
                plan.task === 'token-classification' ? { aggregation_strategy: 'simple' } : {},
              onProgress,
            },
          });
        } else {
          setError(
            `Task "${plan.task}" needs a richer input than plain text (e.g., image or audio). Use the dedicated panel for this tool.`,
          );
          setIsProcessing(false);
          return;
        }

        const formatted = formatPipelineResult(raw, plan.task);
        setOutput(cleanGeneratedText(formatted));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setIsProcessing(false);
        setProgress(null);
      }
    },
    [plan],
  );

  return {
    isProcessing,
    output,
    process,
    setOutput,
    progress,
    errorMessage,
    plan,
    modelLabel: plan?.modelLabel,
  };
}

/**
 * Pre-warm a model into the runtime cache. Returns a promise that resolves
 * when the model is ready to use. Safe to call from React effects.
 */
// eslint-disable-next-line react-refresh/only-export-components -- co-located with AIAppLayout on purpose
export async function warmModel(gardenModelId: string): Promise<void> {
  const card = getModelById(gardenModelId);
  if (!card) return;
  await loadPipeline({
    task: card.task,
    modelId: card.hfId,
    dtype: card.dtype as AIDtype | undefined,
    pretrainedOptions: card.pretrainedOptions,
  });
}

// Re-export AITask so callers that need it for a plan override can pull it
// from the same module they import `useAIProcessor` from.
export type { AITask };
