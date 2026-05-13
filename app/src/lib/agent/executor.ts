import { getToolById, type ToolContext, type ToolDef } from './tools';

/** A single step in a deterministic recipe. */
export interface RecipeStep {
  /** Stable id for diffing in the UI. */
  id: string;
  toolId: string;
  /** Free-form inputs the user filled out; values may contain `{var}` placeholders. */
  inputs: Record<string, string>;
  /** Variable name to bind this step's output to in the shared scope. */
  outputVar: string;
}

/** A saved recipe document. */
export interface Recipe {
  id: string;
  name: string;
  description: string;
  steps: RecipeStep[];
  /** Free-form initial scope, set by the user when running. */
  initialScope?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface ExecutionEvent {
  stepIndex: number;
  toolId: string;
  state: 'start' | 'success' | 'error';
  output?: unknown;
  error?: string;
  startedAt: number;
  endedAt?: number;
  /**
   * Variable names referenced in this step's inputs that were not present
   * in the scope at resolution time. The literal `{varName}` placeholder was
   * passed to the tool unchanged. Non-empty means a likely typo or missing
   * prior step — surfaced as a warning, not a hard error.
   */
  unresolvedVars?: string[];
}

export interface ExecutionResult {
  scope: Record<string, unknown>;
  events: ExecutionEvent[];
  /** Index of the first failed step, if any. */
  failedAt?: number;
}

/**
 * Run a recipe step-by-step. Each step's output binds to `step.outputVar`;
 * later steps can reference earlier variables via `{var}` in their inputs.
 * Stops on first error; honors AbortSignal.
 */
export async function runRecipe(
  recipe: Recipe,
  ctx: ToolContext,
  initial: Record<string, unknown> = {},
  onEvent?: (e: ExecutionEvent) => void,
): Promise<ExecutionResult> {
  const scope: Record<string, unknown> = { ...(recipe.initialScope ?? {}), ...initial };
  const events: ExecutionEvent[] = [];

  for (let i = 0; i < recipe.steps.length; i++) {
    if (ctx.signal?.aborted) {
      const ev: ExecutionEvent = {
        stepIndex: i,
        toolId: recipe.steps[i].toolId,
        state: 'error',
        error: 'Aborted',
        startedAt: Date.now(),
        endedAt: Date.now(),
      };
      events.push(ev);
      onEvent?.(ev);
      return { scope, events, failedAt: i };
    }

    const step = recipe.steps[i];
    const tool = getToolById(step.toolId);
    if (!tool) {
      const ev: ExecutionEvent = {
        stepIndex: i,
        toolId: step.toolId,
        state: 'error',
        error: `Unknown tool: ${step.toolId}`,
        startedAt: Date.now(),
        endedAt: Date.now(),
      };
      events.push(ev);
      onEvent?.(ev);
      return { scope, events, failedAt: i };
    }

    const { inputs: resolvedInputs, unresolvedVars } = resolveStepInputs(step, tool, scope);
    const start: ExecutionEvent = {
      stepIndex: i,
      toolId: step.toolId,
      state: 'start',
      startedAt: Date.now(),
    };
    events.push(start);
    onEvent?.(start);
    try {
      const output = await tool.run(resolvedInputs, ctx);
      scope[step.outputVar] = output;
      const ev: ExecutionEvent = {
        stepIndex: i,
        toolId: step.toolId,
        state: 'success',
        output,
        startedAt: start.startedAt,
        endedAt: Date.now(),
        ...(unresolvedVars.length > 0 ? { unresolvedVars } : {}),
      };
      events.push(ev);
      onEvent?.(ev);
    } catch (err) {
      const ev: ExecutionEvent = {
        stepIndex: i,
        toolId: step.toolId,
        state: 'error',
        error: err instanceof Error ? err.message : String(err),
        startedAt: start.startedAt,
        endedAt: Date.now(),
      };
      events.push(ev);
      onEvent?.(ev);
      return { scope, events, failedAt: i };
    }
  }
  return { scope, events };
}

/** Substitute every step input. Returns resolved inputs and any unresolved variable names. */
function resolveStepInputs(
  step: RecipeStep,
  tool: ToolDef,
  scope: Record<string, unknown>,
): { inputs: Record<string, unknown>; unresolvedVars: string[] } {
  const out: Record<string, unknown> = {};
  const unresolvedVars: string[] = [];
  for (const def of tool.inputs) {
    const raw = step.inputs[def.name] ?? def.default ?? '';
    if (typeof raw === 'string') {
      const { text, unresolved } = substituteTracked(raw, scope);
      out[def.name] = text;
      for (const v of unresolved) {
        if (!unresolvedVars.includes(v)) unresolvedVars.push(v);
      }
    } else {
      out[def.name] = raw;
    }
  }
  return { inputs: out, unresolvedVars };
}

/**
 * Like `substitute` but also returns an array of variable names that appeared
 * as `{var}` placeholders but were not found in `scope`. The public `substitute`
 * from tools.ts is unchanged; we add this internal variant for the executor.
 */
function substituteTracked(
  template: string,
  scope: Record<string, unknown>,
): { text: string; unresolved: string[] } {
  const unresolved: string[] = [];
  const text = template.replace(/\{([a-zA-Z_][\w]*)\}/g, (m, key) => {
    if (!(key in scope)) {
      if (!unresolved.includes(key)) unresolved.push(key);
      return m; // keep literal — same behavior as substitute()
    }
    const v = scope[key];
    return typeof v === 'string' ? v : JSON.stringify(v);
  });
  return { text, unresolved };
}
