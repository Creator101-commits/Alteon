import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseStorage } from '@/lib/supabase-storage';
import type { Assignment, Note } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, FileText } from 'lucide-react';

function WidgetCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card data-dashboard-widget className="relative min-h-[200px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function useDashboardAssignments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-assignments', user?.uid],
    queryFn: async () => (user ? supabaseStorage.getAssignmentsByUserId(user.uid) : []),
    enabled: Boolean(user?.uid),
    staleTime: 5 * 60 * 1000,
  });
}

function useDashboardNotes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-notes', user?.uid],
    queryFn: async () => (user ? supabaseStorage.getNotesByUserId(user.uid) : []),
    enabled: Boolean(user?.uid),
    staleTime: 5 * 60 * 1000,
  });
}

export function AssignmentsWidget() {
  const { data: assignments = [], isLoading } = useDashboardAssignments();
  const completedAssignments = assignments.filter(
    (assignment: Assignment) => assignment.status === 'completed',
  ).length;
  const pendingAssignments = assignments.filter(
    (assignment: Assignment) => assignment.status === 'pending',
  ).length;

  if (isLoading) {
    return (
      <WidgetCard title="Assignments">
        <div className="py-8 text-center text-sm text-muted-foreground">Loading assignments...</div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Assignments">
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-2xl font-semibold text-foreground">{assignments.length}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Completed</span>
            <span className="text-foreground">{completedAssignments}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pending</span>
            <span className="text-foreground">{pendingAssignments}</span>
          </div>
        </div>

        {assignments.length > 0 && (
          <div className="pt-2">
            <div className="text-xs text-muted-foreground mb-1">
              {Math.round((completedAssignments / assignments.length) * 100)}% complete
            </div>
            <Progress value={(completedAssignments / assignments.length) * 100} className="h-1" />
          </div>
        )}
      </div>
    </WidgetCard>
  );
}

export function NotesWidget() {
  const { data: notes = [], isLoading } = useDashboardNotes();
  const [, setLocation] = useLocation();

  const recentNotes = [...notes]
    .sort(
      (a: Note, b: Note) =>
        new Date(b.updatedAt ?? b.createdAt).getTime() -
        new Date(a.updatedAt ?? a.createdAt).getTime(),
    )
    .slice(0, 3);

  if (isLoading) {
    return (
      <WidgetCard title="Notes">
        <div className="py-8 text-center text-sm text-muted-foreground">Loading notes...</div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Notes">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="text-2xl font-semibold text-foreground">{notes.length}</div>
            <div className="text-xs text-muted-foreground">Total Notes</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/files')}
            className="h-6 px-2 text-xs"
          >
            View All
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {recentNotes.length === 0 ? (
          <div className="text-center py-4">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No notes yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground mb-1">Recent Notes</div>
            {recentNotes.map((note: Note) => (
              <button
                key={note.id}
                type="button"
                className="w-full text-left text-xs p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                onClick={() => setLocation('/files')}
              >
                <div className="font-medium text-foreground truncate">{note.title || 'Untitled'}</div>
                <div className="text-muted-foreground">
                  {new Date(note.updatedAt ?? note.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {note.category && ` • ${note.category}`}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
