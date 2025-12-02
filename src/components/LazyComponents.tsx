/**
 * Lazy-loaded components for better performance and smaller initial bundle
 */

import { lazy } from 'react';

// Lazy load heavy components
export const LazyDashboard = lazy(() => import('@/pages/dashboard'));
export const LazyCalendar = lazy(() => import('@/pages/calendar'));
export const LazyAssignments = lazy(() => import('@/pages/assignments'));
export const LazyClasses = lazy(() => import('@/pages/classes'));
export const LazyNotes = lazy(() => import('@/pages/notes'));
export const LazyLearn = lazy(() => import('@/pages/learn'));
export const LazyAiChat = lazy(() => import('@/pages/ai-chat'));
export const LazyAnalytics = lazy(() => import('@/pages/analytics'));
export const LazyHabits = lazy(() => import('@/pages/habits'));
export const LazyTodos = lazy(() => import('@/pages/todos'));
export const LazyToDoList = lazy(() => import('@/components/tools/ToDoList').then(m => ({ default: m.ToDoList })));
export const LazySettings = lazy(() => import('@/pages/settings'));

// Lazy load heavy UI components
export const LazyAnalyticsCharts = lazy(() => import('@/components/charts/AnalyticsCharts').then(m => ({ default: m.AnalyticsCharts })));
export const LazyNoteEditor = lazy(() => import('@/components/NoteEditor'));
export const LazyFlashcards = lazy(() => import('@/components/tools/Flashcards'));
export const LazyDeckManager = lazy(() => import('@/components/tools/DeckManager'));
export const LazyPomodoroTimer = lazy(() => import('@/components/tools/PomodoroTimer').then(m => ({ default: m.PomodoroTimer })));
export const LazyMoodTracker = lazy(() => import('@/components/tools/MoodTracker').then(m => ({ default: m.MoodTracker })));
export const LazyDailyJournal = lazy(() => import('@/components/tools/DailyJournal').then(m => ({ default: m.DailyJournal })));
export const LazyAiSummaryHistory = lazy(() => import('@/components/tools/AiSummaryHistory').then(m => ({ default: m.AiSummaryHistory })));

// Lazy load settings components
export const LazyGoogleSyncSettings = lazy(() => import('@/components/GoogleSyncSettings').then(m => ({ default: m.GoogleSyncSettings })));
export const LazyColorCustomizationSettings = lazy(() => import('@/components/ColorCustomizationSettings').then(m => ({ default: m.ColorCustomizationSettings })));
export const LazyPrivacyControls = lazy(() => import('@/components/PrivacyControls').then(m => ({ default: m.PrivacyControls })));
