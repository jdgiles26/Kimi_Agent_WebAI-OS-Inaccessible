import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import AppErrorBoundary from './ErrorBoundary';

function Bomb({ go }: { go: boolean }) {
  if (go) throw new Error('boom');
  return <div>ok</div>;
}

describe('AppErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <AppErrorBoundary label="X">
        <div>fine</div>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeInTheDocument();
  });

  it('catches child render errors and shows the fallback', () => {
    // Silence React's expected error log
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <AppErrorBoundary label="MyTool">
        <Bomb go />
      </AppErrorBoundary>,
    );
    expect(screen.getByText(/MyTool crashed/)).toBeInTheDocument();
    expect(screen.getByText(/boom/)).toBeInTheDocument();
    err.mockRestore();
  });

  it('can recover via the Retry button when the child no longer throws', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Harness() {
      const [explode, setExplode] = useState(true);
      return (
        <>
          <button onClick={() => setExplode(false)}>defuse</button>
          <AppErrorBoundary label="X">
            <Bomb go={explode} />
          </AppErrorBoundary>
        </>
      );
    }
    render(<Harness />);
    // First: boundary caught.
    expect(screen.getByText(/X crashed/)).toBeInTheDocument();
    // Defuse the child.
    await userEvent.click(screen.getByText('defuse'));
    // Click Retry on the boundary.
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(screen.getByText('ok')).toBeInTheDocument();
    err.mockRestore();
  });
});
