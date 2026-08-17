import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ColorCustomizationProvider } from "@/contexts/ColorCustomizationContext";
import { CalendarProvider } from "@/contexts/CalendarContext";
import { HACProvider } from "@/contexts/HACContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppStateProvider } from "@/contexts/AppStateContext";
import { lazy, Suspense, type ReactNode } from "react";
import { PageLoading } from "@/components/LoadingSpinner";

import Landing from "@/pages/landing";

const LazyAppLayout = lazy(() => import("@/components/AppLayout"));
const LazyToaster = lazy(() =>
  import("@/components/ui/toaster").then(({ Toaster }) => ({ default: Toaster })),
);
const LazyAuthPage = lazy(() => import("@/pages/auth"));
const LazySignupPage = lazy(() => import("@/pages/signup"));
const LazyCalendarCallback = lazy(() => import("@/pages/calendar-callback"));
const LazyPrivacyPolicy = lazy(() => import("@/pages/privacy-policy"));
const LazyTermsOfService = lazy(() => import("@/pages/terms-of-service"));
const LazyNotFound = lazy(() => import("@/pages/not-found"));

import {
  LazyDashboard,
  LazyCalendar,
  LazyAssignments,
  LazyClasses,
  LazyFiles,
  LazyLearn,
  LazyAiChat,
  LazyHabits,
  LazyToDoList,
  LazySettings,
  LazyHACGrades,
  LazyGPACalculator,
  LazyCourseGrades,
} from "@/components/LazyComponents";


function ProtectedPage({
  children,
  message,
  withCalendar = false,
  withHAC = false,
}: {
  children: ReactNode;
  message: string;
  withCalendar?: boolean;
  withHAC?: boolean;
}) {
  const page = (
    <LazyAppLayout>
      <Suspense fallback={<PageLoading message={message} />}>
        {children}
      </Suspense>
      </LazyAppLayout>
  );
  const withCalendarProvider = withCalendar ? <CalendarProvider>{page}</CalendarProvider> : page;
  const routedPage = withHAC ? <HACProvider>{withCalendarProvider}</HACProvider> : withCalendarProvider;

  return <ProtectedRoute fallback={<Landing />}>{routedPage}</ProtectedRoute>;
}

interface ProtectedRouteConfig {
  path: string;
  message: string;
  render: () => ReactNode;
  withCalendar?: boolean;
  withHAC?: boolean;
}

const protectedRoutes: ProtectedRouteConfig[] = [
  { path: '/dashboard', withCalendar: true, message: 'Loading Dashboard...', render: () => <LazyDashboard /> },
  { path: '/calendar', withCalendar: true, message: 'Loading Calendar...', render: () => <LazyCalendar /> },
  { path: '/assignments', message: 'Loading Assignments...', render: () => <LazyAssignments /> },
  { path: '/classes', message: 'Loading Classes...', render: () => <LazyClasses /> },
  { path: '/files', message: 'Loading Files...', render: () => <LazyFiles /> },
  { path: '/learn', message: 'Loading Learn...', render: () => <LazyLearn /> },
  { path: '/ai-chat', message: 'Loading AI Chat...', render: () => <LazyAiChat /> },
  { path: '/habits', message: 'Loading Habits...', render: () => <LazyHabits /> },
  { path: '/todo-list', message: 'Loading To-Do Board...', render: () => <LazyToDoList /> },
  { path: '/settings', withHAC: true, message: 'Loading Settings...', render: () => <LazySettings /> },
  { path: '/hac-grades', withHAC: true, message: 'Loading HAC Grades...', render: () => <LazyHACGrades /> },
  { path: '/gpa-calculator', withHAC: true, message: 'Loading GPA Calculator...', render: () => <LazyGPACalculator /> },
  { path: '/course-grades/:courseId', withHAC: true, message: 'Loading Course...', render: () => <LazyCourseGrades /> },
];

function Router() {
  const { loading } = useAuth();

  if (loading) {
    return <PageLoading message="Initializing Alteon..." />;
  }

  return (
    <Suspense fallback={<PageLoading message="Loading page..." />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/auth"><LazyAuthPage /></Route>
        <Route path="/signup"><LazySignupPage /></Route>
        <Route path="/auth/calendar/google"><LazyCalendarCallback /></Route>
        <Route path="/auth/calendar/outlook"><LazyCalendarCallback /></Route>
        {protectedRoutes.map(({ path, message, render, withCalendar, withHAC }) => (
          <Route key={path} path={path}>
            <ProtectedPage message={message} withCalendar={withCalendar} withHAC={withHAC}>{render()}</ProtectedPage>
          </Route>
        ))}
        <Route path="/privacy-policy"><LazyPrivacyPolicy /></Route>
        <Route path="/terms-of-service"><LazyTermsOfService /></Route>
        <Route><LazyNotFound /></Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        <ThemeProvider>
          <ColorCustomizationProvider>
            <AuthProvider>
              <Suspense fallback={null}>
                <LazyToaster />
              </Suspense>
                <Router />
            </AuthProvider>
          </ColorCustomizationProvider>
        </ThemeProvider>
      </AppStateProvider>
    </QueryClientProvider>
  );
}

export default App;
