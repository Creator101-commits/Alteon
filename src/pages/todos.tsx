import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  Circle, 
  Filter,
  Calendar,
  Flag
} from 'lucide-react';
import { format } from 'date-fns';

interface Todo {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
}

export default function Todos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filteredTodos, setFilteredTodos] = useState<Todo[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    dueDateTime: undefined as Date | undefined,
  });

  // Load todos from localStorage
  useEffect(() => {
    if (user?.uid) {
      const stored = localStorage.getItem(`todos_${user.uid}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setTodos(parsed);
        } catch (error) {
          console.error('Error loading todos:', error);
        }
      }
    }
  }, [user]);

  // Save todos to localStorage
  useEffect(() => {
    if (user?.uid && todos.length >= 0) {
      localStorage.setItem(`todos_${user.uid}`, JSON.stringify(todos));
    }
  }, [todos, user]);

  // Filter todos
  useEffect(() => {
    let filtered = [...todos];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(todo => todo.status === filterStatus);
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(todo => todo.priority === filterPriority);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(todo => 
        todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        todo.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTodos(filtered);
  }, [todos, filterStatus, filterPriority, searchTerm]);

  const handleAddTodo = useCallback(() => {
    if (!newTodo.title.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a todo title',
        variant: 'destructive'
      });
      return;
    }

    const todo: Todo = {
      id: `todo-${Date.now()}`,
      title: newTodo.title,
      description: newTodo.description,
      priority: newTodo.priority,
      status: 'pending',
      dueDate: newTodo.dueDateTime ? newTodo.dueDateTime.toISOString() : null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    setTodos(prev => [todo, ...prev]);
    setNewTodo({ title: '', description: '', priority: 'medium', dueDateTime: undefined });
    setIsAddDialogOpen(false);

    toast({
      title: 'Todo Added',
      description: `"${todo.title}" has been added to your list`,
    });
  }, [newTodo, toast]);

  const handleUpdateTodo = useCallback(() => {
    if (!editingTodo) return;

    setTodos(prev => prev.map(todo => 
      todo.id === editingTodo.id ? editingTodo : todo
    ));

    setIsEditDialogOpen(false);
    setEditingTodo(null);

    toast({
      title: 'Todo Updated',
      description: 'Your todo has been updated successfully',
    });
  }, [editingTodo, toast]);

  const handleDeleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
    toast({
      title: 'Todo Deleted',
      description: 'The todo has been removed from your list',
    });
  }, [toast]);

  const handleToggleComplete = useCallback((id: string) => {
    setTodos(prev => prev.map(todo => {
      if (todo.id === id) {
        const isCompleting = todo.status !== 'completed';
        return {
          ...todo,
          status: isCompleting ? 'completed' : 'pending',
          completedAt: isCompleting ? new Date().toISOString() : null,
        };
      }
      return todo;
    }));
  }, []);

  const handleStatusChange = useCallback((id: string, status: Todo['status']) => {
    setTodos(prev => prev.map(todo => 
      todo.id === id 
        ? { 
            ...todo, 
            status,
            completedAt: status === 'completed' ? new Date().toISOString() : null,
          } 
        : todo
    ));
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-50 dark:bg-red-950';
      case 'medium': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950';
      case 'low': return 'text-green-500 bg-green-50 dark:bg-green-950';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-950';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 dark:bg-green-950';
      case 'in-progress': return 'text-blue-600 bg-blue-50 dark:bg-blue-950';
      case 'pending': return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
    }
  };

  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.status === 'completed').length,
    pending: todos.filter(t => t.status === 'pending').length,
    inProgress: todos.filter(t => t.status === 'in-progress').length,
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          My Todos
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your tasks and track progress
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Add Button */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input
          placeholder="Search todos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Todo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Todo</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  placeholder="Enter todo title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newTodo.description}
                  onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                  placeholder="Enter todo description"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={newTodo.priority} 
                  onValueChange={(value: any) => setNewTodo({ ...newTodo, priority: value })}
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
              <div>
                <Label>Due Date (Optional)</Label>
                <DateTimePicker
                  date={newTodo.dueDateTime}
                  onDateChange={(date) => setNewTodo({ ...newTodo, dueDateTime: date })}
                  placeholder="Select due date"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTodo}>Add Todo</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Todo List */}
      <div className="space-y-3">
        {filteredTodos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || filterStatus !== 'all' || filterPriority !== 'all' 
                  ? 'No todos match your filters' 
                  : 'No todos yet. Create your first one!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTodos.map((todo) => (
            <Card key={todo.id} className={todo.status === 'completed' ? 'opacity-60' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={todo.status === 'completed'}
                    onCheckedChange={() => handleToggleComplete(todo.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className={`font-medium ${todo.status === 'completed' ? 'line-through' : ''}`}>
                        {todo.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(todo.priority)}>
                          <Flag className="h-3 w-3 mr-1" />
                          {todo.priority}
                        </Badge>
                        <Badge className={getStatusColor(todo.status)}>
                          {todo.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {todo.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {todo.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {todo.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {format(new Date(todo.dueDate), 'MMM d, yyyy')}
                        </div>
                      )}
                      {todo.completedAt && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed: {format(new Date(todo.completedAt), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={todo.status}
                      onValueChange={(value: any) => handleStatusChange(todo.id, value)}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTodo(todo);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTodo(todo.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Todo</DialogTitle>
          </DialogHeader>
          {editingTodo && (
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingTodo.title}
                  onChange={(e) => setEditingTodo({ ...editingTodo, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingTodo.description}
                  onChange={(e) => setEditingTodo({ ...editingTodo, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select 
                  value={editingTodo.priority} 
                  onValueChange={(value: any) => setEditingTodo({ ...editingTodo, priority: value })}
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
              <div>
                <Label>Due Date</Label>
                <DateTimePicker
                  date={editingTodo.dueDate ? new Date(editingTodo.dueDate) : undefined}
                  onDateChange={(date) => setEditingTodo({ ...editingTodo, dueDate: date ? date.toISOString() : null })}
                  placeholder="Select due date"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTodo}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
