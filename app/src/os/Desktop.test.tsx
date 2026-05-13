import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Desktop from './Desktop';

describe('Desktop', () => {
  it('launches an app when its icon is clicked', async () => {
    const onLaunchApp = vi.fn();
    render(<Desktop onLaunchApp={onLaunchApp} />);

    const browserBtn = await screen.findByTitle(/Web Browser/i);
    await userEvent.click(browserBtn);

    expect(onLaunchApp).toHaveBeenCalledWith('browser');
  });

  it('exposes every featured icon as a clickable button', async () => {
    const onLaunchApp = vi.fn();
    render(<Desktop onLaunchApp={onLaunchApp} />);
    // The featured grid renders 18 built-in icons.
    const buttons = await screen.findAllByRole('button');
    // Allow extra buttons (custom-tools row); just assert minimum.
    expect(buttons.length).toBeGreaterThanOrEqual(18);
  });

  it('renders exactly 18 featured app icons (no silent drops from ID typos)', async () => {
    const onLaunchApp = vi.fn();
    render(<Desktop onLaunchApp={onLaunchApp} />);
    // The desktop hardcodes 18 featured app IDs. If any ID is missing from
    // appRegistry the icon disappears silently. This test catches that.
    // We match by title which includes "AppName — description".
    const expectedTitles = [
      /Web Browser/i,
      /Terminal/i,
      /File Manager/i,
      /Settings/i,
      /Calculator/i,
      /Calendar/i,
      /Model Garden/i,
      /Tool Studio/i,
      /Workflow Builder/i,
      /Chat with Page/i,
      /TL;DR Generator/i,
      /Fact Checker/i,
      /Remote Access/i,
      /Code Explainer/i,
      /Alt Text Gen/i,
      /Background Remover/i,
      /Live Transcriber/i,
      /Text to Speech/i,
    ];

    for (const titleRe of expectedTitles) {
      const btn = await screen.findByTitle(titleRe);
      expect(btn).toBeInTheDocument();
    }
  });
});
