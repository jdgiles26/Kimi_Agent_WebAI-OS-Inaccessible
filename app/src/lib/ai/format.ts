/**
 * Format raw transformers.js outputs into human-readable text for the AIAppLayout.
 *
 * transformers.js pipelines return per-task-shaped objects. We accept `unknown`
 * and probe at runtime — that is the price of crossing a third-party boundary
 * whose union is intentionally open.
 */
type Record_ = Record<string, unknown>;

function asRecord(v: unknown): Record_ | undefined {
  return v && typeof v === 'object' ? (v as Record_) : undefined;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

export function formatPipelineResult(result: unknown, task: string): string {
  if (result == null) return '(no output)';
  if (typeof result === 'string') return result;

  if (task === 'token-classification') {
    if (Array.isArray(result)) {
      const grouped = new Map<string, Set<string>>();
      for (const item of result) {
        const r = asRecord(item) ?? {};
        const label = (asString(r.entity_group) ?? asString(r.entity)) || 'OTHER';
        const word = asString(r.word) ?? asString(r.text) ?? '';
        if (!grouped.has(label)) grouped.set(label, new Set());
        grouped.get(label)!.add(word.replace(/^##/, ''));
      }
      return Array.from(grouped.entries())
        .map(([k, v]) => `• ${k}: ${Array.from(v).join(', ')}`)
        .join('\n');
    }
  }

  if (task === 'zero-shot-classification') {
    const r = asRecord(Array.isArray(result) ? result[0] : result);
    if (r && Array.isArray(r.labels) && Array.isArray(r.scores)) {
      const labels = r.labels as unknown[];
      const scores = r.scores as unknown[];
      return labels
        .map((l, i) => {
          const score = asNumber(scores[i]) ?? 0;
          return `• ${asString(l) ?? String(l)}: ${(score * 100).toFixed(1)}%`;
        })
        .join('\n');
    }
  }

  if (
    task === 'sentiment-analysis' ||
    task === 'text-classification' ||
    task === 'image-classification'
  ) {
    if (Array.isArray(result)) {
      return result
        .slice(0, 5)
        .map((item) => {
          const r = asRecord(item) ?? {};
          const label = asString(r.label) ?? '';
          const score = asNumber(r.score) ?? 0;
          return `• ${label}: ${(score * 100).toFixed(1)}%`;
        })
        .join('\n');
    }
  }

  if (Array.isArray(result)) {
    return result
      .map((item) => formatSingleResult(item))
      .join('\n');
  }

  return formatSingleResult(result);
}

function formatSingleResult(item: unknown): string {
  if (typeof item === 'string') return item;
  const r = asRecord(item);
  if (!r) return JSON.stringify(item, null, 2);

  if (r.generated_text !== undefined) {
    if (Array.isArray(r.generated_text)) {
      // chat-style output: array of {role, content}
      const last = r.generated_text[r.generated_text.length - 1];
      const lastRec = asRecord(last);
      return asString(lastRec?.content) ?? JSON.stringify(last);
    }
    return asString(r.generated_text) ?? JSON.stringify(r.generated_text);
  }
  if (r.translation_text !== undefined) return asString(r.translation_text) ?? '';
  if (r.summary_text !== undefined) return asString(r.summary_text) ?? '';
  if (r.label !== undefined && r.score !== undefined) {
    return `${asString(r.label)} (${((asNumber(r.score) ?? 0) * 100).toFixed(1)}%)`;
  }
  return JSON.stringify(r, null, 2);
}

/**
 * Strip a leading "assistant" header or echoed prompt that some chat models include.
 */
export function cleanGeneratedText(text: string): string {
  return text
    .replace(/^assistant[:>\s]*/i, '')
    .replace(/^<\|im_start\|>assistant\n?/i, '')
    .replace(/<\|im_end\|>$/i, '')
    .trim();
}
