import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabaseStorage } from '@/lib/supabase-storage';

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
      const createdClass = await supabaseStorage.createClass({
        userId: user.uid,
        name: classData.name,
        section: classData.section,
        description: classData.description,
        teacherName: classData.teacherName,
        teacherEmail: classData.teacherEmail,
        color: classData.color || '#42a5f5',
      });
      
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
      const updatedClass = await supabaseStorage.updateClass(id, {
        name: updates.name,
        section: updates.section,
        description: updates.description,
        teacherName: updates.teacherName,
        teacherEmail: updates.teacherEmail,
        color: updates.color,
      });

      if (!updatedClass) {
        throw new Error('Failed to update class');
      }
      
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
      const success = await supabaseStorage.deleteClass(id);
      
      if (!success) {
        throw new Error('Failed to delete class');
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
