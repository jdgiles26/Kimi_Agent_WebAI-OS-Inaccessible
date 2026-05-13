import { describe, it, expect, vi } from 'vitest';
import { runRecipe, type Recipe } from './executor';
import type { ToolContext } from './tools';

function makeCtx(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    runPipeline: vi.fn(async ({ task }) => {
      if (task === 'summarization') return [{ summary_text: 'a summary' }];
      if (task === 'token-classification')
        return [
          { entity_group: 'PER', word: 'Alice' },
          { entity_group: 'ORG', word: 'Acme' },
        ];
      if (task === 'zero-shot-classification')
        return { labels: ['x', 'y'], scores: [0.7, 0.3] };
      if (task === 'text2text-generation') return [{ generated_text: 'rewritten' }];
      return null;
    }),
    saveNote: vi.fn(async () => undefined),
    fetchUrl: vi.fn(async () => '<html>page body</html>'),
    ...overrides,
  };
}

const baseRecipe: Recipe = {
  id: 'r1',
  name: 'demo',
  description: '',
  steps: [],
  createdAt: 0,
  updatedAt: 0,
};

describe('runRecipe', () => {
  it('binds step output to outputVar and substitutes into the next step', async () => {
    const ctx = makeCtx();
    const recipe: Recipe = {
      ...baseRecipe,
      steps: [
        {
          id: 's1',
          toolId: 'summarize',
          inputs: { text: '{article}' },
          outputVar: 'summary',
        },
        {
          id: 's2',
          toolId: 'extract_entities',
          inputs: { text: '{summary}' },
          outputVar: 'entities',
        },
      ],
    };
    const res = await runRecipe(recipe, ctx, { article: 'big article body' });

    expect(res.failedAt).toBeUndefined();
    expect(res.scope.summary).toBe('a summary');
    expect(Array.isArray(res.scope.entities)).toBe(true);

    // Step 2 should have seen the substituted summary text as input.
    const calls = (ctx.runPipeline as any).mock.calls;
    expect(calls[1][0].input).toBe('a summary');
  });

  it('stops on first error and reports failedAt', async () => {
    const ctx = makeCtx({
      runPipeline: vi.fn(async ({ task }) => {
        if (task === 'summarization') throw new Error('boom');
        return [];
      }),
    });
    const recipe: Recipe = {
      ...baseRecipe,
      steps: [
        { id: 's1', toolId: 'summarize', inputs: { text: 'x' }, outputVar: 'out' },
        { id: 's2', toolId: 'extract_entities', inputs: { text: '{out}' }, outputVar: 'e' },
      ],
    };
    const res = await runRecipe(recipe, ctx);
    expect(res.failedAt).toBe(0);
    expect(res.events.find((e) => e.state === 'error')?.error).toBe('boom');
    // Second step never invoked.
    expect((ctx.runPipeline as any).mock.calls).toHaveLength(1);
  });

  it('honors AbortSignal before starting next step', async () => {
    const controller = new AbortController();
    const ctx = makeCtx({ signal: controller.signal });
    const recipe: Recipe = {
      ...baseRecipe,
      steps: [
        { id: 's1', toolId: 'summarize', inputs: { text: 'x' }, outputVar: 'out' },
        { id: 's2', toolId: 'extract_entities', inputs: { text: '{out}' }, outputVar: 'e' },
      ],
    };
    // Abort immediately so step 0 sees the signal.
    controller.abort();
    const res = await runRecipe(recipe, ctx);
    expect(res.failedAt).toBe(0);
    expect(res.events[0].error).toBe('Aborted');
  });

  it('errors cleanly on unknown tool ids', async () => {
    const recipe: Recipe = {
      ...baseRecipe,
      steps: [
        { id: 's', toolId: 'nope', inputs: {}, outputVar: 'x' },
      ],
    };
    const res = await runRecipe(recipe, makeCtx());
    expect(res.failedAt).toBe(0);
    expect(res.events[0].error).toContain('Unknown tool');
  });

  it('reports unresolved vars in the success event without failing the step', async () => {
    // Step 1 outputs to "summary" but step 2 references the typo "{summarry}".
    // The step should still run (soft warning), not hard-fail.
    const ctx = makeCtx();
    const recipe: Recipe = {
      ...baseRecipe,
      steps: [
        {
          id: 's1',
          toolId: 'summarize',
          inputs: { text: 'test article' },
          outputVar: 'summary',
        },
        {
          id: 's2',
          toolId: 'extract_entities',
          inputs: { text: '{summarry}' }, // intentional typo
          outputVar: 'entities',
        },
      ],
    };
    const res = await runRecipe(recipe, ctx);
    // Should not fail — unresolved vars are a warning, not an error.
    expect(res.failedAt).toBeUndefined();
    // The success event for step 2 should report the unresolved variable.
    const step2Success = res.events.find((e) => e.stepIndex === 1 && e.state === 'success');
    expect(step2Success).toBeDefined();
    expect(step2Success?.unresolvedVars).toContain('summarry');
  });

  it('failed step does not bind its outputVar into scope (no stale ctx leak)', async () => {
    // Step 0 fails; step 1 references {out} which should NOT be in scope.
    // The resolved input to step 1 should still contain the literal "{out}" placeholder
    // if execution somehow continued, but we verify scope is clean.
    const ctx = makeCtx({
      runPipeline: vi.fn(async ({ task }) => {
        if (task === 'summarization') throw new Error('failure');
        return [];
      }),
    });
    const recipe: Recipe = {
      ...baseRecipe,
      steps: [
        { id: 's1', toolId: 'summarize', inputs: { text: 'x' }, outputVar: 'out' },
        { id: 's2', toolId: 'extract_entities', inputs: { text: '{out}' }, outputVar: 'e' },
      ],
    };
    const res = await runRecipe(recipe, ctx);
    expect(res.failedAt).toBe(0);
    // The failed step's outputVar must NOT be in scope — no stale value.
    expect('out' in res.scope).toBe(false);
    // Execution stopped at step 0 — step 1 was never run.
    expect(res.events.filter((e) => e.stepIndex === 1)).toHaveLength(0);
  });

  it('abort mid-execution sets failedAt to the step that was aborted', async () => {
    // Step 0 succeeds, step 1 is aborted mid-execution (the abort fires before step 1 starts).
    const controller = new AbortController();
    let callCount = 0;
    const ctx = makeCtx({
      signal: controller.signal,
      runPipeline: vi.fn(async ({ task }) => {
        callCount++;
        if (task === 'summarization') {
          // Abort after step 0 runs, so step 1 sees the aborted signal.
          controller.abort();
          return [{ summary_text: 'done' }];
        }
        return [];
      }),
    });
    const recipe: Recipe = {
      ...baseRecipe,
      steps: [
        { id: 's1', toolId: 'summarize', inputs: { text: 'x' }, outputVar: 'out' },
        { id: 's2', toolId: 'extract_entities', inputs: { text: '{out}' }, outputVar: 'e' },
      ],
    };
    const res = await runRecipe(recipe, ctx);
    // Step 0 succeeded; step 1 was aborted before it started.
    expect(res.failedAt).toBe(1);
    expect(res.events.find((e) => e.stepIndex === 1)?.error).toBe('Aborted');
    // Only step 0's runPipeline was called — step 1 never ran.
    expect(callCount).toBe(1);
  });

  it('missing {var} keeps literal placeholder text (not empty string or undefined)', async () => {
    // Substituting an absent variable must leave the literal "{missingVar}" text
    // unchanged — not replace it with empty string, "undefined", or "null".
    const ctx = makeCtx();
    const recipe: Recipe = {
      ...baseRecipe,
      steps: [
        {
          id: 's1',
          toolId: 'summarize',
          inputs: { text: '{missingVar}' },
          outputVar: 'summary',
        },
      ],
    };
    const res = await runRecipe(recipe, ctx, {}); // no initial scope
    // Step should complete (missing vars are warnings, not hard errors).
    expect(res.failedAt).toBeUndefined();
    // The unresolved variable should be surfaced in the event.
    const successEv = res.events.find((e) => e.state === 'success');
    expect(successEv?.unresolvedVars).toContain('missingVar');
    // The literal text passed to the tool should be "{missingVar}", not "" or "undefined".
    // We can inspect through ctx.runPipeline calls.
    const calls = (ctx.runPipeline as any).mock.calls;
    expect(calls[0][0].input).toBe('{missingVar}');
  });

  it('runs fetch + summarize chain end-to-end', async () => {
    const ctx = makeCtx();
    const recipe: Recipe = {
      ...baseRecipe,
      steps: [
        { id: 's1', toolId: 'fetch', inputs: { url: '{target}' }, outputVar: 'page' },
        { id: 's2', toolId: 'summarize', inputs: { text: '{page}' }, outputVar: 'summary' },
        {
          id: 's3',
          toolId: 'save_note',
          inputs: { title: 'Summary of {target}', content: '{summary}' },
          outputVar: 'saved',
        },
      ],
    };
    const res = await runRecipe(recipe, ctx, { target: 'https://example.com' });
    expect(res.failedAt).toBeUndefined();
    expect(ctx.fetchUrl).toHaveBeenCalledWith('https://example.com');
    expect(ctx.saveNote).toHaveBeenCalledWith('Summary of https://example.com', 'a summary');
    expect(res.scope.saved).toEqual({ saved: true, title: 'Summary of https://example.com' });
  });
});
