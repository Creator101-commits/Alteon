import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/lib/api';

// Hook for fetching assignments data
export const useAssignments = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['assignments', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const response = await apiGet(`/api/users/${user.uid}/assignments`);
      if (!response.ok) throw new Error('Failed to fetch assignments');
      return response.json();
    },
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for fetching notes data
export const useNotes = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['notes', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const response = await apiGet(`/api/notes`);
      if (!response.ok) throw new Error('Failed to fetch notes');
      return response.json();
    },
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook for fetching pomodoro sessions
export const usePomodoroSessions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['pomodoro-sessions', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const response = await apiGet(`/api/users/${user.uid}/pomodoro-sessions`);
      if (!response.ok) throw new Error('Failed to fetch pomodoro sessions');
      return response.json();
    },
    enabled: !!user?.uid,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook for fetching flashcards
export const useFlashcards = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['flashcards', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const response = await apiGet(`/api/users/${user.uid}/flashcards`);
      if (!response.ok) throw new Error('Failed to fetch flashcards');
      return response.json();
    },
    enabled: !!user?.uid,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook for fetching mood entries
export const useMoodEntries = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['mood-entries', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const response = await apiGet(`/api/users/${user.uid}/mood-entries`);
      if (!response.ok) throw new Error('Failed to fetch mood entries');
      return response.json();
    },
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000,
  });
};

// Hook for fetching journal entries
export const useJournalEntries = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['journal-entries', user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const response = await apiGet(`/api/users/${user.uid}/journal-entries`);
      if (!response.ok) throw new Error('Failed to fetch journal entries');
      return response.json();
    },
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000,
  });
};

// Combined hook for dashboard analytics
export const useDashboardAnalytics = () => {
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments();
  const { data: notes = [], isLoading: notesLoading } = useNotes();
  const { data: pomodoroSessions = [], isLoading: pomodoroLoading } = usePomodoroSessions();
  const { data: flashcards = [], isLoading: flashcardsLoading } = useFlashcards();
  const { data: moodEntries = [], isLoading: moodLoading } = useMoodEntries();
  const { data: journalEntries = [], isLoading: journalLoading } = useJournalEntries();

  const isLoading = assignmentsLoading || notesLoading || pomodoroLoading || 
                   flashcardsLoading || moodLoading || journalLoading;

  // Calculate analytics
  const analytics = {
    totalAssignments: assignments.length,
    completedAssignments: assignments.filter((a: any) => a.status === 'completed').length,
    pendingAssignments: assignments.filter((a: any) => a.status === 'pending').length,
    overdueAssignments: assignments.filter((a: any) => {
      if (!a.dueDate) return false;
      return new Date(a.dueDate) < new Date() && a.status !== 'completed';
    }).length,
    
    totalNotes: notes.length,
    recentNotes: notes.filter((n: any) => {
      const noteDate = new Date(n.updatedAt || n.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return noteDate > weekAgo;
    }).length,
    
    totalPomodoroSessions: pomodoroSessions.length,
    totalStudyTime: pomodoroSessions.reduce((total: number, session: any) => {
      return total + (session.duration || 0);
    }, 0),
    todaySessions: pomodoroSessions.filter((s: any) => {
      const sessionDate = new Date(s.createdAt);
      const today = new Date();
      return sessionDate.toDateString() === today.toDateString();
    }).length,
    
    totalFlashcards: flashcards.length,
    reviewedFlashcards: flashcards.filter((f: any) => f.reviewCount > 0).length,
    
    moodEntries: moodEntries.length,
    journalEntries: journalEntries.length,
    
    // Calculate productivity score
    productivityScore: calculateProductivityScore({
      completedAssignments: assignments.filter((a: any) => a.status === 'completed').length,
      totalAssignments: assignments.length,
      studyTime: pomodoroSessions.reduce((total: number, session: any) => total + (session.duration || 0), 0),
      notesCreated: notes.length,
      flashcardsReviewed: flashcards.filter((f: any) => f.reviewCount > 0).length,
    }),
  };

  return {
    analytics,
    isLoading,
    assignments,
    notes,
    pomodoroSessions,
    flashcards,
    moodEntries,
    journalEntries,
  };
};

// Helper function to calculate productivity score
function calculateProductivityScore(data: {
  completedAssignments: number;
  totalAssignments: number;
  studyTime: number;
  notesCreated: number;
  flashcardsReviewed: number;
}) {
  const { completedAssignments, totalAssignments, studyTime, notesCreated, flashcardsReviewed } = data;
  
  // Assignment completion rate (0-40 points)
  const assignmentScore = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 40 : 0;
  
  // Study time score (0-30 points) - 2 hours = 30 points
  const studyTimeScore = Math.min((studyTime / 120) * 30, 30);
  
  // Notes creation score (0-15 points) - 10 notes = 15 points
  const notesScore = Math.min((notesCreated / 10) * 15, 15);
  
  // Flashcard review score (0-15 points) - 20 reviews = 15 points
  const flashcardScore = Math.min((flashcardsReviewed / 20) * 15, 15);
  
  return Math.round(assignmentScore + studyTimeScore + notesScore + flashcardScore);
}
