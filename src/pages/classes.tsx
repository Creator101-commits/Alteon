import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SyncFeatureWrapper } from '@/components/SyncFeatureWrapper';
import { useGoogleClassroom } from '@/hooks/useGoogleClassroom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePersistentData } from '@/hooks/usePersistentData';
import { useClassManagement } from '@/hooks/useClassManagement';
import { apiGet, apiPost } from '@/lib/api';
import { ErrorHandler } from '@/lib/errorHandler';
import { ClassSkeleton } from '@/components/LoadingSkeletons';
import { EmptyState, NoClasses } from '@/components/EmptyStates';
import { classSchema, validateForm } from '@/lib/validationSchemas';
import { RefreshCw, BookOpen, Users, Calendar, ExternalLink, AlertCircle, CheckCircle, Plus, Palette, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Classes() {
  const { courses, isLoading, error, syncClassroomData, isAuthenticated } = useGoogleClassroom();
  const { toast } = useToast();
  const { isRestoring } = usePersistentData();
  const { createClass, confirmDeleteClass, isDeleting, isCreating } = useClassManagement();
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [newClass, setNewClass] = useState({
    name: '',
    section: '',
    description: '',
    teacherName: '',
    teacherEmail: '',
    color: '#42a5f5'
  });

  const classColors = [
    '#42a5f5', '#66bb6a', '#ff7043', '#ab47bc', '#26c6da',
    '#ffca28', '#ec407a', '#5c6bc0', '#ffa726', '#8bc34a',
    '#f06292', '#29b6f6', '#ff8a65', '#ba68c8', '#4db6ac'
  ];

  const handleSync = async () => {
    setIsSyncing(true);
    await syncClassroomData(true); // true = show toast notifications for manual sync
    setIsSyncing(false);
  };

  const handleCreateClass = async () => {
    // Validate form data with Zod
    const validation = validateForm(classSchema, newClass);
    
    if (!validation.success) {
      ErrorHandler.handleValidationError(validation.errors);
      return;
    }

    try {
      await createClass(validation.data);

      // Reset form
      setNewClass({
        name: '',
        section: '',
        description: '',
        teacherName: '',
        teacherEmail: '',
        color: '#42a5f5'
      });

      // Refresh data
      await syncClassroomData(false); // Silent refresh to include new class
      
    } catch (error: any) {
      ErrorHandler.handle(
        error,
        'Failed to create class. Please check your input and try again.',
        { context: 'handleCreateClass' }
      );
    }
  };

  const handleDeleteClass = async (course: any) => {
    // Only allow deletion of custom classes (not Google Classroom classes)
    if (course.googleClassroomId || course.courseState) {
      toast({
        title: "Cannot Delete",
        description: "Google Classroom classes cannot be deleted from this interface.",
        variant: "destructive",
      });
      return;
    }

    try {
      const deleted = await confirmDeleteClass(course.id, course.name);
      if (deleted) {
        // Refresh data after successful deletion
        await syncClassroomData(false);
      }
    } catch (error: any) {
      ErrorHandler.handle(
        error,
        'Failed to delete class. Please try again.',
        { context: 'handleDeleteClass' }
      );
    }
  };

  // Remove the authentication check since users can now create custom classes
  // even without Google Classroom integration
  
  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      {/* Gentle Header */}
      <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Your Classes
          </h1>
        <p className="text-sm text-muted-foreground">
          Manage your courses and subjects
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
          {isSyncing || isRestoring ? 'Syncing...' : 'Sync'}
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="text-sm">
              <Plus className="h-3 w-3 mr-1" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="className">Class Name *</Label>
                  <Input
                    id="className"
                    placeholder="Enter class name..."
                    value={newClass.name}
                    onChange={(e) => setNewClass(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="section">Section</Label>
                  <Input
                    id="section"
                    placeholder="Enter section (e.g., Period 1, Room 101)..."
                    value={newClass.section}
                    onChange={(e) => setNewClass(prev => ({ ...prev, section: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter class description..."
                    value={newClass.description}
                    onChange={(e) => setNewClass(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="teacherName">Teacher Name</Label>
                    <Input
                      id="teacherName"
                      placeholder="Enter teacher name..."
                      value={newClass.teacherName}
                      onChange={(e) => setNewClass(prev => ({ ...prev, teacherName: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="teacherEmail">Teacher Email</Label>
                    <Input
                      id="teacherEmail"
                      type="email"
                      placeholder="Enter teacher email..."
                      value={newClass.teacherEmail}
                      onChange={(e) => setNewClass(prev => ({ ...prev, teacherEmail: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Class Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {classColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${
                          newClass.color === color ? 'border-gray-900' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewClass(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  <DialogTrigger asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogTrigger>
                  <Button 
                    onClick={handleCreateClass}
                    disabled={isCreating}
                  >
                    {isCreating ? 'Creating...' : 'Create Class'}
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
            You can create custom classes below. To sync with Google Classroom, please sign in with your Google account.
          </AlertDescription>
        </Alert>
      )} */}

      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(isLoading || isRestoring) && !courses.length ? (
        <ClassSkeleton />
      ) : null}

      {!isLoading && !isRestoring && courses.length === 0 ? (
        <NoClasses onAdd={() => {/* Dialog trigger handled by state */}} />
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg leading-tight">
                  {course.name}
                </CardTitle>
                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  {course.courseState ? (
                    <Badge 
                      variant={course.courseState === 'ACTIVE' ? 'default' : 'secondary'}
                    >
                      {course.courseState === 'ACTIVE' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      )}
                      {course.courseState}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                      Custom
                    </Badge>
                  )}
                  
                  {/* Delete button for custom classes only */}
                  {!course.courseState && !course.googleClassroomId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClass(course)}
                      disabled={isDeleting === course.id}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      {isDeleting === course.id ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              {course.section && (
                <p className="text-sm text-muted-foreground">{course.section}</p>
              )}
            </CardHeader>
            
            <CardContent className="space-y-4">
              {course.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {course.description}
                </p>
              )}

              <Separator />

              <div className="space-y-3">
                {course.teacherName && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Teacher: {course.teacherName}</span>
                  </div>
                )}

                {course.createdAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Created: {new Date(course.createdAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {course.alternateLink && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4"
                  onClick={() => window.open(course.alternateLink, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Classroom
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {courses.length > 0 && (
        <div className="mt-8 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            Showing {courses.length} class{courses.length !== 1 ? 'es' : ''} from Google Classroom
          </p>
        </div>
      )}
    </div>
  );
}
