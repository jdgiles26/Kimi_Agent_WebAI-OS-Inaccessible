import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { runModel } from '@/lib/ai/runtime';

// Mock the AI runtime BEFORE importing anything that uses it. We replace
// runModel with a stub that returns a fixed summarization result and assert
// the tool renders it. This is the seam between UI and inference.
vi.mock('@/lib/ai/runtime', () => ({
  runModel: vi.fn(async (args: any) => {
    if (args.task === 'summarization') {
      return [{ summary_text: 'STUB summary of input text' }];
    }
    if (args.task === 'text-generation') {
      return [{ generated_text: 'STUB story output' }];
    }
    if (args.task === 'zero-shot-classification') {
      return { labels: ['neutral', 'positive'], scores: [0.6, 0.4] };
    }
    return null;
  }),
  loadPipeline: vi.fn(async () => ({})),
  detectWebGPU: vi.fn(async () => false),
  getRuntimeSnapshot: vi.fn(() => ({
    loaded: [],
    loading: [],
    webgpuSupported: false,
    preferredDevice: 'wasm' as const,
  })),
  subscribeRuntime: vi.fn(() => () => {}),
  unloadModel: vi.fn(async () => {}),
  unloadAll: vi.fn(async () => {}),
}));

import TLDRGenerator from './ai-research/TLDRGenerator';
import StoryGenerator from './writing/StoryGenerator';
import FactChecker from './ai-research/FactChecker';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AppLayout → useAIProcessor → app rendering', () => {
  it('TLDR Generator renders the summarization result', async () => {
    render(<TLDRGenerator webGPUStatus={{ supported: false }} />);
    const input = await screen.findByPlaceholderText(/Paste long article/i);
    await userEvent.type(input, 'A long article body to be summarized for the test.');
    await userEvent.click(screen.getByRole('button', { name: /summarize/i }));

    expect(await screen.findByText(/STUB summary of input text/)).toBeInTheDocument();
  });

  it('Story Generator renders text-generation output', async () => {
    render(<StoryGenerator webGPUStatus={{ supported: false }} />);
    const input = await screen.findByPlaceholderText(/Enter a story prompt/i);
    await userEvent.type(input, 'A robot learns to paint');
    await userEvent.click(screen.getByRole('button', { name: /generate/i }));

    expect(await screen.findByText(/STUB story output/)).toBeInTheDocument();
  });

  it('Fact Checker renders zero-shot classification with percentages', async () => {
    render(<FactChecker webGPUStatus={{ supported: false }} />);
    const input = await screen.findByPlaceholderText(/claims to fact-check/i);
    await userEvent.type(input, 'The sky is green');
    // FactChecker uses the default "Generate" label or an app-specific one;
    // accept either by clicking the only enabled submit button.
    const submits = screen.getAllByRole('button');
    const submit = submits.find(
      (b) => /verify|generate|run|check/i.test(b.textContent || ''),
    )!;
    await userEvent.click(submit);

    // The format helper renders "label: pct%". 0.6 → 60.0%.
    expect(await screen.findByText(/neutral: 60\.0%/)).toBeInTheDocument();
  });

  it('TLDR Generator surfaces the error message in the DOM when runModel rejects', async () => {
    // Override the default mock for this single test: simulate a model load failure
    // e.g., a 404 from HuggingFace when an ONNX file is missing.
    (runModel as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Failed to fetch: https://huggingface.co/Xenova/distilbart-cnn-6-6/resolve/main/onnx/model.onnx (404 Not Found)'),
    );

    render(<TLDRGenerator webGPUStatus={{ supported: false }} />);
    const input = await screen.findByPlaceholderText(/Paste long article/i);
    await userEvent.type(input, 'Some article text that triggers the error path');
    await userEvent.click(screen.getByRole('button', { name: /summarize/i }));

    // The error message must appear verbatim in the output area.
    expect(
      await screen.findByText(/Failed to fetch.*distilbart.*404 Not Found/i),
    ).toBeInTheDocument();
  });
});
