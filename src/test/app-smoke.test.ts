import React, { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  user: null,
  loading: false,
  hasGoogleAccess: false,
  signIn: vi.fn(async () => undefined),
  signInWithEmailPassword: vi.fn(async () => undefined),
  signUpWithEmailPassword: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
}));

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => authState,
}));

vi.mock('@/contexts/CalendarContext', () => ({
  CalendarProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/contexts/HACContext', () => ({
  HACProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('@/components/ui/toaster', () => ({
  Toaster: () => null,
}));

vi.mock('@/pages/calendar-callback', () => ({
  default: () => null,
}));

import App from '@/App';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

const flushReact = () => new Promise<void>((resolve) => setTimeout(resolve, 10));

async function mountAt(path: string) {
  window.history.replaceState({}, '', path);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  const startedAt = performance.now();
  await act(async () => {
    root?.render(React.createElement(App));
    await flushReact();
  });
  await act(async () => {
    await vi.dynamicImportSettled();
    await flushReact();
  });

  return {
    container,
    duration: performance.now() - startedAt,
  };
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  container?.remove();
  root = undefined;
  container = undefined;
  window.history.replaceState({}, '', '/');
});

describe('application smoke tests', () => {
  it('mounts the public shell quickly', async () => {
    const { container: app, duration } = await mountAt('/');

    expect(app.textContent).toContain('StudySmarter');
    expect(app.querySelector('img[alt="Alteon Logo"]')).toHaveAttribute(
      'src',
      expect.stringContaining('alteon-logo'),
    );
    expect(duration).toBeLessThan(1000);
  });

  it.each([
    ['/', 'StudySmarter'],
    ['/auth', 'Welcome to Alteon'],
    ['/signup', 'Create Your Account'],
    ['/privacy-policy', 'Privacy Policy'],
    ['/terms-of-service', 'Terms of Service'],
  ])('renders the public route %s', async (path, expectedText) => {
    const { container: app } = await mountAt(path);

    expect(app.textContent).toContain(expectedText);
  });

  it('does not expose the removed analytics route', async () => {
    const { container: app } = await mountAt('/analytics');

    expect(app.textContent).toContain('404 Page Not Found');
  });
});
