import React, { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { useGoogleClassroom } from '@/hooks/useGoogleClassroom';
import { useAuth } from '@/contexts/AuthContext';
import { usePersistentData } from '@/hooks/usePersistentData';
import { useToast } from '@/hooks/use-toast';
import { ErrorHandler } from '@/lib/errorHandler';
import { AssignmentSkeleton } from '@/components/LoadingSkeletons';
import { NoAssignments, ErrorState, EmptyState } from '@/components/EmptyStates';
import { assignmentSchema, validateForm } from '@/lib/validationSchemas';
import { 
  Calendar, 
  BookOpen, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Users,
  Plus,
  Trash2,
  Check
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export default function Assignments() {
  const { assignments, courses, isLoading, error, syncClassroomData, isAuthenticated } = useGoogleClassroom();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isRestoring, isRestored } = usePersistentData();
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    dueDateTime: undefined as Date | undefined,
    classId: 'none',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });


  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    await syncClassroomData(true); // true = show toast notifications for manual sync
    setIsSyncing(false);
  }, [syncClassroomData]);

  const markAssignmentComplete = useCallback(async (assignmentId: string) => {
    if (!user?.uid) return;

    try {
      // Delete the assignment via API
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.message || 'Failed to complete assignment');
      }

      // Update localStorage cache - remove the assignment
      const storageKey = `custom_assignments_${user.uid}`;
      const assignments = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updatedAssignments = assignments.filter((assignment: any) => 
        assignment.id !== assignmentId
      );
      localStorage.setItem(storageKey, JSON.stringify(updatedAssignments));
      
      toast({
        title: "Assignment Completed! 🎉",
        description: "Great job! The assignment has been removed.",
      });
      
      // Refresh the assignments list
      syncClassroomData(false);
    } catch (error: any) {
      console.error('Error completing assignment:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to mark assignment as complete. Please try again.',
        variant: "destructive"
      });
    }
  }, [user, syncClassroomData, toast]);

  const deleteCustomAssignment = useCallback(async (assignmentId: string) => {
    if (!user?.uid) return;

    try {
      // Delete from database via API
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.uid,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete assignment');
      }

      // Update localStorage cache
      const storageKey = `custom_assignments_${user.uid}`;
      const assignments = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updatedAssignments = assignments.filter((assignment: any) => assignment.id !== assignmentId);
      localStorage.setItem(storageKey, JSON.stringify(updatedAssignments));
      
      toast({
        title: "Assignment Deleted",
        description: "Custom assignment has been deleted.",
      });
      
      // Refresh the assignments list
      syncClassroomData(false);
    } catch (error: any) {
      ErrorHandler.handle(
        error,
        'Failed to delete assignment. Please try again.',
        { context: 'deleteCustomAssignment' }
      );
    }
  }, [user, syncClassroomData]);

  const handleCreateAssignment = useCallback(async () => {
    // Validate form data with Zod
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
    
    // Prepare assignment data
    const dueDate = newAssignment.dueDateTime 
      ? newAssignment.dueDateTime.toISOString() 
      : null;

    const assignmentData = {
      title: newAssignment.title,
      description: newAssignment.description || null,
      dueDate,
      classId: newAssignment.classId === 'none' ? null : newAssignment.classId || null,
      priority: newAssignment.priority,
      status: 'pending',
      isCustom: true,
      source: 'manual',
      syncStatus: 'synced',
    };

    // OPTIMISTIC UPDATE: Create temporary assignment with temporary ID
    const tempId = `temp-${Date.now()}`;
    const tempAssignment = {
      ...assignmentData,
      id: tempId,
      createdAt: new Date().toISOString(),
      userId: user.uid,
      _optimistic: true, // Flag for UI to show pending state
    };

    // Immediately update UI (localStorage cache)
    const storageKey = `custom_assignments_${user.uid}`;
    const existingAssignments = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const optimisticAssignments = [...existingAssignments, tempAssignment];
    localStorage.setItem(storageKey, JSON.stringify(optimisticAssignments));
    
    // Trigger re-render with optimistic data
    await syncClassroomData(false);

    try {
      // Save to database via API
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.uid,
        },
        body: JSON.stringify(assignmentData),
      });

      if (!response.ok) {
        throw new Error('Failed to create assignment');
      }

      const createdAssignment = await response.json();

      // Replace temporary assignment with real one
      const updatedAssignments = optimisticAssignments.map(a => 
        a.id === tempId ? { ...createdAssignment, _optimistic: false } : a
      );
      localStorage.setItem(storageKey, JSON.stringify(updatedAssignments));

      toast({
        title: "Success!",
        description: "Assignment created successfully.",
      });

      // Reset form and close dialog
      setNewAssignment({
        title: '',
        description: '',
        dueDateTime: undefined,
        classId: 'none',
        priority: 'medium'
      });
      setShowAddDialog(false);

      // Refresh data to include real assignment
      await syncClassroomData(false);
      
    } catch (error: any) {
      // ROLLBACK: Remove optimistic assignment on failure
      const rollbackAssignments = optimisticAssignments.filter(a => a.id !== tempId);
      localStorage.setItem(storageKey, JSON.stringify(rollbackAssignments));
      await syncClassroomData(false); // Update UI to remove failed assignment
      
      ErrorHandler.handle(
        error,
        'Failed to create assignment. Your changes have been reverted.',
        { context: 'handleCreateAssignment' }
      );
    } finally {
      setIsAddingAssignment(false);
    }
  }, [user, newAssignment, syncClassroomData, toast]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter(assignment => {
      const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (assignment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'todo' && (assignment.status === 'TODO' || assignment.status === 'pending')) ||
        (statusFilter === 'submitted' && (assignment.status === 'TURNED_IN' || assignment.status === 'completed')) ||
        (statusFilter === 'late' && assignment.status === 'LATE') ||
        (statusFilter === 'overdue' && (() => {
          if (!assignment.dueDate) return false;
          try {
            const dueDate = new Date(assignment.dueDate);
            return !isNaN(dueDate.getTime()) && dueDate < new Date() && 
                   assignment.status !== 'TURNED_IN' && assignment.status !== 'completed';
          } catch (error) {
            return false;
          }
        })());
      
      const matchesClass = classFilter === 'all' || assignment.classId === classFilter;
      
      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [assignments, searchTerm, statusFilter, classFilter]);

  const getAssignmentStatus = (assignment: any) => {
    if (assignment.status === 'TURNED_IN' || assignment.status === 'completed') return { label: 'Submitted', variant: 'default' as const, icon: CheckCircle };
    if (assignment.status === 'LATE') return { label: 'Late', variant: 'destructive' as const, icon: AlertCircle };
    
    // Check if overdue
    if (assignment.dueDate) {
      try {
        const dueDate = new Date(assignment.dueDate);
        if (!isNaN(dueDate.getTime()) && dueDate < new Date()) {
          return { label: 'Overdue', variant: 'destructive' as const, icon: AlertCircle };
        }
      } catch (error) {
        console.warn('Error parsing due date for status check:', assignment.dueDate);
      }
    }
    
    return { label: 'To Do', variant: 'secondary' as const, icon: Clock };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 border-red-200 bg-red-50';
      case 'medium': return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case 'low': return 'text-green-600 border-green-200 bg-green-50';
      default: return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  // Remove the authentication check since users can now create custom assignments
  // even without Google Classroom integration
  
  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* Gentle Header */}
      <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Your Assignments
          </h1>
        <p className="text-sm text-muted-foreground">
          Keep track of what you need to complete
        </p>
      </div>

      {/* Simple Actions */}
      <div className="flex gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing || isRestoring}
          className="text-sm"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing || isRestoring ? 'animate-spin' : ''}`} />
          {isSyncing || isRestoring ? 'Refreshing...' : 'Refresh'}
        </Button>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-sm">
              <Plus className="h-3 w-3 mr-1" />
              Add Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter assignment title..."
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter assignment description..."
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2 col-span-2">
                    <Label>Due Date & Time</Label>
                    <DateTimePicker
                      date={newAssignment.dueDateTime}
                      onDateChange={(date) => setNewAssignment(prev => ({ ...prev, dueDateTime: date }))}
                      placeholder="Select due date and time"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="class">Class</Label>
                    <Select
                      value={newAssignment.classId}
                      onValueChange={(value) => setNewAssignment(prev => ({ ...prev, classId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Class</SelectItem>
                        {courses.map(course => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newAssignment.priority}
                      onValueChange={(value: 'low' | 'medium' | 'high') => 
                        setNewAssignment(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <Button 
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateAssignment}
                    disabled={isAddingAssignment}
                  >
                    {isAddingAssignment ? 'Creating...' : 'Create Assignment'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

      {/* Authentication Alert - Temporarily commented out */}
      {/* {!isAuthenticated && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You can create custom assignments below. To sync with Google Classroom, please sign in with your Google account.
          </AlertDescription>
        </Alert>
      )} */}

      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-40">
                  <BookOpen className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {(isLoading || isRestoring) && !assignments.length ? (
        <AssignmentSkeleton />
      ) : null}

      {!isLoading && !isRestoring && assignments.length === 0 ? (
        <NoAssignments onAdd={() => setShowAddDialog(true)} />
      ) : null}

      {!isLoading && !isRestoring && filteredAssignments.length === 0 && assignments.length > 0 ? (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title="No matching assignments"
          description="No assignments match your current filters. Try adjusting your search or filter criteria."
          action={{
            label: "Clear Filters",
            onClick: () => {
              setSearchTerm('');
              setStatusFilter('all');
              setClassFilter('all');
            }
          }}
        />
      ) : null}

      <div className="space-y-4">
        {filteredAssignments.map((assignment) => {
          const status = getAssignmentStatus(assignment);
          const StatusIcon = status.icon;
          
          // Find course name by database ID
          // All courses now use database IDs, so simple lookup works
          const course = courses.find(c => c.id === assignment.classId);
          const courseName = course?.name || (assignment.classId ? 'Unknown Course' : 'No Class');
          
          return (
            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight mb-2">
                      {assignment.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{courseName}</span>
                      {assignment.isCustom && !assignment.classId && (
                        <Badge variant="secondary" className="text-xs">Personal</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant={status.variant} className="flex items-center gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                    
                    {assignment.isCustom && (
                      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                        Custom
                      </Badge>
                    )}
                    
                    {assignment.priority && assignment.priority !== 'none' && (
                      <Badge 
                        variant="outline" 
                        className={`capitalize ${getPriorityColor(assignment.priority)}`}
                      >
                        {assignment.priority} Priority
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {assignment.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {assignment.description}
                  </p>
                )}

                <Separator />

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    {assignment.dueDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Due: {(() => {
                            try {
                              const dueDate = new Date(assignment.dueDate);
                              if (isNaN(dueDate.getTime())) {
                                console.warn('Invalid due date:', assignment.dueDate, 'for assignment:', assignment.title);
                                return assignment.dueDate; // Fallback to raw value if invalid
                              }
                              const formattedDate = dueDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              });
                              const formattedTime = dueDate.toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true
                              });
                              return `${formattedDate} at ${formattedTime}`;
                            } catch (error) {
                              console.error('Error formatting due date:', error, assignment.dueDate);
                              return assignment.dueDate; // Fallback to raw value if error
                            }
                          })()}
                        </span>
                      </div>
                    )}
                    {!assignment.dueDate && assignment.isCustom && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>No due date set</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {assignment.isCustom && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => markAssignmentComplete(assignment.id)}
                        className="flex items-center gap-2 hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                      >
                        <Check className="h-4 w-4" />
                        Complete
                      </Button>
                    )}
                    
                    {assignment.alternateLink && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(assignment.alternateLink, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in Classroom
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredAssignments.length > 0 && (
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            Showing {filteredAssignments.length} of {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
