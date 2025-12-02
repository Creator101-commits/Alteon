/**
 * Optimized page wrapper with smooth transitions and loading states
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAppState } from '@/contexts/AppStateContext';
import { PageLoading, Skeleton, CardSkeleton } from '@/components/LoadingSpinner';

interface OptimizedPageWrapperProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  loading?: boolean;
  error?: string | null;
  showSkeleton?: boolean;
  skeletonCount?: number;
}

export function OptimizedPageWrapper({
  children,
  title,
  description,
  className,
  loading = false,
  error = null,
  showSkeleton = false,
  skeletonCount = 3,
}: OptimizedPageWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const { state } = useAppState();
  const { preferences } = state;

  useEffect(() => {
    // Set page title
    if (title) {
      document.title = `${title} - Alteon`;
    }

    // Trigger entrance animation
    const timer = setTimeout(() => {
      setIsVisible(true);
      setShowContent(true);
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [title]);

  const pageVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3,
        ease: 'easeIn',
      },
    },
  };

  const contentVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  const headerVariants = {
    hidden: {
      opacity: 0,
      y: -20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  };

  if (!preferences.animations) {
    // Static version for users who prefer reduced motion
    return (
      <div className={cn('min-h-screen bg-background', className)}>
        {title && (
          <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-6 py-8">
          {loading ? (
            <div className="space-y-6">
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-destructive text-lg font-medium">{error}</div>
              <p className="text-muted-foreground mt-2">Please try again later</p>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      exit="exit"
      className={cn('min-h-screen bg-background', className)}
    >
      {/* Page Header */}
      {title && (
        <motion.div
          variants={headerVariants}
          className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10"
        >
          <div className="max-w-7xl mx-auto px-6 py-4">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-foreground"
            >
              {title}
            </motion.h1>
            {description && (
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground mt-1"
              >
                {description}
              </motion.p>
            )}
          </div>
        </motion.div>
      )}

      {/* Page Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <CardSkeleton />
                </motion.div>
              ))}
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
                className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <svg
                  className="w-8 h-8 text-destructive"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </motion.div>
              <div className="text-destructive text-lg font-medium">{error}</div>
              <p className="text-muted-foreground mt-2">Please try again later</p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              variants={contentVariants}
              initial="hidden"
              animate={showContent ? 'visible' : 'hidden'}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Specialized page wrappers for common use cases
export function DashboardPageWrapper({ children, ...props }: Omit<OptimizedPageWrapperProps, 'title'>) {
  return (
    <OptimizedPageWrapper
      title="Dashboard"
      description="Overview of your academic progress and upcoming tasks"
      {...props}
    >
      {children}
    </OptimizedPageWrapper>
  );
}

export function AssignmentsPageWrapper({ children, ...props }: Omit<OptimizedPageWrapperProps, 'title'>) {
  return (
    <OptimizedPageWrapper
      title="Assignments"
      description="Track and manage your assignments"
      {...props}
    >
      {children}
    </OptimizedPageWrapper>
  );
}

export function NotesPageWrapper({ children, ...props }: Omit<OptimizedPageWrapperProps, 'title'>) {
  return (
    <OptimizedPageWrapper
      title="Notes"
      description="Take and organize your study notes"
      {...props}
    >
      {children}
    </OptimizedPageWrapper>
  );
}

export function CalendarPageWrapper({ children, ...props }: Omit<OptimizedPageWrapperProps, 'title'>) {
  return (
    <OptimizedPageWrapper
      title="Calendar"
      description="Schedule and manage your events"
      {...props}
    >
      {children}
    </OptimizedPageWrapper>
  );
}

export function ClassesPageWrapper({ children, ...props }: Omit<OptimizedPageWrapperProps, 'title'>) {
  return (
    <OptimizedPageWrapper
      title="Classes"
      description="Manage your classes and courses"
      {...props}
    >
      {children}
    </OptimizedPageWrapper>
  );
}

export function LearnPageWrapper({ children, ...props }: Omit<OptimizedPageWrapperProps, 'title'>) {
  return (
    <OptimizedPageWrapper
      title="Learn"
      description="Study tools and resources"
      {...props}
    >
      {children}
    </OptimizedPageWrapper>
  );
}

export function AnalyticsPageWrapper({ children, ...props }: Omit<OptimizedPageWrapperProps, 'title'>) {
  return (
    <OptimizedPageWrapper
      title="Analytics"
      description="View your academic progress and insights"
      {...props}
    >
      {children}
    </OptimizedPageWrapper>
  );
}

export function SettingsPageWrapper({ children, ...props }: Omit<OptimizedPageWrapperProps, 'title'>) {
  return (
    <OptimizedPageWrapper
      title="Settings"
      description="Customize your app experience"
      {...props}
    >
      {children}
    </OptimizedPageWrapper>
  );
}
