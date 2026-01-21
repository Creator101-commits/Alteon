import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseStorage } from '@/lib/supabase-storage';
import { 
  Check, 
  Plus, 
  Trash2,
  ListTodo,
  Loader2
} from 'lucide-react';

interface TodoItem {
  id: string;
  title: string;
  completed: boolean | null;
  createdAt: string | Date | null;
}

export function SimpleTodoList() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load todos from Supabase on mount
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchTodos = async () => {
      try {
        const data = await supabaseStorage.getQuickTasks(user.uid);
        setTodos(data);
      } catch (error) {
        console.error('Error fetching quick tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodos();
  }, [user]);

  const addTodo = useCallback(async () => {
    if (!newTodoTitle.trim() || !user) {
      return;
    }
    
    setIsSaving(true);
    const title = newTodoTitle.trim();
    setNewTodoTitle('');
    
    try {
      const newTodo = await supabaseStorage.createQuickTask({
        userId: user.uid,
        title,
        completed: false,
      });
      
      setTodos(prevTodos => [...prevTodos, newTodo]);
      
      toast({
        title: "Task Added",
        description: `"${title}" added to your list`,
      });
    } catch (error) {
      console.error('Error creating quick task:', error);
      toast({
        title: "Error",
        description: "Failed to add task. Please try again.",
        variant: "destructive"
      });
      setNewTodoTitle(title); // Restore the title on error
    } finally {
      setIsSaving(false);
    }
  }, [newTodoTitle, user, toast]);

  const toggleTodo = useCallback(async (id: string) => {
    if (!user) return;
    
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    
    const newCompleted = !todo.completed;
    
    // Optimistic update
    setTodos(prevTodos => prevTodos.map(t => 
      t.id === id ? { ...t, completed: newCompleted } : t
    ));
    
    try {
      await supabaseStorage.updateQuickTask(id, { completed: newCompleted });
    } catch (error) {
      // Revert on error
      setTodos(prevTodos => prevTodos.map(t => 
        t.id === id ? { ...t, completed: !newCompleted } : t
      ));
      console.error('Error updating quick task:', error);
    }
  }, [todos, user]);

  const deleteTodo = useCallback(async (id: string) => {
    if (!user) return;
    
    const todoToDelete = todos.find(t => t.id === id);
    
    // Optimistic update
    setTodos(prevTodos => prevTodos.filter(t => t.id !== id));
    
    try {
      await supabaseStorage.deleteQuickTask(id);
    } catch (error) {
      // Revert on error
      if (todoToDelete) {
        setTodos(prevTodos => [...prevTodos, todoToDelete]);
      }
      console.error('Error deleting quick task:', error);
    }
  }, [todos, user]);

  const completedCount = todos.filter(t => t.completed).length;
  const pendingCount = todos.filter(t => !t.completed).length;

  if (!user) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Quick Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center text-sm text-muted-foreground">
            Sign in to save your tasks
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Quick Tasks
          </CardTitle>
          <div className="flex gap-2">
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingCount} pending
              </Badge>
            )}
            {completedCount > 0 && (
              <Badge variant="outline" className="text-xs text-green-600">
                {completedCount} done
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add New Todo */}
        <div className="flex gap-2">
          <Input
            placeholder="Add a quick task..."
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTodo();
              }
            }}
            className="h-9 text-sm"
            disabled={isSaving}
          />
          <Button 
            onClick={addTodo} 
            size="sm" 
            className="h-9 px-3"
            disabled={!newTodoTitle.trim() || isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        {/* Todo List */}
        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <Loader2 className="h-6 w-6 text-primary animate-spin relative z-10" />
              </div>
              <p className="text-xs text-muted-foreground animate-pulse">Loading tasks...</p>
            </div>
          ) : todos.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No tasks yet. Add one above!
            </div>
          ) : (
            todos.map((todo) => (
              <div 
                key={todo.id} 
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <button
                  type="button"
                  onClick={() => toggleTodo(todo.id)}
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    todo.completed 
                      ? 'bg-green-500 border-green-500' 
                      : 'border-muted-foreground/50 hover:border-primary'
                  }`}
                >
                  {todo.completed && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </button>
                
                <span className={`flex-1 text-sm ${
                  todo.completed 
                    ? 'line-through text-muted-foreground' 
                    : 'text-foreground'
                }`}>
                  {todo.title}
                </span>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTodo(todo.id)}
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
