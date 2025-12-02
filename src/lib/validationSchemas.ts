import { z } from 'zod';

/**
 * Validation schema for creating/editing assignments
 */
export const assignmentSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  
  dueDateTime: z.date()
    .optional()
    .nullable(),
  
  // Legacy fields for backwards compatibility
  dueDate: z.string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, 'Invalid date format'),
  
  dueTime: z.string().optional(),
  
  classId: z.string()
    .min(1, 'Please select a class'),
  
  priority: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Priority must be low, medium, or high' })
  })
});

export type AssignmentFormData = z.infer<typeof assignmentSchema>;

/**
 * Validation schema for creating/editing classes
 */
export const classSchema = z.object({
  name: z.string()
    .min(1, 'Class name is required')
    .max(100, 'Class name must be less than 100 characters'),
  
  section: z.string()
    .max(50, 'Section must be less than 50 characters')
    .optional(),
  
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  
  teacherName: z.string()
    .max(100, 'Teacher name must be less than 100 characters')
    .optional(),
  
  teacherEmail: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .default('#42a5f5')
});

export type ClassFormData = z.infer<typeof classSchema>;

/**
 * Validation schema for notes
 */
export const noteSchema = z.object({
  title: z.string()
    .min(1, 'Note title is required')
    .max(200, 'Title must be less than 200 characters'),
  
  content: z.string()
    .min(1, 'Note content is required')
    .max(50000, 'Content is too long (max 50,000 characters)'),
  
  classId: z.string().optional(),
  
  tags: z.array(z.string()).optional()
});

export type NoteFormData = z.infer<typeof noteSchema>;

/**
 * Validation schema for journal entries
 */
export const journalSchema = z.object({
  content: z.string()
    .min(1, 'Journal entry cannot be empty')
    .max(10000, 'Entry is too long (max 10,000 characters)'),
  
  mood: z.enum(['great', 'good', 'okay', 'bad', 'terrible']).optional(),
  
  date: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Invalid date format')
});

export type JournalFormData = z.infer<typeof journalSchema>;

/**
 * Validation schema for flashcards
 */
export const flashcardSchema = z.object({
  front: z.string()
    .min(1, 'Front side cannot be empty')
    .max(500, 'Front side is too long (max 500 characters)'),
  
  back: z.string()
    .min(1, 'Back side cannot be empty')
    .max(2000, 'Back side is too long (max 2,000 characters)'),
  
  deckId: z.string()
    .min(1, 'Please select a deck')
});

export type FlashcardFormData = z.infer<typeof flashcardSchema>;

/**
 * Helper function to format validation errors for display
 */
export function formatZodErrors(error: z.ZodError): string {
  return error.errors.map(err => err.message).join(', ');
}

/**
 * Helper function to validate and return formatted errors
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: formatZodErrors(error) };
    }
    return { success: false, errors: 'Validation failed' };
  }
}

/**
 * Validate a single field for real-time validation
 */
export function validateField<T>(
  schema: z.ZodSchema<T>,
  fieldName: string,
  value: any
): { valid: true } | { valid: false; error: string } {
  try {
    // Create a partial object with just this field
    const partialData = { [fieldName]: value };
    
    // Use safeParse to avoid throwing
    const result = schema.safeParse(partialData);
    
    if (result.success) {
      return { valid: true };
    }
    
    // Find error for this specific field
    const fieldError = result.error.errors.find(err => 
      err.path.includes(fieldName)
    );
    
    return {
      valid: false,
      error: fieldError?.message || 'Invalid value',
    };
  } catch (error) {
    return { valid: false, error: 'Validation failed' };
  }
}

/**
 * Debounce function for real-time validation
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * React hook for real-time field validation with debouncing
 */
import { useState, useCallback, useEffect } from 'react';

export function useFieldValidation<T>(
  schema: z.ZodSchema<T>,
  fieldName: string,
  initialValue: any,
  debounceMs: number = 300
) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [touched, setTouched] = useState(false);

  // Debounced validation
  const validateDebounced = useCallback(
    debounce((val: any) => {
      setIsValidating(true);
      const result = validateField(schema, fieldName, val);
      setError(result.valid ? null : result.error);
      setIsValidating(false);
    }, debounceMs),
    [schema, fieldName, debounceMs]
  );

  // Validate when value changes (after first touch)
  useEffect(() => {
    if (touched) {
      validateDebounced(value);
    }
  }, [value, touched, validateDebounced]);

  const handleChange = (newValue: any) => {
    setValue(newValue);
    if (!touched) setTouched(true);
  };

  const handleBlur = () => {
    setTouched(true);
    // Immediate validation on blur
    const result = validateField(schema, fieldName, value);
    setError(result.valid ? null : result.error);
  };

  return {
    value,
    error,
    isValidating,
    touched,
    setValue: handleChange,
    onBlur: handleBlur,
    isValid: !error && touched,
  };
}
