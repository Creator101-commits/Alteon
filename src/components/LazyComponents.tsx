/**
 * Lazy-loaded components for better performance and smaller initial bundle
 * Uses React.lazy with dynamic imports for code splitting
 */

import { lazy } from 'react';

// ============================================
// PAGE COMPONENTS - Lazy loaded routes
// ============================================
export const LazyDashboard = lazy(() => import('@/pages/dashboard'));
export const LazyCalendar = lazy(() => import('@/pages/calendar'));
export const LazyAssignments = lazy(() => import('@/pages/assignments'));
export const LazyClasses = lazy(() => import('@/pages/classes'));
export const LazyFiles = lazy(() => import('@/pages/files'));
export const LazyLearn = lazy(() => import('@/pages/learn'));
export const LazyAiChat = lazy(() => import('@/pages/ai-chat'));
export const LazyHabits = lazy(() => import('@/pages/habits'));
export const LazyToDoList = lazy(() => import('@/components/tools/ToDoList').then(m => ({ default: m.ToDoList })));
export const LazySettings = lazy(() => import('@/pages/settings'));
export const LazyHACGrades = lazy(() => import('@/pages/hac-grades'));
export const LazyGPACalculator = lazy(() => import('@/pages/gpa-calculator'));
export const LazyCourseGrades = lazy(() => import('@/pages/course-grades'));
