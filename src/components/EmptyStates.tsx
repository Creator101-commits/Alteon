import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BookOpen, 
  Plus, 
  AlertCircle, 
  WifiOff, 
  Search,
  Calendar,
  StickyNote,
  Layers,
  Brain,
  BarChart3
} from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Generic empty state component
 */
export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <Card className="border-dashed">
    <CardContent className="flex flex-col items-center justify-center text-center py-12">
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick}>
          <Plus className="h-4 w-4 mr-2" />
          {action.label}
        </Button>
      )}
    </CardContent>
  </Card>
);

/**
 * No assignments empty state
 */
export const NoAssignments = ({ onAdd }: { onAdd: () => void }) => (
  <EmptyState
    icon={<BookOpen className="h-16 w-16" />}
    title="No assignments yet"
    description="Create your first assignment or sync with Google Classroom to get started"
    action={{
      label: "Add Assignment",
      onClick: onAdd
    }}
  />
);

/**
 * No classes empty state
 */
export const NoClasses = ({ onAdd }: { onAdd: () => void }) => (
  <EmptyState
    icon={<Layers className="h-16 w-16" />}
    title="No classes yet"
    description="Add your first class to organize your coursework and assignments"
    action={{
      label: "Add Class",
      onClick: onAdd
    }}
  />
);

/**
 * No notes empty state
 */
export const NoNotes = ({ onAdd }: { onAdd: () => void }) => (
  <EmptyState
    icon={<StickyNote className="h-16 w-16" />}
    title="No notes yet"
    description="Start taking notes to keep track of important information"
    action={{
      label: "Create Note",
      onClick: onAdd
    }}
  />
);

/**
 * No flashcards empty state
 */
export const NoFlashcards = ({ onAdd }: { onAdd: () => void }) => (
  <EmptyState
    icon={<Brain className="h-16 w-16" />}
    title="No flashcards yet"
    description="Create flashcard decks to help you study and memorize"
    action={{
      label: "Create Deck",
      onClick: onAdd
    }}
  />
);

/**
 * No search results empty state
 */
export const NoSearchResults = ({ query }: { query: string }) => (
  <EmptyState
    icon={<Search className="h-16 w-16" />}
    title="No results found"
    description={`No items match "${query}". Try adjusting your search.`}
  />
);

/**
 * Error state component
 */
export const ErrorState = ({ 
  title = "Something went wrong", 
  description = "An error occurred while loading this content.",
  onRetry 
}: { 
  title?: string; 
  description?: string;
  onRetry?: () => void;
}) => (
  <Card className="border-destructive/50">
    <CardContent className="flex flex-col items-center justify-center text-center py-12">
      <AlertCircle className="h-16 w-16 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </CardContent>
  </Card>
);

/**
 * Offline indicator
 */
export const OfflineIndicator = () => (
  <div className="fixed bottom-4 right-4 z-50">
    <Card className="border-destructive bg-destructive/10">
      <CardContent className="flex items-center gap-2 p-3">
        <WifiOff className="h-4 w-4 text-destructive" />
        <span className="text-sm font-medium text-destructive">
          You're offline
        </span>
      </CardContent>
    </Card>
  </div>
);

/**
 * Sync in progress indicator
 */
export const SyncingIndicator = () => (
  <div className="fixed bottom-4 right-4 z-50">
    <Card className="bg-primary/10 border-primary/50">
      <CardContent className="flex items-center gap-2 p-3">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span className="text-sm font-medium text-primary">
          Syncing...
        </span>
      </CardContent>
    </Card>
  </div>
);

/**
 * No calendar events empty state
 */
export const NoCalendarEvents = () => (
  <EmptyState
    icon={<Calendar className="h-16 w-16" />}
    title="No events scheduled"
    description="Your calendar is clear. Add events to stay organized."
  />
);

/**
 * No analytics data empty state
 */
export const NoAnalytics = () => (
  <EmptyState
    icon={<BarChart3 className="h-16 w-16" />}
    title="Not enough data yet"
    description="Complete some assignments and track your progress to see analytics."
  />
);

/**
 * Network error state
 */
export const NetworkError = ({ onRetry }: { onRetry?: () => void }) => (
  <Card className="border-destructive/50">
    <CardContent className="flex flex-col items-center justify-center text-center py-12">
      <WifiOff className="h-16 w-16 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">Connection Lost</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Unable to connect to the server. Please check your internet connection.
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Retry Connection
        </Button>
      )}
    </CardContent>
  </Card>
);
