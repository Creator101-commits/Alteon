import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const hacState = vi.hoisted(() => ({
  isConnected: false,
  isLoading: false,
  isRestoring: true,
  error: null as string | null,
  connect: vi.fn(async () => false),
  disconnect: vi.fn(),
  cachedUsername: null as string | null,
  gradesData: null,
  refreshGrades: vi.fn(async () => undefined),
}));

vi.mock('@/contexts/HACContext', () => ({
  useHAC: () => hacState,
}));

import { HACSettings } from '@/components/HACSettings';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  container?.remove();
  root = undefined;
  container = undefined;
  hacState.isRestoring = true;
  hacState.isConnected = false;
});

describe('HAC settings startup state', () => {
  it('does not show a disconnected account while restoring saved credentials', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(React.createElement(HACSettings));
    });

    expect(container.querySelector('[role="status"]')).toHaveTextContent(
      'Checking your HAC connection...',
    );
    expect(container.textContent).not.toContain('Connect HAC Account');
  });
});
