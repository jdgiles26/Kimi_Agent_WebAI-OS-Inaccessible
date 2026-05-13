import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Stub the AI runtime so the App's auto-warmer doesn't pull in transformers.js
// during tests. The warmer fires-and-forgets; we just need it to not throw.
vi.mock('@/apps/AppLayout', async () => {
  const actual = await vi.importActual<typeof import('@/apps/AppLayout')>('@/apps/AppLayout');
  return { ...actual, warmModel: vi.fn(async () => undefined) };
});

import App, { isValidCustomToolId } from './App';
import { warmModel } from '@/apps/AppLayout';

beforeEach(() => {
  // jsdom defaults innerWidth to 1024 which keeps our windowed layout active.
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  // Clear mock call history between tests so warmModel assertions are accurate.
  vi.clearAllMocks();
});

describe('prewarm / auto-load behaviour', () => {
  afterEach(() => {
    // Always clean up to prevent localStorage state from leaking between tests.
    localStorage.removeItem('webai:autoload-models');
  });

  it('does NOT call warmModel on mount when webai:autoload-models key is absent', async () => {
    // Ensure the key is truly absent (not set to any value).
    localStorage.removeItem('webai:autoload-models');
    render(<App />);
    // Flush any pending microtasks / effect callbacks.
    await act(async () => {
      await Promise.resolve();
    });
    expect(warmModel).not.toHaveBeenCalled();
  });

  it('DOES call warmModel on mount when webai:autoload-models is explicitly "on"', async () => {
    localStorage.setItem('webai:autoload-models', 'on');
    render(<App />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(warmModel).toHaveBeenCalled();
  });
});

describe('App shell hit-testing', () => {
  it('routes a click on the Desktop "Web Browser" icon to the launcher', async () => {
    render(<App />);
    // Desktop icon's title includes its long description; Taskbar pinned icon
    // uses the plain app name. Match the descriptive form to disambiguate.
    const browserIcon = await screen.findByTitle(/Web Browser — Browse the web/i);
    await userEvent.click(browserIcon);

    // After launch a Close button (aria-labeled) becomes visible in the title bar.
    const closeBtn = await screen.findByRole('button', { name: /^close$/i });
    expect(closeBtn).toBeInTheDocument();
  });

  it('opens the Start menu when the Start button is clicked', async () => {
    render(<App />);
    const startBtn = await screen.findByRole('button', { name: /start/i });
    await userEvent.click(startBtn);

    // The Start menu uses an input with the "Search apps" placeholder.
    const search = await screen.findByPlaceholderText(/Search apps/i);
    expect(search).toBeInTheDocument();
  });

  it('closes the Start menu via Escape', async () => {
    render(<App />);
    const startBtn = await screen.findByRole('button', { name: /start/i });
    await userEvent.click(startBtn);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByPlaceholderText(/Search apps/i)).not.toBeInTheDocument();
  });

  it('closes a launched window via its Close button', async () => {
    render(<App />);
    const browserIcon = await screen.findByTitle(/Web Browser — Browse the web/i);
    await userEvent.click(browserIcon);

    const closeBtn = await screen.findByRole('button', { name: /^close$/i });
    await userEvent.click(closeBtn);

    expect(screen.queryByRole('button', { name: /^close$/i })).not.toBeInTheDocument();
  });
});

describe('Desktop surfaces Tool Studio for custom tool creation', () => {
  it('shows the Tool Studio desktop icon (entry point for custom tools)', async () => {
    render(<App />);
    const icon = await screen.findByTitle(/Tool Studio — /i);
    expect(icon).toBeInTheDocument();
    await userEvent.click(icon);
    // After click the title bar Close button is the cleanest proof a window opened.
    const closeBtn = await screen.findByRole('button', { name: /^close$/i });
    expect(closeBtn).toBeInTheDocument();
  });
});

describe('isValidCustomToolId', () => {
  it('accepts valid alphanumeric IDs', () => {
    expect(isValidCustomToolId('abc')).toBe(true);
    expect(isValidCustomToolId('my-tool-1')).toBe(true);
    expect(isValidCustomToolId('tool_v2.0')).toBe(true);
    expect(isValidCustomToolId('ABC123')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidCustomToolId('')).toBe(false);
  });

  it('rejects IDs containing a slash', () => {
    expect(isValidCustomToolId('foo/bar')).toBe(false);
    expect(isValidCustomToolId('../secret')).toBe(false);
  });

  it('rejects IDs containing a colon', () => {
    expect(isValidCustomToolId('foo:bar')).toBe(false);
  });

  it('rejects IDs containing spaces', () => {
    expect(isValidCustomToolId('foo bar')).toBe(false);
    expect(isValidCustomToolId(' ')).toBe(false);
  });

  it('rejects IDs with null bytes or control characters', () => {
    expect(isValidCustomToolId('foo\0bar')).toBe(false);
    expect(isValidCustomToolId('foo\nbar')).toBe(false);
  });
});

// Helper kept exported in case other suites want to walk the tree.
export { within };
