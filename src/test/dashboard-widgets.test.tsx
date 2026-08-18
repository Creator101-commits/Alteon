import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  user: { uid: 'user-1' },
}));

const dashboardData = vi.hoisted(() => ({
  getAssignmentsByUserId: vi.fn(() => [
    { id: 'assignment-1', title: 'Essay', status: 'completed' },
    { id: 'assignment-2', title: 'Lab', status: 'pending' },
  ]),
  getNotesByUserId: vi.fn(() => [
    {
      id: 'note-1',
      title: 'Study plan',
      category: 'school',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
    },
  ]),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/contexts/CalendarContext', () => ({
  useCalendar: () => ({ events: [] }),
}));

vi.mock('@/components/SimpleTodoList', () => ({
  SimpleTodoList: () => <div>Quick Tasks</div>,
}));

vi.mock('@/lib/supabase-storage', () => ({
  supabaseStorage: dashboardData,
  storage: dashboardData,
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/dashboard', vi.fn()],
}));

import Dashboard from '@/pages/dashboard';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

const renderDashboard = async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    root?.render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  return container;
};

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  container?.remove();
  root = undefined;
  container = undefined;
});

describe('dashboard widgets', () => {
  it('renders only the assignments and notes widgets from the previous dashboard', async () => {
    const app = await renderDashboard();
    expect(app.textContent).toContain('Study plan');
    expect(app.querySelectorAll('[data-dashboard-widget]')).toHaveLength(2);
    expect(app.textContent).toContain('Assignments');
    expect(app.textContent).toContain('Notes');
    expect(app.textContent).toContain('Study plan');
    expect(app.textContent).toContain('2');
    expect(app.textContent).toContain('1');
    expect(app.textContent).not.toContain('Pomodoro');
    expect(dashboardData.getAssignmentsByUserId).toHaveBeenCalledWith('user-1');
    expect(dashboardData.getNotesByUserId).toHaveBeenCalledWith('user-1');
  });
});
