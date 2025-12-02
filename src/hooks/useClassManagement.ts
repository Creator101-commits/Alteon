import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { classAPI } from '@/lib/api';

interface ClassData {
  id?: string;
  name: string;
  section?: string;
  description?: string;
  teacherName?: string;
  teacherEmail?: string;
  color?: string;
}

export const useClassManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const createClass = async (classData: ClassData) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    setIsCreating(true);
    try {
      const response = await classAPI.createClass(classData);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create class');
      }

      const createdClass = await response.json();
      
      toast({
        title: "Success!",
        description: "Class created successfully.",
      });

      return createdClass;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create class.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const updateClass = async (id: string, updates: Partial<ClassData>) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    setIsUpdating(id);
    try {
      const response = await classAPI.updateClass(id, updates);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update class');
      }

      const updatedClass = await response.json();
      
      toast({
        title: "Success!",
        description: "Class updated successfully.",
      });

      return updatedClass;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update class.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUpdating(null);
    }
  };

  const deleteClass = async (id: string, className: string) => {
    if (!user?.uid) {
      throw new Error('User not authenticated');
    }

    setIsDeleting(id);
    try {
      const response = await classAPI.deleteClass(id);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete class');
      }

      toast({
        title: "Class Deleted",
        description: `"${className}" has been deleted successfully.`,
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete class.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsDeleting(null);
    }
  };

  const confirmDeleteClass = async (id: string, className: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete the class "${className}"?\n\nThis action cannot be undone and will also delete all associated assignments and notes.`
    );

    if (confirmed) {
      await deleteClass(id, className);
      return true;
    }
    
    return false;
  };

  return {
    createClass,
    updateClass,
    deleteClass,
    confirmDeleteClass,
    isDeleting,
    isCreating,
    isUpdating,
  };
};
