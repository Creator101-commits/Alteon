/**
 * Google Classroom types and utilities.
 * Note: Google Classroom sync has been removed. 
 * Classes and assignments are now managed manually by users.
 * This file is kept for type definitions that may be used elsewhere.
 */

interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  description?: string;
  ownerId: string;
  courseState: string;
}

interface ClassroomAssignment {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  dueDate?: {
    year: number;
    month: number;
    day: number;
  };
  dueTime?: {
    hours: number;
    minutes: number;
  };
  state: string;
}

/**
 * @deprecated Google Classroom sync has been removed.
 * This class is kept for backward compatibility but does nothing.
 */
export class GoogleClassroomAPI {
  constructor(accessToken: string) {
    console.warn('GoogleClassroomAPI is deprecated - Google Classroom sync has been removed');
  }

  async getCourses(): Promise<ClassroomCourse[]> {
    console.warn('Google Classroom sync is disabled');
    return [];
  }

  async getCourseWork(courseId: string): Promise<ClassroomAssignment[]> {
    console.warn('Google Classroom sync is disabled');
    return [];
  }

  async getAllAssignments(): Promise<ClassroomAssignment[]> {
    console.warn('Google Classroom sync is disabled');
    return [];
  }
}

/**
 * @deprecated Google Classroom sync has been removed.
 * This function is kept for backward compatibility but does nothing.
 */
export const syncGoogleClassroomData = async (accessToken: string, userId?: string) => {
  console.warn('syncGoogleClassroomData is deprecated - Google Classroom sync has been removed');
  return {
    courses: [],
    assignments: [],
  };
};
