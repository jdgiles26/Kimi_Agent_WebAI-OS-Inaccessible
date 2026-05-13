import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Play,
  Save,
  Loader2,
  ArrowDown,
  Workflow as WorkflowIcon,
  AlertTriangle,
  Square,
} from 'lucide-react';
import { AppLayout } from '@/apps/AppLayout';
import { BUILTIN_TOOLS, getToolById } from '@/lib/agent/tools';
import {
  runRecipe,
  type ExecutionEvent,
  type Recipe,
  type RecipeStep,
} from '@/lib/agent/executor';
import { deleteRecipe, loadRecipes, saveRecipe } from '@/lib/agent/storage';
import { runModel } from '@/lib/ai/runtime';

function makeId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const FRESH_RECIPE: Recipe = {
  id: '',
  name: 'New recipe',
  description: '',
  steps: [],
  initialScope: {},
  createdAt: 0,
  updatedAt: 0,
};

export default function WorkflowBuilder() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipe, setRecipe] = useState<Recipe>({ ...FRESH_RECIPE, id: makeId() });
  const [, setEditing] = useState(false);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [scope, setScope] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadRecipes().then(setRecipes);
  }, []);

  const tools = BUILTIN_TOOLS;
  const initialKeys = useMemo(() => {
    const keys = new Set<string>(Object.keys(recipe.initialScope ?? {}));
    return Array.from(keys);
  }, [recipe.initialScope]);

  const addStep = (toolId: string) => {
    const tool = getToolById(toolId)!;
    const step: RecipeStep = {
      id: makeId(),
      toolId,
      inputs: Object.fromEntries(
        tool.inputs.map((i) => [i.name, i.default != null ? String(i.default) : '']),
      ),
      outputVar: `${toolId.replace(/[^a-z0-9]/gi, '_')}_${recipe.steps.length + 1}`,
    };
    setRecipe((r) => ({ ...r, steps: [...r.steps, step] }));
    setEditing(true);
  };

  const removeStep = (id: string) =>
    setRecipe((r) => ({ ...r, steps: r.steps.filter((s) => s.id !== id) }));

  const updateStep = (id: string, patch: Partial<RecipeStep>) =>
    setRecipe((r) => ({
      ...r,
      steps: r.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));

  const updateInput = (id: string, field: string, value: string) =>
    setRecipe((r) => ({
      ...r,
      steps: r.steps.map((s) =>
        s.id === id ? { ...s, inputs: { ...s.inputs, [field]: value } } : s,
      ),
    }));

  const onSave = async () => {
    if (!recipe.name.trim() || recipe.steps.length === 0) return;
    const now = Date.now();
    const toSave: Recipe = {
      ...recipe,
      createdAt: recipe.createdAt || now,
      updatedAt: now,
    };
    await saveRecipe(toSave);
    setRecipes(await loadRecipes());
    setEditing(false);
  };

  const onNew = () => {
    setRecipe({ ...FRESH_RECIPE, id: makeId() });
    setEvents([]);
    setScope({});
    setError(null);
    setEditing(true);
  };

  const onLoad = (r: Recipe) => {
    setRecipe(r);
    setEvents([]);
    setScope({});
    setError(null);
    setEditing(false);
  };

  const onDelete = async (id: string) => {
    await deleteRecipe(id);
    setRecipes(await loadRecipes());
    if (recipe.id === id) onNew();
  };

  const onRun = async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    setEvents([]);
    setScope({});
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await runRecipe(
        recipe,
        {
          signal: controller.signal,
          runPipeline: async ({ task, modelId, input, callOptions }) => {
            return runModel({
              task,
              modelId,
              input,
              options: { signal: controller.signal, callOptions },
            });
          },
          saveNote: async (title, content) => {
            // Reuse runHistory table for saved notes.
            const { putRecord } = await import('@/lib/storage/db');
            await putRecord('runHistory', {
              toolId: 'workflow',
              kind: 'note',
              title,
              content,
              createdAt: Date.now(),
            });
          },
          fetchUrl: async (url) => {
            const r = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
            const text = await r.text();
            // Strip tags for a plain-text view.
            return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          },
        },
        recipe.initialScope ?? {},
        (e) => setEvents((prev) => [...prev, e]),
      );
      setScope(res.scope);
      if (res.failedAt !== undefined) {
        setError(`Failed at step ${res.failedAt + 1}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const onAbort = () => abortRef.current?.abort();

  return (
    <AppLayout
      title="Workflow Builder"
      description="Chain AI tools into reusable, deterministic recipes"
    >
      <div className="h-full grid grid-cols-1 lg:grid-cols-[240px_1fr_240px] gap-3 min-h-0">
        {/* Saved recipes */}
        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider text-[#9090a8]">Saved</div>
            <button
              onClick={onNew}
              className="h-7 px-2 rounded text-[10px] bg-[#7c6bff]/15 text-[#9b8fff] flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> New
            </button>
          </div>
          <div className="overflow-auto flex-1 space-y-1.5 pr-1">
            {recipes.length === 0 && (
              <div className="text-[11px] text-[#585870] p-3 text-center">
                No recipes yet — build one in the middle pane.
              </div>
            )}
            {recipes.map((r) => (
              <div
                key={r.id}
                className={`px-2.5 py-2 rounded-lg border ${
                  recipe.id === r.id
                    ? 'border-[#7c6bff] bg-[#7c6bff]/8'
                    : 'border-white/[0.06] bg-[#12121a] hover:border-[#7c6bff]/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => onLoad(r)}
                    className="flex-1 text-left text-[11px] font-medium text-[#e8e8f0] truncate"
                  >
                    {r.name}
                  </button>
                  <button
                    onClick={() => onDelete(r.id)}
                    className="p-1 text-[#585870] hover:text-[#f87171]"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-[10px] text-[#585870] mt-0.5">{r.steps.length} steps</div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="overflow-auto pr-1 min-h-0">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <WorkflowIcon className="w-4 h-4 text-[#7c6bff]" />
              <input
                value={recipe.name}
                onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                className="flex-1 h-9 px-3 rounded-lg bg-[#12121a] border border-white/[0.06] text-sm text-[#e8e8f0]"
              />
              <button
                onClick={onSave}
                disabled={!recipe.name.trim() || recipe.steps.length === 0}
                className="h-9 px-3 rounded-lg text-xs font-medium bg-[#7c6bff] text-white disabled:opacity-40 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
            </div>

            <textarea
              value={recipe.description}
              onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
              rows={2}
              placeholder="What does this recipe do?"
              className="w-full px-3 py-2 rounded-lg bg-[#12121a] border border-white/[0.06] text-[11px] text-[#e8e8f0] resize-y"
            />

            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#9090a8] mb-1.5">
                Initial inputs (referenced in steps as <code>{'{name}'}</code>)
              </div>
              <InitialScopeEditor
                scope={recipe.initialScope ?? {}}
                onChange={(s) => setRecipe({ ...recipe, initialScope: s })}
              />
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#9090a8] mb-1.5">Steps</div>
              {recipe.steps.length === 0 && (
                <div className="text-[11px] text-[#585870] p-3 text-center border border-white/[0.06] rounded-lg">
                  Add a tool below to start the recipe.
                </div>
              )}
              {recipe.steps.map((step, i) => {
                const tool = getToolById(step.toolId);
                const ev = events.find((e) => e.stepIndex === i);
                const status = ev?.state;
                return (
                  <div
                    key={step.id}
                    className={`mt-2 p-3 rounded-lg border ${
                      status === 'success'
                        ? 'border-[#4ade80]/40 bg-[#4ade80]/5'
                        : status === 'error'
                          ? 'border-[#f87171]/40 bg-[#f87171]/5'
                          : status === 'start'
                            ? 'border-[#7c6bff]/40 bg-[#7c6bff]/5'
                            : 'border-white/[0.06] bg-[#12121a]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#585870]">Step {i + 1}</span>
                        <span className="text-[11px] font-medium text-[#e8e8f0]">
                          {tool?.name ?? step.toolId}
                        </span>
                      </div>
                      <button
                        onClick={() => removeStep(step.id)}
                        className="p-1 text-[#585870] hover:text-[#f87171]"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {tool?.inputs.map((inp) => (
                        <label key={inp.name} className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase tracking-wider text-[#585870]">
                            {inp.label}
                          </span>
                          {inp.kind === 'text' ? (
                            <textarea
                              value={step.inputs[inp.name] ?? ''}
                              onChange={(e) => updateInput(step.id, inp.name, e.target.value)}
                              rows={2}
                              className="px-2 py-1.5 rounded bg-[#0a0a12] border border-white/[0.06] text-[11px] text-[#e8e8f0] resize-y font-mono"
                            />
                          ) : (
                            <input
                              value={step.inputs[inp.name] ?? ''}
                              onChange={(e) => updateInput(step.id, inp.name, e.target.value)}
                              className="h-8 px-2 rounded bg-[#0a0a12] border border-white/[0.06] text-[11px] text-[#e8e8f0] font-mono"
                            />
                          )}
                        </label>
                      ))}
                      <label className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-[#585870]">
                          Output variable
                        </span>
                        <input
                          value={step.outputVar}
                          onChange={(e) =>
                            updateStep(step.id, {
                              outputVar: e.target.value.replace(/[^a-z0-9_]/gi, '_'),
                            })
                          }
                          className="h-8 px-2 rounded bg-[#0a0a12] border border-white/[0.06] text-[11px] text-[#e8e8f0] font-mono"
                        />
                      </label>
                    </div>
                    {i < recipe.steps.length - 1 && (
                      <div className="flex justify-center mt-2 text-[#585870]">
                        <ArrowDown className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <div className="text-[10px] text-[#585870]">Add tool:</div>
                {tools.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => addStep(t.id)}
                    className="h-7 px-2 rounded text-[10px] bg-white/[0.04] text-[#9090a8] hover:bg-[#7c6bff]/15 hover:text-[#9b8fff]"
                    title={t.description}
                  >
                    <Plus className="w-2.5 h-2.5 inline -mt-0.5 mr-1" />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {running ? (
                <button
                  onClick={onAbort}
                  className="h-9 px-3 rounded-lg text-xs font-medium bg-[#f87171]/15 text-[#f87171] flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5" />
                  Abort
                </button>
              ) : (
                <button
                  onClick={onRun}
                  disabled={recipe.steps.length === 0}
                  className="h-9 px-4 rounded-lg text-xs font-medium bg-[#7c6bff] text-white disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  Run recipe
                </button>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 text-[10px] text-[#f87171] bg-[#f87171]/8 border border-[#f87171]/20 px-2.5 py-1.5 rounded-md">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Run log */}
        <div className="flex flex-col gap-2 min-h-0">
          <div className="text-[11px] uppercase tracking-wider text-[#9090a8]">Run log</div>
          <div className="overflow-auto flex-1 space-y-1.5 pr-1">
            {events.length === 0 && !running && (
              <div className="text-[11px] text-[#585870] p-3 text-center">
                Run the recipe to see outputs here.
              </div>
            )}
            {events.map((e, i) => (
              <div
                key={i}
                className="rounded border border-white/[0.06] bg-[#12121a] p-2 text-[10px]"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {e.state === 'start' && <Loader2 className="w-3 h-3 animate-spin text-[#7c6bff]" />}
                  {e.state === 'success' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                  )}
                  {e.state === 'error' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f87171]" />
                  )}
                  <span className="text-[#e8e8f0] font-medium">
                    Step {e.stepIndex + 1}: {e.toolId}
                  </span>
                </div>
                {e.error && <div className="text-[#f87171] whitespace-pre-wrap">{e.error}</div>}
                {e.state === 'success' && (
                  <div className="text-[#9090a8] whitespace-pre-wrap font-mono break-words">
                    {previewOutput(e.output)}
                  </div>
                )}
              </div>
            ))}

            {Object.keys(scope).length > 0 && (
              <div className="mt-3 pt-2 border-t border-white/[0.06]">
                <div className="text-[10px] uppercase tracking-wider text-[#585870] mb-1">
                  Final scope
                </div>
                {Object.entries(scope).map(([k, v]) => (
                  <div key={k} className="text-[10px] mb-1">
                    <span className="text-[#7c6bff] font-mono">{k}</span>
                    <span className="text-[#9090a8]"> = {previewOutput(v)}</span>
                  </div>
                ))}
              </div>
            )}
            {initialKeys.length > 0 && events.length === 0 && (
              <div className="text-[10px] text-[#585870]">
                Initial variables: {initialKeys.join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function previewOutput(v: unknown): string {
  if (v == null) return '(empty)';
  if (typeof v === 'string') return v.length > 240 ? v.slice(0, 240) + '…' : v;
  try {
    const s = JSON.stringify(v);
    return s.length > 240 ? s.slice(0, 240) + '…' : s;
  } catch {
    return String(v);
  }
}

function InitialScopeEditor({
  scope,
  onChange,
}: {
  scope: Record<string, string>;
  onChange: (s: Record<string, string>) => void;
}) {
  const entries = Object.entries(scope);
  const updateKey = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    const next: Record<string, string> = {};
    for (const [k, v] of entries) next[k === oldKey ? newKey : k] = v;
    onChange(next);
  };
  return (
    <div className="space-y-1.5">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <input
            value={k}
            onChange={(e) => updateKey(k, e.target.value.replace(/[^a-z0-9_]/gi, '_'))}
            className="h-7 px-2 rounded bg-[#0a0a12] border border-white/[0.06] text-[10px] text-[#e8e8f0] font-mono w-32"
          />
          <input
            value={v}
            onChange={(e) => onChange({ ...scope, [k]: e.target.value })}
            placeholder="value"
            className="flex-1 h-7 px-2 rounded bg-[#0a0a12] border border-white/[0.06] text-[10px] text-[#e8e8f0]"
          />
          <button
            onClick={() => {
              const next = { ...scope };
              delete next[k];
              onChange(next);
            }}
            className="p-1 text-[#585870] hover:text-[#f87171]"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange({ ...scope, [`var${entries.length + 1}`]: '' })}
        className="h-7 px-2 rounded text-[10px] bg-white/[0.04] text-[#9090a8] hover:bg-white/[0.08]"
      >
        <Plus className="w-2.5 h-2.5 inline -mt-0.5 mr-1" />
        Add variable
      </button>
    </div>
  );
}
