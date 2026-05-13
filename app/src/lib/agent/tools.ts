import type { AITask } from '@/lib/ai/types';

/**
 * Declarative tool definition. The Workflow Builder composes these into
 * step lists. Each tool is referenced by `id`; inputs are bound from the
 * shared variable scope using `{name}` templates.
 */
export interface ToolDef {
  id: string;
  name: string;
  description: string;
  /** Underlying transformers.js task, if any. */
  task?: AITask;
  /** Default model id from the Garden, if this tool wraps a model call. */
  modelId?: string;
  /** Named inputs the user provides per step (in addition to template substitution). */
  inputs: {
    name: string;
    label: string;
    kind: 'text' | 'string' | 'labels' | 'number' | 'boolean';
    default?: string | number | boolean;
  }[];
  /**
   * Executes the tool against a resolved input scope. Returns the value
   * stored under the step's output variable.
   *
   * `ctx.run` is a thin wrapper that the executor injects; it calls the AI
   * runtime so unit tests can stub it.
   */
  run: (scope: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
}

export interface ToolContext {
  /** Run an AI pipeline. Tests inject a stub. */
  runPipeline: (args: {
    task: AITask;
    modelId: string;
    input: unknown;
    callOptions?: Record<string, unknown>;
  }) => Promise<unknown>;
  /** AbortSignal for cancellation. */
  signal?: AbortSignal;
  /** Persist a key/value pair to the user's notes (`runHistory` table). */
  saveNote?: (title: string, content: string) => Promise<void>;
  /** Fetch a URL via the local proxy. */
  fetchUrl?: (url: string) => Promise<string>;
}

/** Replace `{var}` placeholders in `template` from `scope`. Unknown vars stay literal. */
export function substitute(template: string, scope: Record<string, unknown>): string {
  return template.replace(/\{([a-zA-Z_][\w]*)\}/g, (m, key) => {
    if (!(key in scope)) return m;
    const v = scope[key];
    return typeof v === 'string' ? v : JSON.stringify(v);
  });
}

export const BUILTIN_TOOLS: ToolDef[] = [
  {
    id: 'summarize',
    name: 'Summarize',
    description: 'Summarize a passage with DistilBART CNN.',
    task: 'summarization',
    modelId: 'distilbart-cnn-6-6',
    inputs: [{ name: 'text', label: 'Text', kind: 'text' }],
    run: async (scope, ctx) => {
      const out = await ctx.runPipeline({
        task: 'summarization',
        modelId: 'Xenova/distilbart-cnn-6-6',
        input: substitute(String(scope.text ?? ''), scope),
        callOptions: { max_new_tokens: 180, min_new_tokens: 24 },
      });
      const arr = Array.isArray(out) ? out : [out];
      return arr[0]?.summary_text ?? String(out);
    },
  },
  {
    id: 'extract_entities',
    name: 'Extract Entities (NER)',
    description: 'Pull named entities (PERSON / ORG / LOC) from text using BERT-NER.',
    task: 'token-classification',
    modelId: 'bert-ner',
    inputs: [{ name: 'text', label: 'Text', kind: 'text' }],
    run: async (scope, ctx) => {
      const out = await ctx.runPipeline({
        task: 'token-classification',
        modelId: 'Xenova/bert-base-NER',
        input: substitute(String(scope.text ?? ''), scope),
        callOptions: { aggregation_strategy: 'simple' },
      });
      return out;
    },
  },
  {
    id: 'classify',
    name: 'Zero-shot Classify',
    description: 'Classify text against a list of candidate labels.',
    task: 'zero-shot-classification',
    modelId: 'mobilebert-mnli',
    inputs: [
      { name: 'text', label: 'Text', kind: 'text' },
      { name: 'labels', label: 'Candidate labels (comma-separated)', kind: 'labels' },
    ],
    run: async (scope, ctx) => {
      const labels = Array.isArray(scope.labels)
        ? scope.labels
        : String(scope.labels ?? '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
      return ctx.runPipeline({
        task: 'zero-shot-classification',
        modelId: 'Xenova/mobilebert-uncased-mnli',
        input: substitute(String(scope.text ?? ''), scope),
        callOptions: { candidate_labels: labels },
      });
    },
  },
  {
    id: 'rewrite',
    name: 'Rewrite (Flan-T5)',
    description: 'Rewrite text with a prompt template using Flan-T5 Small.',
    task: 'text2text-generation',
    modelId: 'flan-t5-small',
    inputs: [
      {
        name: 'prompt',
        label: 'Prompt template (use {text})',
        kind: 'string',
        default: 'Rewrite in a friendly tone: {text}',
      },
      { name: 'text', label: 'Text', kind: 'text' },
    ],
    run: async (scope, ctx) => {
      const prompt = substitute(String(scope.prompt ?? '{text}'), scope);
      const out = await ctx.runPipeline({
        task: 'text2text-generation',
        modelId: 'Xenova/flan-t5-small',
        input: prompt,
      });
      const arr = Array.isArray(out) ? out : [out];
      return arr[0]?.generated_text ?? String(out);
    },
  },
  {
    id: 'fetch',
    name: 'Fetch URL',
    description: 'Fetch a web page through the local proxy (HTML extracted to text).',
    inputs: [{ name: 'url', label: 'URL', kind: 'string' }],
    run: async (scope, ctx) => {
      if (!ctx.fetchUrl) throw new Error('fetchUrl not available');
      const url = substitute(String(scope.url ?? ''), scope);
      return ctx.fetchUrl(url);
    },
  },
  {
    id: 'save_note',
    name: 'Save Note',
    description: 'Persist a value as a note in run history.',
    inputs: [
      { name: 'title', label: 'Title', kind: 'string' },
      { name: 'content', label: 'Content', kind: 'text' },
    ],
    run: async (scope, ctx) => {
      if (!ctx.saveNote) throw new Error('saveNote not available');
      const title = substitute(String(scope.title ?? 'Untitled'), scope);
      const content = substitute(String(scope.content ?? ''), scope);
      await ctx.saveNote(title, content);
      return { saved: true, title };
    },
  },
];

const byId = new Map(BUILTIN_TOOLS.map((t) => [t.id, t]));
export function getToolById(id: string): ToolDef | undefined {
  return byId.get(id);
}
