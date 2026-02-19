/**
 * useGPACalculator — all state & side-effects for the GPA Calculator page.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useHAC } from '@/contexts/HACContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseStorage } from '@/lib/supabase-storage';
import {
  type CourseLevel,
  type CourseGPAEntry,
  type GPAStats,
  GPA_SCALES,
  detectCourseLevel,
  calculateGPA,
} from './types';

export function useGPACalculator() {
  const {
    isConnected,
    isLoading,
    gradesData,
    reportCard,
    refreshGrades,
    fetchReportCard,
    error,
  } = useHAC();
  const { user } = useAuth();

  const [gpaScale, setGpaScale] = useState<'texas_6' | 'standard_4'>('texas_6');
  const [courses, setCourses] = useState<CourseGPAEntry[]>([]);
  const [excludedCoursesLoaded, setExcludedCoursesLoaded] = useState(false);
  const [cachedExcludedCourses, setCachedExcludedCourses] = useState<Set<string>>(new Set());

  // ─── Load / save exclusions ───────────────────────────────────────────────

  const getExcludedCourses = useCallback(async (): Promise<Set<string>> => {
    if (user?.uid) {
      try {
        const saved = await supabaseStorage.getGpaExcludedCourses(user.uid);
        if (saved && saved.length > 0) return new Set(saved);
      } catch (err) {
        console.error('Error loading GPA excluded courses:', err);
      }
    }
    return new Set();
  }, [user?.uid]);

  const saveExcludedCourses = useCallback(
    async (excludedNames: Set<string>) => {
      if (user?.uid) {
        try {
          await supabaseStorage.saveGpaExcludedCourses(user.uid, [...excludedNames]);
        } catch (err) {
          console.error('Error saving GPA excluded courses:', err);
        }
      }
    },
    [user?.uid],
  );

  useEffect(() => {
    (async () => {
      const excluded = await getExcludedCourses();
      setCachedExcludedCourses(excluded);
      setExcludedCoursesLoaded(true);
    })();
  }, [getExcludedCourses]);

  // ─── Load courses from HAC data ──────────────────────────────────────────

  useEffect(() => {
    if (!reportCard && isConnected) fetchReportCard();
  }, [isConnected, reportCard, fetchReportCard]);

  useEffect(() => {
    if (reportCard && excludedCoursesLoaded) {
      const processed: CourseGPAEntry[] = [];
      reportCard.cycles.forEach((cycle: any, ci: number) => {
        cycle.courses.forEach((course: any, coi: number) => {
          const level = detectCourseLevel(course.course, course.courseCode);
          processed.push({
            id: `${ci}-${coi}`,
            courseName: course.course,
            courseCode: course.courseCode,
            grade: course.grade,
            level,
            credits: 1,
            gpaPoints: calculateGPA(course.grade, level, GPA_SCALES[gpaScale]),
            excluded: cachedExcludedCourses.has(course.course),
            cycle: cycle.cycleName,
          });
        });
      });
      setCourses(processed);
    }
  }, [reportCard, gpaScale, excludedCoursesLoaded, cachedExcludedCourses]);

  useEffect(() => {
    if (gradesData && courses.length === 0 && excludedCoursesLoaded) {
      const current: CourseGPAEntry[] = gradesData.grades
        .filter((g: any) => g.numericGrade !== null)
        .map((course: any, idx: number) => {
          const level = detectCourseLevel(course.name, course.courseId || '');
          return {
            id: `current-${idx}`,
            courseName: course.name,
            courseCode: course.courseId || '',
            grade: course.numericGrade!,
            level,
            credits: 1,
            gpaPoints: calculateGPA(course.numericGrade!, level, GPA_SCALES[gpaScale]),
            excluded: cachedExcludedCourses.has(course.name),
            cycle: 'Current',
          };
        });

      setCourses((prev) => {
        const existing = new Set(prev.map((c) => c.courseName + c.cycle));
        return [...prev, ...current.filter((c) => !existing.has(c.courseName + c.cycle))];
      });
    }
  }, [gradesData, gpaScale]);

  // Recalculate when scale changes
  useEffect(() => {
    setCourses((prev) =>
      prev.map((c) => ({ ...c, gpaPoints: calculateGPA(c.grade, c.level, GPA_SCALES[gpaScale]) })),
    );
  }, [gpaScale]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const toggleExclusion = (courseId: string) => {
    setCourses((prev) => {
      const target = prev.find((c) => c.id === courseId);
      if (!target) return prev;
      const newExcluded = !target.excluded;
      const name = target.courseName;

      const next = new Set(cachedExcludedCourses);
      newExcluded ? next.add(name) : next.delete(name);
      setCachedExcludedCourses(next);
      saveExcludedCourses(next);

      return prev.map((c) => (c.courseName === name ? { ...c, excluded: newExcluded } : c));
    });
  };

  const toggleCycleExclusion = (cycleName: string, exclude: boolean) => {
    setCourses((prev) => {
      const names = prev.filter((c) => c.cycle === cycleName).map((c) => c.courseName);
      const next = new Set(cachedExcludedCourses);
      names.forEach((n) => (exclude ? next.add(n) : next.delete(n)));
      setCachedExcludedCourses(next);
      saveExcludedCourses(next);
      return prev.map((c) => (c.cycle === cycleName ? { ...c, excluded: exclude } : c));
    });
  };

  const changeCourseLevel = (courseId: string, level: CourseLevel) => {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId
          ? { ...c, level, gpaPoints: calculateGPA(c.grade, level, GPA_SCALES[gpaScale]) }
          : c,
      ),
    );
  };

  // ─── Derived data ─────────────────────────────────────────────────────────

  const gpaStats: GPAStats = useMemo(() => {
    const included = courses.filter((c) => !c.excluded);
    const excluded = courses.filter((c) => c.excluded);

    if (included.length === 0) {
      return {
        cumulativeGPA: 0,
        totalCredits: 0,
        totalGPAPoints: 0,
        includedCount: 0,
        excludedCount: excluded.length,
        byLevel: {
          regular: { count: 0, avgGPA: 0 },
          'pre-ap': { count: 0, avgGPA: 0 },
          ap: { count: 0, avgGPA: 0 },
          'dual-credit': { count: 0, avgGPA: 0 },
        },
        averageGrade: 0,
      };
    }

    const totalCredits = included.reduce((s, c) => s + c.credits, 0);
    const totalGPAPoints = included.reduce((s, c) => s + c.gpaPoints * c.credits, 0);
    const cumulativeGPA = totalGPAPoints / totalCredits;
    const averageGrade = included.reduce((s, c) => s + c.grade, 0) / included.length;

    const groups: Record<CourseLevel, number[]> = {
      regular: [],
      'pre-ap': [],
      ap: [],
      'dual-credit': [],
    };
    included.forEach((c) => groups[c.level].push(c.gpaPoints));

    const byLevel = Object.fromEntries(
      Object.entries(groups).map(([lvl, arr]) => [
        lvl,
        { count: arr.length, avgGPA: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0 },
      ]),
    ) as GPAStats['byLevel'];

    return { cumulativeGPA, totalCredits, totalGPAPoints, includedCount: included.length, excludedCount: excluded.length, byLevel, averageGrade };
  }, [courses]);

  const coursesByCycle = useMemo(() => {
    const grouped: Record<string, CourseGPAEntry[]> = {};
    courses.forEach((c) => {
      const key = c.cycle || 'Unknown';
      (grouped[key] ??= []).push(c);
    });
    return grouped;
  }, [courses]);

  return {
    // HAC state
    isConnected,
    isLoading,
    error,
    refreshGrades,
    fetchReportCard,
    // GPA state
    gpaScale,
    setGpaScale,
    courses,
    gpaStats,
    coursesByCycle,
    // Actions
    toggleExclusion,
    toggleCycleExclusion,
    changeCourseLevel,
  };
}
