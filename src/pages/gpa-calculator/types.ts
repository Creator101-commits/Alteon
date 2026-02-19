/**
 * GPA Calculator — shared types and pure utility functions.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type CourseLevel = 'regular' | 'pre-ap' | 'ap' | 'dual-credit';

export interface GPAScale {
  regular: number;
  'pre-ap': number;
  ap: number;
  'dual-credit': number;
}

export interface CourseGPAEntry {
  id: string;
  courseName: string;
  courseCode: string;
  grade: number;
  level: CourseLevel;
  credits: number;
  gpaPoints: number;
  excluded: boolean;
  cycle?: string;
  year?: string;
}

export interface GPAStats {
  cumulativeGPA: number;
  totalCredits: number;
  totalGPAPoints: number;
  includedCount: number;
  excludedCount: number;
  byLevel: Record<CourseLevel, { count: number; avgGPA: number }>;
  averageGrade: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

/** Texas standard GPA scale (6.0 scale) */
export const GPA_SCALES: Record<string, GPAScale> = {
  texas_6: {
    regular: 5.0,
    'pre-ap': 5.5,
    ap: 6.0,
    'dual-credit': 6.0,
  },
  standard_4: {
    regular: 4.0,
    'pre-ap': 4.5,
    ap: 5.0,
    'dual-credit': 5.0,
  },
};

// ─── Pure helpers ──────────────────────────────────────────────────────────

export function detectCourseLevel(courseName: string, courseCode: string): CourseLevel {
  const nameUpper = courseName.toUpperCase();
  const codeUpper = courseCode.toUpperCase();
  const combined = nameUpper + ' ' + codeUpper;

  if (
    combined.includes('AP ') ||
    combined.includes('A.P.') ||
    combined.includes(' AP') ||
    /\bAP\b/.test(combined) ||
    combined.includes('ADVANCED PLACEMENT')
  ) {
    return 'ap';
  }

  if (
    combined.includes('DUAL CREDIT') ||
    combined.includes('DUAL-CREDIT') ||
    combined.includes('DUALCREDIT') ||
    combined.includes('DC ') ||
    combined.includes(' DC') ||
    /\bDC\b/.test(combined) ||
    combined.includes('COLLEGE ') ||
    combined.includes('ONRAMPS') ||
    combined.includes('ON RAMPS') ||
    combined.includes('ON-RAMPS')
  ) {
    return 'dual-credit';
  }

  if (
    combined.includes('PRE-AP') ||
    combined.includes('PRE AP') ||
    combined.includes('PREAP') ||
    combined.includes('PAP ') ||
    combined.includes(' PAP') ||
    /\bPAP\b/.test(combined) ||
    combined.includes('HONORS') ||
    combined.includes('HONOR ') ||
    combined.includes(' GT ') ||
    combined.includes(' GT') ||
    /\bGT\b/.test(combined) ||
    combined.includes('GIFTED') ||
    combined.includes('ADVANCED ') ||
    combined.includes(' ADV ') ||
    combined.includes('ACCELERATED') ||
    combined.includes('IB ') ||
    /\bIB\b/.test(combined)
  ) {
    return 'pre-ap';
  }

  return 'regular';
}

/**
 * Leander ISD GPA Calculation (Exact Percentage Based)
 *
 * GPA = maxGPA - (100 - grade) × 0.1
 * Below 70 = 0.0
 */
export function calculateGPA(grade: number, level: CourseLevel, scale: GPAScale): number {
  if (grade < 70) return 0;
  const cappedGrade = Math.min(grade, 100);
  const maxGPA = scale[level];
  const gpa = maxGPA - (100 - cappedGrade) * 0.1;
  return Math.round(gpa * 10) / 10;
}

export function getGradeColor(grade: number): string {
  if (grade >= 90) return 'text-green-600 dark:text-green-400';
  if (grade >= 80) return 'text-blue-600 dark:text-blue-400';
  if (grade >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export function getLevelBadgeColor(level: CourseLevel): string {
  switch (level) {
    case 'ap':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'dual-credit':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'pre-ap':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
}

export function getLevelLabel(level: CourseLevel): string {
  switch (level) {
    case 'ap':
      return 'AP';
    case 'dual-credit':
      return 'Dual Credit';
    case 'pre-ap':
      return 'Pre-AP/Honors';
    default:
      return 'Regular';
  }
}
