import { useEffect, useMemo, useState } from 'react';
import {
  Pencil,
  Plus,
  Save,
  Trash2,
  Play,
  Loader2,
  Sparkles,
  AlertTriangle,
  Wand2,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { AppLayout } from '@/apps/AppLayout';
import { MODEL_GARDEN } from '@/lib/ai/modelGarden';
import {
  deleteCustomTool,
  loadCustomModels,
  loadCustomTools,
  saveCustomTool,
  type CustomTool,
} from '@/lib/ai/customTools';
import type { AIDtype, AITask, ModelCard } from '@/lib/ai/types';
import type { Notification } from '@/types/os';
import { runModel } from '@/lib/ai/runtime';
import { cleanGeneratedText, formatPipelineResult } from '@/lib/ai/format';

const ICON_CHOICES = [
  'Sparkles',
  'Wand2',
  'Bot',
  'Brain',
  'Lightbulb',
  'BookOpen',
  'Code2',
  'FileText',
  'PenTool',
  'Music',
  'Mic',
  'Image',
  'Camera',
  'Languages',
  'Search',
  'MessageSquare',
  'Calculator',
  'Database',
  'Workflow',
];

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

interface DraftTool extends Omit<CustomTool, 'createdAt' | 'updatedAt' | 'id'> {
  id?: string;
}

const FRESH_DRAFT: DraftTool = {
  name: '',
  description: '',
  icon: 'Sparkles',
  category: 'My Tools',
  task: 'text-generation',
  modelId: 'smollm2-360m',
  prompt: { system: 'You are a helpful assistant.', userTemplate: '{input}' },
  maxTokens: 220,
  candidateLabels: [],
  inputKind: 'text',
};

export default function ToolStudio({
  onNotify,
}: {
  onNotify?: (t: string, m: string, k: Notification['type']) => void;
}) {
  const [tools, setTools] = useState<CustomTool[]>([]);
  const [draft, setDraft] = useState<DraftTool>(FRESH_DRAFT);
  const [editing, setEditing] = useState<string | null>(null);
  const [customModels, setCustomModels] = useState<{ id: string; name: string; hfId: string; task: AITask; dtype?: string }[]>([]);

  // Test-run state
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    try {
      setTools(await loadCustomTools());
    } catch {
      // IDB schema mismatch or quota error — degrade gracefully to empty list.
      setTools([]);
    }
    try {
      const cm = await loadCustomModels();
      setCustomModels(cm.map((c) => ({ id: c.id, name: c.name, hfId: c.hfId, task: c.task, dtype: c.dtype })));
    } catch {
      // IDB schema mismatch or quota error — degrade gracefully to empty list.
      setCustomModels([]);
    }
  }

  const allModels: (ModelCard & { source?: string })[] = useMemo(() => {
    const customAsCards: (ModelCard & { source?: string })[] = customModels.map((c) => ({
      id: c.id,
      hfId: c.hfId,
      name: c.name,
      task: c.task,
      category: 'text' as const,
      size: 'custom',
      description: 'User-added model',
      good_for: [],
      dtype: (c.dtype as AIDtype | undefined) ?? 'q8',
      source: 'custom',
    }));
    return [...MODEL_GARDEN, ...customAsCards];
  }, [customModels]);

  const compatibleModels = allModels.filter((m) => m.task === draft.task);

  const onPickModel = (id: string) => {
    setDraft((d) => ({ ...d, modelId: id }));
  };

  const onSave = async () => {
    if (!draft.name || !draft.modelId) return;
    const id = editing ?? `tool-${Date.now()}`;
    const now = Date.now();
    const full: CustomTool = {
      id,
      name: draft.name,
      description: draft.description,
      icon: draft.icon,
      category: draft.category || 'My Tools',
      task: draft.task,
      modelId: draft.modelId,
      prompt: draft.prompt,
      maxTokens: draft.maxTokens,
      candidateLabels: draft.candidateLabels,
      inputKind: draft.inputKind,
      modelLabel: allModels.find((m) => m.id === draft.modelId)?.name,
      createdAt: editing ? tools.find((t) => t.id === editing)?.createdAt ?? now : now,
      updatedAt: now,
    };
    await saveCustomTool(full);
    window.dispatchEvent(new Event('webai:custom-tools-updated'));
    onNotify?.('Tool saved', `"${full.name}" is now in your library`, 'success');
    setEditing(null);
    setDraft(FRESH_DRAFT);
    setTestInput('');
    setTestOutput('');
    setTestError(null);
    refresh();
  };

  const onEdit = (t: CustomTool) => {
    setEditing(t.id);
    setDraft({
      name: t.name,
      description: t.description,
      icon: t.icon,
      category: t.category,
      task: t.task,
      modelId: t.modelId,
      prompt: t.prompt ?? { system: '', userTemplate: '{input}' },
      maxTokens: t.maxTokens,
      candidateLabels: t.candidateLabels ?? [],
      inputKind: t.inputKind,
      id: t.id,
    });
  };

  const onDelete = async (id: string) => {
    await deleteCustomTool(id);
    window.dispatchEvent(new Event('webai:custom-tools-updated'));
    onNotify?.('Tool deleted', '', 'info');
    refresh();
  };

  const onTest = async () => {
    if (!draft.modelId) return;
    const card = allModels.find((m) => m.id === draft.modelId);
    if (!card) return;
    setTesting(true);
    setTestError(null);
    setTestOutput('');
    try {
      let raw: unknown;
      if (draft.task === 'text-generation') {
        const messages = [
          { role: 'system', content: draft.prompt?.system ?? '' },
          { role: 'user', content: (draft.prompt?.userTemplate ?? '{input}').replace('{input}', testInput) },
        ];
        raw = await runModel({
          task: 'text-generation',
          modelId: card.hfId,
          input: messages,
          pretrainedOptions: card.pretrainedOptions,
          options: {
            dtype: card.dtype as AIDtype | undefined,
            callOptions: { max_new_tokens: draft.maxTokens ?? 220, return_full_text: false },
          },
        });
      } else if (draft.task === 'zero-shot-classification') {
        raw = await runModel({
          task: 'zero-shot-classification',
          modelId: card.hfId,
          input: testInput,
          options: {
            dtype: card.dtype as AIDtype | undefined,
            callOptions: { candidate_labels: draft.candidateLabels ?? [] },
          },
        });
      } else if (['text2text-generation', 'summarization', 'translation'].includes(draft.task)) {
        const text = draft.prompt
          ? draft.prompt.userTemplate.replace('{input}', testInput)
          : testInput;
        raw = await runModel({
          task: draft.task,
          modelId: card.hfId,
          input: text,
          options: { dtype: card.dtype as AIDtype | undefined },
        });
      } else {
        setTestError(`Live test for "${draft.task}" needs an image/audio input — save and launch the tool to use it.`);
        setTesting(false);
        return;
      }
      setTestOutput(cleanGeneratedText(formatPipelineResult(raw, draft.task)));
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <AppLayout title="Tool Studio" description="Build, save, and reuse your own AI tools">
      <div className="h-full grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 min-h-0">
        {/* Library */}
        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider text-[#9090a8]">Your Tools</div>
            <button
              onClick={() => {
                setEditing(null);
                setDraft(FRESH_DRAFT);
              }}
              className="h-7 px-2 rounded text-[10px] bg-[#7c6bff]/15 text-[#9b8fff] flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> New
            </button>
          </div>
          <div className="overflow-auto flex-1 space-y-1.5 pr-1">
            {tools.length === 0 && (
              <div className="text-[11px] text-[#585870] p-3 text-center">No tools yet — create your first one.</div>
            )}
            {tools.map((t) => {
              const Ico =
                ((Icons as unknown) as Record<
                  string,
                  React.ComponentType<{ className?: string }>
                >)[t.icon] || Icons.Sparkles;
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${
                    editing === t.id
                      ? 'border-[#7c6bff] bg-[#7c6bff]/8'
                      : 'border-white/[0.06] bg-[#12121a] hover:border-[#7c6bff]/30'
                  }`}
                >
                  <Ico className="w-4 h-4 text-[#7c6bff] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-[#e8e8f0] truncate">{t.name}</div>
                    <div className="text-[10px] text-[#585870] truncate">{t.task}</div>
                  </div>
                  <button
                    onClick={() => onEdit(t)}
                    className="p-1 text-[#585870] hover:text-[#e8e8f0]"
                    title="Edit"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDelete(t.id)}
                    className="p-1 text-[#585870] hover:text-[#f87171]"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="overflow-auto pr-1">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-[#7c6bff]" />
              <div className="text-sm font-medium text-[#e8e8f0]">
                {editing ? 'Edit tool' : 'New tool'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Name">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. SQL Doctor"
                  className="w-full h-9 px-3 rounded-lg bg-[#12121a] border border-white/[0.06] text-xs text-[#e8e8f0]"
                />
              </Field>
              <Field label="Category">
                <input
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  placeholder="My Tools"
                  className="w-full h-9 px-3 rounded-lg bg-[#12121a] border border-white/[0.06] text-xs text-[#e8e8f0]"
                />
              </Field>
              <Field label="Description" full>
                <input
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="One-line description for the icon tooltip"
                  className="w-full h-9 px-3 rounded-lg bg-[#12121a] border border-white/[0.06] text-xs text-[#e8e8f0]"
                />
              </Field>
              <Field label="Icon">
                <select
                  value={draft.icon}
                  onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg bg-[#12121a] border border-white/[0.06] text-xs text-[#e8e8f0]"
                >
                  {ICON_CHOICES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Task">
                <select
                  value={draft.task}
                  onChange={(e) => {
                    const task = e.target.value as AITask;
                    const firstModel = allModels.find((m) => m.task === task);
                    setDraft((d) => ({ ...d, task, modelId: firstModel?.id ?? d.modelId }));
                  }}
                  className="w-full h-9 px-3 rounded-lg bg-[#12121a] border border-white/[0.06] text-xs text-[#e8e8f0]"
                >
                  {TASKS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Model" full>
                <select
                  value={draft.modelId}
                  onChange={(e) => onPickModel(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#12121a] border border-white/[0.06] text-xs text-[#e8e8f0]"
                >
                  {compatibleModels.length === 0 && (
                    <option value="">No compatible model — add one in Model Garden</option>
                  )}
                  {compatibleModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.hfId}
                      {m.source === 'custom' ? ' (custom)' : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Input kind">
                <select
                  value={draft.inputKind}
                  onChange={(e) =>
                    setDraft({ ...draft, inputKind: e.target.value as CustomTool['inputKind'] })
                  }
                  className="w-full h-9 px-3 rounded-lg bg-[#12121a] border border-white/[0.06] text-xs text-[#e8e8f0]"
                >
                  <option value="text">text</option>
                  <option value="long-text">long-text</option>
                  <option value="code">code</option>
                  <option value="image">image</option>
                  <option value="audio">audio</option>
                </select>
              </Field>
              {draft.task === 'text-generation' && (
                <Field label="Max new tokens">
                  <input
                    type="number"
                    value={draft.maxTokens ?? 220}
                    onChange={(e) =>
                      setDraft({ ...draft, maxTokens: parseInt(e.target.value || '220', 10) })
                    }
                    className="w-full h-9 px-3 rounded-lg bg-[#12121a] border border-white/[0.06] text-xs text-[#e8e8f0]"
                  />
                </Field>
              )}
            </div>

            {(draft.task === 'text-generation' ||
              draft.task === 'text2text-generation' ||
              draft.task === 'summarization' ||
              draft.task === 'translation') && (
              <div className="space-y-2">
                {draft.task === 'text-generation' && (
                  <Field label="System prompt">
                    <textarea
                      value={draft.prompt?.system ?? ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          prompt: { system: e.target.value, userTemplate: draft.prompt?.userTemplate ?? '{input}' },
                        })
                      }
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-[#12121a] border border-white/[0.06] text-xs text-[#e8e8f0] resize-y"
                    />
                  </Field>
                )}
                <Field label="User template (use {input})">
                  <textarea
                    value={draft.prompt?.userTemplate ?? '{input}'}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        prompt: { system: draft.prompt?.system ?? '', userTemplate: e.target.value },
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-[#12121a] border border-white/[0.06] text-xs text-[#e8e8f0] resize-y font-mono"
                  />
                </Field>
              </div>
            )}

            {draft.task === 'zero-shot-classification' && (
              <Field label="Candidate labels (comma-separated)">
                <input
                  value={(draft.candidateLabels ?? []).join(', ')}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      candidateLabels: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="positive, neutral, negative"
                  className="w-full h-9 px-3 rounded-lg bg-[#12121a] border border-white/[0.06] text-xs text-[#e8e8f0]"
                />
              </Field>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onSave}
                disabled={!draft.name || !draft.modelId}
                className="h-9 px-4 rounded-lg text-xs font-medium bg-[#7c6bff] text-white disabled:opacity-40 flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                {editing ? 'Update tool' : 'Save tool'}
              </button>
            </div>

            {/* Live test */}
            <div className="mt-2 p-3 rounded-lg border border-white/[0.06] bg-[#12121a] space-y-2">
              <div className="flex items-center gap-2 text-[11px] text-[#9090a8]">
                <Play className="w-3.5 h-3.5" />
                Quick test
              </div>
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder={
                  draft.inputKind === 'image' || draft.inputKind === 'audio'
                    ? 'This input kind opens in the saved tool — quick test supports text only.'
                    : 'Type sample input…'
                }
                rows={3}
                disabled={draft.inputKind === 'image' || draft.inputKind === 'audio'}
                className="w-full px-3 py-2 rounded-lg bg-[#0a0a12] border border-white/[0.06] text-xs text-[#e8e8f0] resize-y disabled:opacity-50"
              />
              <div className="flex justify-end">
                <button
                  onClick={onTest}
                  disabled={testing || !testInput.trim() || draft.inputKind === 'image' || draft.inputKind === 'audio'}
                  className="h-8 px-3 rounded text-[11px] bg-white/[0.06] text-[#e8e8f0] hover:bg-white/[0.1] disabled:opacity-40 flex items-center gap-1.5"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Running…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      Test
                    </>
                  )}
                </button>
              </div>
              {(testOutput || testError) && (
                <div
                  className={`text-[11px] whitespace-pre-wrap rounded p-2 ${
                    testError ? 'text-[#f87171] bg-[#f87171]/8' : 'text-[#e8e8f0] bg-[#0a0a12]'
                  }`}
                >
                  {testError ? (
                    <span className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      {testError}
                    </span>
                  ) : (
                    testOutput
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${full ? 'col-span-2' : ''}`}>
      <label className="text-[10px] uppercase tracking-wider text-[#585870]">{label}</label>
      {children}
    </div>
  );
}
