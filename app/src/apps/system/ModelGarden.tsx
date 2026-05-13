import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleDashed,
  Cpu,
  Download,
  Loader2,
  Plus,
  Trash2,
  Search,
  AlertTriangle,
  HardDrive,
} from 'lucide-react';
import { AppLayout } from '@/apps/AppLayout';
import { MODEL_GARDEN, getModelById } from '@/lib/ai/modelGarden';
import { loadPipeline, unloadModel } from '@/lib/ai/runtime';
import { useRuntimeStatus } from '@/hooks/useModelRuntime';
import {
  loadCustomModels,
  saveCustomModel,
  deleteCustomModel,
  type CustomModel,
} from '@/lib/ai/customTools';
import type { AIDtype, AITask, ModelCard } from '@/lib/ai/types';

const TASKS: AITask[] = [
  'text-generation',
  'text2text-generation',
  'summarization',
  'translation',
  'sentiment-analysis',
  'zero-shot-classification',
  'token-classification',
  'feature-extraction',
  'image-classification',
  'image-to-text',
  'image-segmentation',
  'automatic-speech-recognition',
  'text-to-audio',
];

export default function ModelGarden({ webGPUStatus }: { webGPUStatus?: { supported: boolean } }) {
  const runtime = useRuntimeStatus();
  const [q, setQ] = useState('');
  const [taskFilter, setTaskFilter] = useState<AITask | 'all'>('all');
  const [custom, setCustom] = useState<CustomModel[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<CustomModel>>({
    task: 'text-generation',
    category: 'text',
  });

  useEffect(() => {
    loadCustomModels()
      .then(setCustom)
      .catch(() => {
        // IDB schema mismatch or quota error — degrade gracefully to empty list.
        setCustom([]);
      });
  }, []);

  const allModels: (ModelCard & { custom?: boolean })[] = useMemo(() => {
    const fromCustom: (ModelCard & { custom?: boolean })[] = custom.map((c) => ({
      id: c.id,
      hfId: c.hfId,
      name: c.name,
      task: c.task,
      category: c.category,
      size: c.size,
      description: c.description,
      good_for: [],
      dtype: (c.dtype as AIDtype | undefined) ?? 'q8',
      verified: false,
      custom: true,
    }));
    return [...MODEL_GARDEN, ...fromCustom];
  }, [custom]);

  const filtered = allModels.filter((m) => {
    if (taskFilter !== 'all' && m.task !== taskFilter) return false;
    if (!q.trim()) return true;
    const haystack = `${m.name} ${m.hfId} ${m.description} ${m.good_for.join(' ')}`.toLowerCase();
    return haystack.includes(q.toLowerCase());
  });

  const isLoaded = (hfId: string, task: AITask) =>
    runtime.loaded.some((lm) => lm.modelId === hfId && lm.task === task);
  const isLoading = (hfId: string, task: AITask) =>
    runtime.loading.some((s) => s.modelId === hfId && s.task === task);
  const loadingState = (hfId: string, task: AITask) =>
    runtime.loading.find((s) => s.modelId === hfId && s.task === task);

  const onPin = async (m: ModelCard) => {
    try {
      await loadPipeline({
        task: m.task,
        modelId: m.hfId,
        dtype: m.dtype as AIDtype | undefined,
        pretrainedOptions: m.pretrainedOptions,
      });
    } catch (err) {
      // Surfaced via runtime listing already; nothing else to do.
      console.warn('[ModelGarden] load failed', err);
    }
  };

  const onUnload = async (m: ModelCard) => {
    const found = runtime.loaded.find((lm) => lm.modelId === m.hfId && lm.task === m.task);
    if (found) await unloadModel(found.cacheKey);
  };

  const onAddCustom = async () => {
    if (!draft.hfId || !draft.name || !draft.task) return;
    const id = `custom-${Date.now()}`;
    const m: CustomModel = {
      id,
      hfId: draft.hfId.trim(),
      name: draft.name.trim(),
      task: draft.task as AITask,
      category: (draft.category as CustomModel['category'] | undefined) ?? 'text',
      size: draft.size?.trim() || 'unknown',
      description: draft.description?.trim() || 'User-added model',
      dtype: draft.dtype || 'q8',
      createdAt: Date.now(),
    };
    await saveCustomModel(m);
    setCustom((prev) => [m, ...prev]);
    setAdding(false);
    setDraft({ task: 'text-generation', category: 'text' });
  };

  const onDeleteCustom = async (id: string) => {
    if (!getModelById(id)) {
      await deleteCustomModel(id);
      setCustom((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <AppLayout
      title="Model Garden"
      description="Browse, pin, and add transformers.js models for WebGPU inference"
    >
      <div className="h-full flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[10px] text-[#7c6bff]/80 bg-[#7c6bff]/8 border border-[#7c6bff]/15 px-2.5 py-1.5 rounded-md">
          <Cpu className="w-3 h-3" />
          <span>
            {runtime.webgpuSupported === null
              ? 'Detecting WebGPU…'
              : runtime.webgpuSupported
                ? `WebGPU available · preferred device: ${runtime.preferredDevice}`
                : 'WebGPU unavailable · using WASM (CPU) fallback'}
          </span>
          {!webGPUStatus?.supported && <span className="ml-auto text-[#fbbf24]">CPU fallback</span>}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-[#12121a] border border-white/[0.06] rounded-lg px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-[#585870]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search models…"
              className="flex-1 bg-transparent text-xs text-[#e8e8f0] placeholder-[#585870] focus:outline-none"
            />
          </div>
          <select
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value as AITask | 'all')}
            className="h-8 px-2 bg-[#12121a] border border-white/[0.06] rounded-lg text-[11px] text-[#e8e8f0]"
          >
            <option value="all">All tasks</option>
            {TASKS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            onClick={() => setAdding((v) => !v)}
            className="h-8 px-3 rounded-lg text-[11px] font-medium bg-[#7c6bff]/15 text-[#9b8fff] hover:bg-[#7c6bff]/25 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add custom model
          </button>
        </div>

        {adding && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 rounded-lg border border-white/[0.06] bg-[#12121a]">
            <input
              placeholder="HF id (e.g. Xenova/whisper-small)"
              value={draft.hfId ?? ''}
              onChange={(e) => setDraft({ ...draft, hfId: e.target.value })}
              className="col-span-2 h-8 px-2 rounded bg-[#0a0a12] border border-white/[0.06] text-[11px] text-[#e8e8f0]"
            />
            <input
              placeholder="Display name"
              value={draft.name ?? ''}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="h-8 px-2 rounded bg-[#0a0a12] border border-white/[0.06] text-[11px] text-[#e8e8f0]"
            />
            <select
              value={draft.task}
              onChange={(e) => setDraft({ ...draft, task: e.target.value as AITask })}
              className="h-8 px-2 rounded bg-[#0a0a12] border border-white/[0.06] text-[11px] text-[#e8e8f0]"
            >
              {TASKS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={draft.category}
              onChange={(e) =>
                setDraft({ ...draft, category: e.target.value as CustomModel['category'] })
              }
              className="h-8 px-2 rounded bg-[#0a0a12] border border-white/[0.06] text-[11px] text-[#e8e8f0]"
            >
              <option value="text">text</option>
              <option value="vision">vision</option>
              <option value="audio">audio</option>
              <option value="multimodal">multimodal</option>
              <option value="embedding">embedding</option>
            </select>
            <input
              placeholder="Size (e.g. 80MB)"
              value={draft.size ?? ''}
              onChange={(e) => setDraft({ ...draft, size: e.target.value })}
              className="h-8 px-2 rounded bg-[#0a0a12] border border-white/[0.06] text-[11px] text-[#e8e8f0]"
            />
            <input
              placeholder="dtype (q4f16 / q8 / fp32)"
              value={draft.dtype ?? ''}
              onChange={(e) => setDraft({ ...draft, dtype: e.target.value })}
              className="h-8 px-2 rounded bg-[#0a0a12] border border-white/[0.06] text-[11px] text-[#e8e8f0]"
            />
            <textarea
              placeholder="Description"
              value={draft.description ?? ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              className="col-span-2 md:col-span-3 h-16 px-2 py-1 rounded bg-[#0a0a12] border border-white/[0.06] text-[11px] text-[#e8e8f0] resize-none"
            />
            <div className="col-span-2 md:col-span-3 flex justify-end gap-2">
              <button
                onClick={() => setAdding(false)}
                className="h-8 px-3 rounded text-[11px] bg-white/[0.06] text-[#9090a8]"
              >
                Cancel
              </button>
              <button
                onClick={onAddCustom}
                disabled={!draft.hfId || !draft.name}
                className="h-8 px-3 rounded text-[11px] font-medium bg-[#7c6bff] text-white disabled:opacity-40"
              >
                Save
              </button>
            </div>
            <div className="col-span-2 md:col-span-3 flex items-start gap-2 text-[10px] text-[#fbbf24]">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                The model must have ONNX weights published on Hugging Face. transformers.js will fetch from <code>onnx/</code> subfolders.
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filtered.map((m) => {
              const loaded = isLoaded(m.hfId, m.task);
              const loading = isLoading(m.hfId, m.task);
              const ls = loadingState(m.hfId, m.task);
              return (
                <div
                  key={m.id}
                  className="rounded-lg border border-white/[0.06] bg-[#12121a] p-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#e8e8f0] truncate">{m.name}</div>
                      <div className="text-[10px] text-[#585870] font-mono truncate">{m.hfId}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {m.verified && (
                        <span className="text-[9px] bg-[#4ade80]/15 text-[#4ade80] px-1.5 py-0.5 rounded">
                          verified
                        </span>
                      )}
                      {m.custom && (
                        <span className="text-[9px] bg-[#38bdf8]/15 text-[#38bdf8] px-1.5 py-0.5 rounded">
                          custom
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-[#9090a8] leading-relaxed">{m.description}</div>
                  {m.note && (
                    <div className="text-[10px] text-[#fbbf24] bg-[#fbbf24]/8 border border-[#fbbf24]/20 rounded px-2 py-1">
                      {m.note}
                    </div>
                  )}
                  {!m.verified && !m.custom && (
                    <div className="text-[10px] text-[#585870]">
                      Untested in this build — first load is the verification.
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-[#585870]">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" /> {m.size}
                    </span>
                    <span>{m.task}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      {loaded ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-[#4ade80]" />
                          <span className="text-[#4ade80]">Loaded</span>
                        </>
                      ) : loading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-[#7c6bff]" />
                          <span className="text-[#7c6bff]">
                            {ls ? `${Math.round(ls.progress)}%` : 'Loading'}
                          </span>
                        </>
                      ) : (
                        <>
                          <CircleDashed className="w-3 h-3 text-[#585870]" />
                          <span className="text-[#585870]">Not loaded</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {loaded ? (
                        <button
                          onClick={() => onUnload(m)}
                          className="h-7 px-2 rounded text-[10px] bg-white/[0.06] text-[#9090a8] hover:text-[#e8e8f0]"
                        >
                          Unload
                        </button>
                      ) : (
                        <button
                          onClick={() => onPin(m)}
                          disabled={loading}
                          className="h-7 px-2 rounded text-[10px] bg-[#7c6bff]/15 text-[#9b8fff] hover:bg-[#7c6bff]/25 flex items-center gap-1 disabled:opacity-50"
                        >
                          <Download className="w-3 h-3" />
                          Load
                        </button>
                      )}
                      {m.custom && (
                        <button
                          onClick={() => onDeleteCustom(m.id)}
                          className="h-7 px-2 rounded text-[10px] text-[#f87171] hover:bg-[#f87171]/10"
                          title="Delete custom model"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="text-center text-[11px] text-[#585870] py-8">No models match.</div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
