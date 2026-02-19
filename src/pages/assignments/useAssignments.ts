/**
 * Custom hook encapsulating all assignments state, actions, and derived data.
 */
import { useMemo, useState, useCallback } from 'react';
import { useGoogleClassroom } from '@/hooks/useGoogleClassroom';
import { useAuth } from '@/contexts/AuthContext';
import { usePersistentData } from '@/hooks/usePersistentData';
import { useToast } from '@/hooks/use-toast';
import { supabaseStorage as storage } from '@/lib/supabase-storage';
import { ErrorHandler } from '@/lib/errorHandler';
import { assignmentSchema, validateForm } from '@/lib/validationSchemas';
import { EMPTY_ASSIGNMENT, type NewAssignment } from './types';

export function useAssignments() {
  const { assignments, courses, isLoading, error, syncClassroomData, isAuthenticated } =
    useGoogleClassroom();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isRestoring, isRestored } = usePersistentData();

  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAssignment, setNewAssignment] = useState<NewAssignment>({ ...EMPTY_ASSIGNMENT });

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    await syncClassroomData(true);
    setIsSyncing(false);
  }, [syncClassroomData]);

  const markAssignmentComplete = useCallback(
    async (assignmentId: string) => {
      if (!user?.uid) return;

      try {
        try {
          await storage.deleteAssignment(assignmentId);
        } catch (error: any) {
          if (!error.message?.includes('not found')) throw error;
        }

        // Update localStorage cache
        const storageKey = `custom_assignments_${user.uid}`;
        const cachedAssignments = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updatedAssignments = cachedAssignments.filter(
          (assignment: any) => assignment.id !== assignmentId,
        );
        localStorage.setItem(storageKey, JSON.stringify(updatedAssignments));

        // Update classroom data cache
        try {
          const classroomCache = localStorage.getItem(`classroom_data_${user.uid}`);
          if (classroomCache) {
            const parsed = JSON.parse(classroomCache);
            if (parsed.assignments) {
              parsed.assignments = parsed.assignments.filter(
                (a: any) => a.id !== assignmentId,
              );
              localStorage.setItem(
                `classroom_data_${user.uid}`,
                JSON.stringify(parsed),
              );
            }
          }
        } catch (cacheError) {
          console.warn('Failed to update classroom cache:', cacheError);
        }

        toast({
          title: 'Assignment Completed! 🎉',
          description: 'Great job! The assignment has been removed.',
        });

        syncClassroomData(false);
      } catch (error: any) {
        console.error('Error completing assignment:', error);
        toast({
          title: 'Error',
          description:
            error.message || 'Failed to mark assignment as complete. Please try again.',
          variant: 'destructive',
        });
      }
    },
    [user, syncClassroomData, toast],
  );

  const deleteCustomAssignment = useCallback(
    async (assignmentId: string) => {
      if (!user?.uid) return;

      try {
        try {
          await storage.deleteAssignment(assignmentId);
        } catch (error: any) {
          if (!error.message?.includes('not found')) throw error;
        }

        const storageKey = `custom_assignments_${user.uid}`;
        const assignments = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updatedAssignments = assignments.filter(
          (assignment: any) => assignment.id !== assignmentId,
        );
        localStorage.setItem(storageKey, JSON.stringify(updatedAssignments));

        try {
          const classroomCache = localStorage.getItem(`classroom_data_${user.uid}`);
          if (classroomCache) {
            const parsed = JSON.parse(classroomCache);
            if (parsed.assignments) {
              parsed.assignments = parsed.assignments.filter(
                (a: any) => a.id !== assignmentId,
              );
              localStorage.setItem(
                `classroom_data_${user.uid}`,
                JSON.stringify(parsed),
              );
            }
          }
        } catch (cacheError) {
          console.warn('Failed to update classroom cache:', cacheError);
        }

        toast({
          title: 'Assignment Deleted',
          description: 'Custom assignment has been deleted.',
        });

        syncClassroomData(false);
      } catch (error: any) {
        ErrorHandler.handle(error, 'Failed to delete assignment. Please try again.', {
          context: 'deleteCustomAssignment',
        });
      }
    },
    [user, syncClassroomData],
  );

  const handleCreateAssignment = useCallback(async () => {
    const validation = validateForm(assignmentSchema, newAssignment);
    if (!validation.success) {
      ErrorHandler.handleValidationError(validation.errors);
      return;
    }
    if (!user?.uid) {
      ErrorHandler.handleAuthError(new Error('User not authenticated'));
      return;
    }

    setIsAddingAssignment(true);

    const dueDate = newAssignment.dueDateTime
      ? newAssignment.dueDateTime.toISOString()
      : null;

    const assignmentData = {
      userId: user.uid,
      title: newAssignment.title,
      description: newAssignment.description || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      classId:
        newAssignment.classId === 'none' ? null : newAssignment.classId || null,
      priority: newAssignment.priority,
      status: 'pending',
      isCustom: true,
      source: 'manual',
      syncStatus: 'synced',
    };

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempAssignment = {
      ...assignmentData,
      id: tempId,
      createdAt: new Date().toISOString(),
      userId: user.uid,
      _optimistic: true,
    };

    const storageKey = `custom_assignments_${user.uid}`;
    const existingAssignments = JSON.parse(
      localStorage.getItem(storageKey) || '[]',
    );
    const optimisticAssignments = [...existingAssignments, tempAssignment];
    localStorage.setItem(storageKey, JSON.stringify(optimisticAssignments));

    await syncClassroomData(false);

    try {
      const createdAssignment = await storage.createAssignment(assignmentData);

      const updatedAssignments = optimisticAssignments.map((a) =>
        a.id === tempId ? { ...createdAssignment, _optimistic: false } : a,
      );
      localStorage.setItem(storageKey, JSON.stringify(updatedAssignments));

      toast({ title: 'Success!', description: 'Assignment created successfully.' });

      setNewAssignment({ ...EMPTY_ASSIGNMENT });
      setShowAddDialog(false);

      await syncClassroomData(false);
    } catch (error: any) {
      // Rollback
      const rollbackAssignments = optimisticAssignments.filter(
        (a) => a.id !== tempId,
      );
      localStorage.setItem(storageKey, JSON.stringify(rollbackAssignments));
      await syncClassroomData(false);

      ErrorHandler.handle(
        error,
        'Failed to create assignment. Your changes have been reverted.',
        { context: 'handleCreateAssignment' },
      );
    } finally {
      setIsAddingAssignment(false);
    }
  }, [user, newAssignment, syncClassroomData, toast]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const matchesSearch =
        assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (assignment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ??
          false);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'todo' &&
          (assignment.status === 'TODO' || assignment.status === 'pending')) ||
        (statusFilter === 'submitted' &&
          (assignment.status === 'TURNED_IN' ||
            assignment.status === 'completed')) ||
        (statusFilter === 'late' && assignment.status === 'LATE') ||
        (statusFilter === 'overdue' &&
          (() => {
            if (!assignment.dueDate) return false;
            try {
              const dueDate = new Date(assignment.dueDate);
              return (
                !isNaN(dueDate.getTime()) &&
                dueDate < new Date() &&
                assignment.status !== 'TURNED_IN' &&
                assignment.status !== 'completed'
              );
            } catch {
              return false;
            }
          })());

      const matchesClass =
        classFilter === 'all' || assignment.classId === classFilter;

      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [assignments, searchTerm, statusFilter, classFilter]);

  return {
    // data
    assignments,
    filteredAssignments,
    courses,
    isLoading,
    isRestoring,
    isRestored,
    error,
    isAuthenticated,

    // dialog / form state
    showAddDialog,
    setShowAddDialog,
    newAssignment,
    setNewAssignment,
    isAddingAssignment,

    // filter state
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    classFilter,
    setClassFilter,

    // sync
    isSyncing,
    handleSync,

    // actions
    markAssignmentComplete,
    deleteCustomAssignment,
    handleCreateAssignment,
  };
}
