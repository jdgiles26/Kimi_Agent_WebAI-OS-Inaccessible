import { describe, it, expect } from 'vitest';
import { cleanGeneratedText, formatPipelineResult } from './format';

describe('formatPipelineResult', () => {
  it('returns strings unchanged', () => {
    expect(formatPipelineResult('hello', 'text-generation')).toBe('hello');
  });

  it('flattens generated_text from text-generation arrays', () => {
    const r = [{ generated_text: 'one' }, { generated_text: 'two' }];
    expect(formatPipelineResult(r, 'text-generation')).toContain('one');
    expect(formatPipelineResult(r, 'text-generation')).toContain('two');
  });

  it('extracts the last assistant message from chat-style generated_text', () => {
    const r = [
      {
        generated_text: [
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'q' },
          { role: 'assistant', content: 'final answer' },
        ],
      },
    ];
    expect(formatPipelineResult(r, 'text-generation')).toBe('final answer');
  });

  it('formats sentiment-analysis with percentages', () => {
    const r = [{ label: 'POSITIVE', score: 0.97 }];
    const out = formatPipelineResult(r, 'sentiment-analysis');
    expect(out).toContain('POSITIVE');
    expect(out).toContain('97.0%');
  });

  it('formats zero-shot-classification labels with percentages', () => {
    const r = { labels: ['a', 'b'], scores: [0.6, 0.4] };
    const out = formatPipelineResult(r, 'zero-shot-classification');
    expect(out).toContain('a: 60.0%');
    expect(out).toContain('b: 40.0%');
  });

  it('groups token-classification entities by label', () => {
    const r = [
      { entity_group: 'PER', word: 'Alice' },
      { entity_group: 'PER', word: 'Bob' },
      { entity_group: 'ORG', word: 'Acme' },
    ];
    const out = formatPipelineResult(r, 'token-classification');
    expect(out).toContain('PER: Alice, Bob');
    expect(out).toContain('ORG: Acme');
  });

  it('extracts summary_text for summarization', () => {
    const r = [{ summary_text: 'short summary' }];
    expect(formatPipelineResult(r, 'summarization')).toBe('short summary');
  });
});

describe('cleanGeneratedText', () => {
  it('strips an "assistant:" prefix', () => {
    expect(cleanGeneratedText('assistant: hi')).toBe('hi');
    expect(cleanGeneratedText('Assistant> hi')).toBe('hi');
  });
  it('strips chat-control sentinel tokens', () => {
    expect(cleanGeneratedText('<|im_start|>assistant\nhi<|im_end|>')).toBe('hi');
  });
  it('passes through normal text', () => {
    expect(cleanGeneratedText('  hello  ')).toBe('hello');
  });
});
