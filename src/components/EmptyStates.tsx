import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BookOpen, 
  Plus, 
  Layers,
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
