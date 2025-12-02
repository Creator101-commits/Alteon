/**
 * Optimized navigation component with smooth transitions and better UX
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAppState } from '@/contexts/AppStateContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  Calendar,
  BookOpen,
  GraduationCap,
  StickyNote,
  Brain,
  BarChart3,
  Target,
  Settings,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  description?: string;
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: Home,
    description: 'Overview of your academic progress',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    path: '/calendar',
    icon: Calendar,
    description: 'Schedule and events',
  },
  {
    id: 'assignments',
    label: 'Assignments',
    path: '/assignments',
    icon: BookOpen,
    description: 'Track your assignments',
  },
  {
    id: 'classes',
    label: 'Classes',
    path: '/classes',
    icon: GraduationCap,
    description: 'Manage your classes',
  },
  {
    id: 'notes',
    label: 'Notes',
    path: '/notes',
    icon: StickyNote,
    description: 'Take and organize notes',
  },
  {
    id: 'learn',
    label: 'Learn',
    path: '/learn',
    icon: Brain,
    description: 'Study tools and resources',
  },
  {
    id: 'ai-chat',
    label: 'AI Chat',
    path: '/ai-chat',
    icon: Brain,
    description: 'Chat with AI assistant',
  },
  {
    id: 'habits',
    label: 'Habits',
    path: '/habits',
    icon: Target,
    description: 'Build study habits',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    description: 'App preferences',
  },
];

interface OptimizedNavigationProps {
  className?: string;
}

export function OptimizedNavigation({ className }: OptimizedNavigationProps) {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  // Hover state removed
  const { state } = useAppState();
  const { preferences } = state;

  // Close navigation on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location]);


  const handleNavigation = useCallback((path: string) => {
    setLocation(path);
    setIsOpen(false);
  }, [setLocation]);

  const getCurrentPageLabel = useCallback(() => {
    const currentItem = navigationItems.find(item => item.path === location);
    return currentItem?.label || 'Alteon';
  }, [location]);

  const navVariants = {
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
    closed: {
      x: '-100%',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05,
        type: 'spring',
        stiffness: 300,
        damping: 25,
      },
    }),
    // Hover effects removed
  };

  if (!preferences.animations) {
    // Static version for users who prefer reduced motion
    return (
      <nav className={cn('fixed left-0 top-0 h-full w-64 bg-background border-r border-border z-50', className)}>
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-8">
            <img src="../images/alteon-logo.png" alt="Alteon Logo" className="h-6 w-6 object-contain" />
            <span className="text-lg font-semibold">Alteon</span>
          </div>
          
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div
              key="menu"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Menu className="h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Navigation */}
      <motion.nav
        variants={navVariants}
        initial="closed"
        animate={isOpen ? 'open' : 'closed'}
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-background/95 backdrop-blur-sm border-r border-border z-50 lg:translate-x-0 lg:static lg:bg-background',
          className
        )}
      >
        <div className="p-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center space-x-2 mb-8"
          >
            <img src="../images/alteon-logo.png" alt="Alteon Logo" className="h-6 w-6 object-contain" />
            <span className="text-lg font-semibold">Alteon</span>
          </motion.div>

          {/* Navigation items */}
          <div className="space-y-1">
            {navigationItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              // Hover state removed

              return (
                <motion.div
                  key={item.id}
                  custom={index}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  // Hover effects removed
                >
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group relative overflow-hidden',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-muted-foreground'
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground rounded-r-full"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}

                    {/* Icon */}
                    <motion.div
                      animate={{
                        scale: isActive ? 1.1 : 1,
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      <Icon className="h-5 w-5" />
                    </motion.div>

                    {/* Label */}
                    <span className="font-medium flex-1">{item.label}</span>

                    {/* Badge */}
                    {item.badge && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      </motion.div>
                    )}

                    {/* Hover arrow removed - hover effects disabled */}
                  </button>

                  {/* Tooltip removed - hover effects disabled */}
                </motion.div>
              );
            })}
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 pt-6 border-t border-border"
          >
            <div className="text-xs text-muted-foreground text-center">
              <p>Current page: {getCurrentPageLabel()}</p>
            </div>
          </motion.div>
        </div>
      </motion.nav>
    </>
  );
}
