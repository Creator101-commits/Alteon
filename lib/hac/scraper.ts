/**
 * Home Access Center (HAC) Web Scraper Service
 * TypeScript implementation for scraping grades from HAC
 */

import * as cheerio from 'cheerio';
import { 
  HACCredentials, 
  HACSession, 
  HACCourse, 
  HACAssignment,
  HACReportCard,
  HACReportCardCycle,
  HACGradesResponse,
  HACGPACalculation,
  DEFAULT_HAC_BASE_URL,
  HAC_ENDPOINTS,
  CourseLevel
} from './types';

// Session management
const activeSessions = new Map<string, HACSession>();
const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Cookie jar class to manage cookies across requests
 */
class CookieJar {
  private cookies = new Map<string, string>();
  
  addFromResponse(response: Response) {
    let setCookieHeaders: string[] = [];
    
    // Try getSetCookie first (newer Node.js 20+)
    if (typeof (response.headers as any).getSetCookie === 'function') {
      setCookieHeaders = (response.headers as any).getSetCookie();
      console.log('[HAC Cookie] Using getSetCookie(), found', setCookieHeaders.length, 'cookies');
    } else {
      // Fallback: manually parse from raw headers
      // In Node.js fetch, multiple set-cookie headers may be available via raw()
      if (typeof (response.headers as any).raw === 'function') {
        const rawHeaders = (response.headers as any).raw();
        setCookieHeaders = rawHeaders['set-cookie'] || [];
        console.log('[HAC Cookie] Using raw(), found', setCookieHeaders.length, 'cookies');
      } else {
        // Last resort: try to get as single header (may lose some cookies)
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
          // Simple split by comma - this may not work for all cases
          setCookieHeaders = [setCookieHeader];
          console.log('[HAC Cookie] Using single header fallback, found 1 cookie header');
        } else {
          console.log('[HAC Cookie] No set-cookie headers found in response');
        }
      }
    }
    
    console.log('[HAC Cookie] Processing', setCookieHeaders.length, 'set-cookie headers');
    for (const setCookie of setCookieHeaders) {
      const parts = setCookie.split(';')[0].split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        this.cookies.set(name, value);
        console.log('[HAC Cookie] Added cookie:', name);
      }
    }
  }
  
  toString(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
  
  size(): number {
    return this.cookies.size;
  }
}

/**
 * Fetch with cookie support and manual redirect following
 */
async function fetchWithCookies(
  url: string, 
  cookieJar: CookieJar, 
  options: RequestInit = {}
): Promise<{ response: Response; finalUrl: string }> {
  const MAX_REDIRECTS = 10;
  let currentUrl = url;
  let redirectCount = 0;
  let response: Response;
  
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  
  while (redirectCount < MAX_REDIRECTS) {
    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      ...(options.headers as Record<string, string> || {})
    };
    
    const cookieString = cookieJar.toString();
    if (cookieString) {
      headers['Cookie'] = cookieString;
    }
    
    response = await fetch(currentUrl, {
      ...options,
      headers,
      redirect: 'manual'
    });
    
    // Collect cookies from this response
    cookieJar.addFromResponse(response);
    
    // Check for redirect
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      // Resolve relative URLs
      currentUrl = new URL(location, currentUrl).toString();
      redirectCount++;
      
      // After POST redirect, use GET
      if (options.method === 'POST') {
        options = { ...options, method: 'GET', body: undefined };
      }
      continue;
    }
    
    // No redirect, we're done
    break;
  }
  
  return { response: response!, finalUrl: currentUrl };
}

/**
 * Generate a random session ID
 */
function generateSessionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions(): void {
  const now = Date.now();
  const entries = Array.from(activeSessions.entries());
  for (const [sessionId, session] of entries) {
    if (session.expiresAt.getTime() < now) {
      activeSessions.delete(sessionId);
    }
  }
}

/**
 * Calculate GPA for a grade based on course type
 */
export function calculateGpaForGrade(gradePercent: number, courseName: string): number {
  // Round grade to nearest whole number (standard rounding)
  const roundedGrade = Math.round(gradePercent);
  
  // Determine base GPA based on course level
  let baseGpa: number;
  const upperName = courseName.toUpperCase();
  
  if (upperName.includes('AP') || upperName.includes('A.P.')) {
    baseGpa = 6.0; // AP courses
  } else if (upperName.includes('ADV') || upperName.includes('ADVANCED') || upperName.includes('HONORS') || upperName.includes('PRE-AP')) {
    baseGpa = 5.5; // Advanced/Honors courses
  } else {
    baseGpa = 5.0; // Regular courses
  }
  
  // Calculate GPA: subtract 0.1 for each point below 100
  const pointsBelow100 = 100 - roundedGrade;
  const gpa = baseGpa - (pointsBelow100 * 0.1);
  
  // Clamp between 0 and base GPA
  return Math.max(0, Math.min(gpa, baseGpa));
}

/**
 * Get course level from course name
 */
export function getCourseLevel(courseName: string): CourseLevel {
  const upperName = courseName.toUpperCase();
  
  if (upperName.includes('AP') || upperName.includes('A.P.')) {
    return 'ap';
  } else if (upperName.includes('ADV') || upperName.includes('ADVANCED') || upperName.includes('HONORS') || upperName.includes('PRE-AP')) {
    return 'advanced';
  }
  return 'regular';
}

/**
 * Create a session and login to HAC
 */
export async function createSessionAndLogin(
  username: string, 
  password: string,
  baseUrl: string = DEFAULT_HAC_BASE_URL
): Promise<{ session: HACSession | null; error: string | null }> {
  try {
    console.log('[HAC] Attempting login to:', baseUrl);
    const loginUrl = `${baseUrl}${HAC_ENDPOINTS.LOGIN}`;
    
    // Create cookie jar for this session
    const cookieJar = new CookieJar();
    
    // First, get the login page to extract form tokens
    const { response: loginPageResponse } = await fetchWithCookies(loginUrl, cookieJar, {
      method: 'GET'
    });
    
    if (!loginPageResponse.ok) {
      console.error('[HAC] Failed to access login page:', loginPageResponse.status);
      return { session: null, error: 'Failed to access HAC login page' };
    }
    
    const loginPageHtml = await loginPageResponse.text();
    const $ = cheerio.load(loginPageHtml);
    
    console.log('[HAC] Initial cookies:', cookieJar.size() > 0 ? `${cookieJar.size()} cookies` : 'none');
    
    // Build login form data
    const loginData = new URLSearchParams();
    loginData.append('Database', '10');
    loginData.append('LogOnDetails.UserName', username);
    loginData.append('LogOnDetails.Password', password);
    
    // Extract hidden form fields
    $('form input[type="hidden"]').each((_, el) => {
      const name = $(el).attr('name');
      const value = $(el).attr('value') || '';
      if (name) {
        loginData.append(name, value);
      }
    });
    
    console.log('[HAC] Submitting login form...');
    
    // Submit login - fetchWithCookies will follow redirects and collect cookies
    const { response: loginResponse, finalUrl } = await fetchWithCookies(loginUrl, cookieJar, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: loginData.toString()
    });
    
    console.log('[HAC] Login response status:', loginResponse.status);
    console.log('[HAC] Final URL after redirects:', finalUrl);
    console.log('[HAC] Cookies collected:', cookieJar.size());
    
    // Check if login was successful (should redirect away from login page)
    if (finalUrl.includes('LogOn')) {
      // Still on login page = failed
      console.error('[HAC] Login failed - still on login page');
      return { session: null, error: 'Invalid username or password' };
    }
    
    // Check if we got any session cookies
    if (cookieJar.size() === 0) {
      console.error('[HAC] Login failed - no cookies received from server');
      return { session: null, error: 'Unable to establish session with HAC. The server may be unreachable or blocking automated access.' };
    }
    
    const finalCookies = cookieJar.toString();
    console.log('[HAC] Login successful! Creating session with', cookieJar.size(), 'cookies');
    
    // Create session
    const sessionId = generateSessionId();
    const session: HACSession = {
      sessionId,
      cookies: finalCookies,
      expiresAt: new Date(Date.now() + SESSION_TIMEOUT_MS),
      credentials: { username, password, districtBaseUrl: baseUrl }
    };
    
    activeSessions.set(sessionId, session);
    
    // Schedule cleanup
    if (activeSessions.size % 10 === 0) {
      cleanupExpiredSessions();
    }
    
    return { session, error: null };
  } catch (error) {
    console.error('[HAC] Login error:', error);
    return { session: null, error: `Login failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Validate and refresh session if needed
 */
export async function validateSession(sessionId: string): Promise<boolean> {
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return false;
  }
  
  // Check if expired
  if (session.expiresAt.getTime() < Date.now()) {
    // Try to re-login
    const { session: newSession, error } = await createSessionAndLogin(
      session.credentials.username,
      session.credentials.password,
      session.credentials.districtBaseUrl
    );
    
    if (error || !newSession) {
      activeSessions.delete(sessionId);
      return false;
    }
    
    // Update session with new cookies
    session.cookies = newSession.cookies;
    session.expiresAt = newSession.expiresAt;
    activeSessions.delete(newSession.sessionId); // Remove duplicate
    return true;
  }
  
  // Extend session
  session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MS);
  return true;
}

/**
 * Get session by ID
 */
export function getSession(sessionId: string): HACSession | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Parse assignments from a class element
 */
function parseAssignmentsFromClass($: cheerio.CheerioAPI, classElement: any): HACAssignment[] {
  const assignments: HACAssignment[] = [];
  const $class = $(classElement);
  
  const assignmentTable = $class.find('table.sg-asp-table');
  if (!assignmentTable.length) return assignments;
  
  assignmentTable.find('tr.sg-asp-table-data-row').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length >= 4) {
      const dateDue = $(cells[0]).text().trim();
      const dateAssigned = $(cells[1]).text().trim();
      const name = $(cells[2]).text().trim();
      const category = $(cells[3]).text().trim();
      const score = cells.length > 4 ? $(cells[4]).text().trim() : 'N/A';
      
      assignments.push({
        dateDue,
        dateAssigned,
        name,
        category,
        score
      });
    }
  });
  
  return assignments;
}

/**
 * Fetch grades from HAC
 * @param sessionId - The session ID
 * @param cycleNumber - Optional cycle number (1-6). If not provided, fetches current cycle.
 */
export async function fetchGrades(sessionId: string, cycleNumber?: number): Promise<HACGradesResponse | null> {
  console.log('[HAC] fetchGrades called with sessionId:', sessionId.substring(0, 10) + '...', 'cycleNumber:', cycleNumber);
  
  const session = activeSessions.get(sessionId);
  if (!session) {
    console.error('[HAC] fetchGrades: No session found for ID:', sessionId);
    return null;
  }
  
  // Check if session expired
  if (session.expiresAt.getTime() < Date.now()) {
    console.error('[HAC] Session expired');
    activeSessions.delete(sessionId);
    return null;
  }
  
  const baseUrl = session.credentials.districtBaseUrl || DEFAULT_HAC_BASE_URL;
  let gradesUrl = `${baseUrl}${HAC_ENDPOINTS.ASSIGNMENTS}`;
  
  // If a specific cycle is requested, try different parameter formats
  // HAC might use different parameter names like 'MarkingPeriod', 'ReportPeriod', etc.
  if (cycleNumber !== undefined && cycleNumber >= 1 && cycleNumber <= 6) {
    // Try the ReportPeriod parameter format (common in eSchoolPlus/PowerSchool)
    gradesUrl += `?ReportPeriod=${cycleNumber}`;
  }
  
  console.log('[HAC] Fetching grades from:', gradesUrl);
  console.log('[HAC] Using cookies:', session.cookies ? `${session.cookies.length} chars` : 'none');
  
  try {
    const response = await fetch(gradesUrl, {
      headers: {
        'Cookie': session.cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'manual' // Don't follow redirects - if we get one, session is invalid
    });
    
    console.log('[HAC] Grades response status:', response.status);
    
    // If redirected, session is likely expired
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') || '';
      console.error('[HAC] Session invalid - redirected to:', location);
      return null;
    }
    
    if (!response.ok) {
      console.error('[HAC] Failed to fetch grades:', response.status);
      return null;
    }
    
    const html = await response.text();
    console.log('[HAC] Response HTML length:', html.length, 'chars');
    
    const $ = cheerio.load(html);
    
    // Check if we're on login page (various indicators)
    const pageTitle = $('title').text().toLowerCase();
    const hasLoginForm = $('#LogOnDetails_UserName').length > 0 || $('input[name="LogOnDetails.UserName"]').length > 0;
    
    if (pageTitle.includes('log on') || hasLoginForm || html.includes('LogOn') && html.includes('Password')) {
      console.error('[HAC] Session expired - on login page');
      return null;
    }
    
    const grades: HACCourse[] = [];
    const classes = $('div.AssignmentClass');
    
    console.log('[HAC] Found', classes.length, 'classes');
    
    classes.each((idx, cls) => {
      const $cls = $(cls);
      
      // Get course name
      const courseNameElem = $cls.find('a.sg-header-heading');
      if (!courseNameElem.length) return;
      
      const courseName = courseNameElem.text().trim();
      
      // Try to extract course code from the course name
      // Format is usually like "1210ADV - 1 • English II Advanced"
      let courseCode = String(idx); // fallback to index
      const courseCodeMatch = courseName.match(/^([A-Z0-9]+(?:-\s*\d+)?)/);
      if (courseCodeMatch) {
        courseCode = courseCodeMatch[1].trim();
      }
      
      // Get grade average
      const avgElem = $cls.find('span.sg-header-heading.sg-right');
      let gradeText = '';
      let numericGrade: number | null = null;
      let courseGpa: number | null = null;
      
      if (avgElem.length) {
        gradeText = avgElem.text().trim().replace('Cycle Average', '').trim();
        
        if (gradeText) {
          const gradeMatch = gradeText.match(/(\d+\.?\d*)/);
          if (gradeMatch) {
            numericGrade = parseFloat(gradeMatch[1]);
            courseGpa = Math.round(calculateGpaForGrade(numericGrade, courseName) * 100) / 100;
          }
        }
      }
      
      if (!gradeText) {
        gradeText = 'No Grade Yet';
      }
      
      // Get assignments
      const assignments = parseAssignmentsFromClass($, cls);
      
      grades.push({
        courseId: courseCode,
        name: courseName,
        grade: gradeText,
        numericGrade,
        gpa: courseGpa,
        assignments
      });
    });
    
    // Calculate overall average
    let total = 0;
    let count = 0;
    for (const grade of grades) {
      if (grade.numericGrade !== null) {
        total += grade.numericGrade;
        count++;
      }
    }
    const overallAverage = count > 0 ? Math.round((total / count) * 100) / 100 : 0;
    
    // Pick a highlighted course (random valid one)
    const validCourses = grades.filter(g => g.numericGrade !== null);
    const highlightedCourse = validCourses.length > 0 
      ? validCourses[Math.floor(Math.random() * validCourses.length)]
      : null;
    
    return {
      grades,
      overallAverage,
      highlightedCourse
    };
  } catch (error) {
    console.error('Error fetching grades:', error);
    return null;
  }
}

/**
 * Fetch assignments for a specific course
 */
export async function fetchAssignmentsForCourse(
  sessionId: string, 
  courseIndex: number
): Promise<HACAssignment[] | null> {
  const gradesData = await fetchGrades(sessionId);
  if (!gradesData) return null;
  
  const course = gradesData.grades[courseIndex];
  return course?.assignments || [];
}

/**
 * Fetch report card data
 */
export async function fetchReportCard(sessionId: string): Promise<HACReportCard | null> {
  const session = activeSessions.get(sessionId);
  if (!session) return null;
  
  const baseUrl = session.credentials.districtBaseUrl || DEFAULT_HAC_BASE_URL;
  const reportCardUrl = `${baseUrl}${HAC_ENDPOINTS.REPORT_CARDS}`;
  
  try {
    const response = await fetch(reportCardUrl, {
      headers: {
        'Cookie': session.cookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch report card:', response.status);
      return null;
    }
    
    let html = await response.text();
    let $ = cheerio.load(html);
    
    // Check if we need to select a different report card run
    const dropdown = $('#plnMain_ddlRCRuns');
    if (dropdown.length) {
      const options = dropdown.find('option');
      if (options.length > 0) {
        const lastOption = options.last();
        const lastValue = lastOption.attr('value');
        const selectedOption = dropdown.find('option[selected]');
        const currentValue = selectedOption.attr('value');
        
        // If not on latest, fetch latest
        if (currentValue !== lastValue && lastValue) {
          const parts = lastValue.split('-');
          const rcrun = parts.length >= 2 ? parts[0] : lastValue;
          
          const latestResponse = await fetch(`${reportCardUrl}?RCRun=${rcrun}`, {
            headers: {
              'Cookie': session.cookies,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          
          if (latestResponse.ok) {
            html = await latestResponse.text();
            $ = cheerio.load(html);
          }
        }
      }
    }
    
    const reportCardTable = $('#plnMain_dgReportCard');
    if (!reportCardTable.length) {
      return { cycles: [], overallGpa: 0 };
    }
    
    // Find headers to map columns
    let headerRow = reportCardTable.find('tr.sg-asp-table-header-row');
    if (!headerRow.length) {
      headerRow = reportCardTable.find('tr').first();
    }
    
    const headers: string[] = [];
    headerRow.find('th, td').each((_, el) => {
      headers.push($(el).text().trim());
    });
    
    // Map cycle names (C1, C2, etc.) to column indices
    const cycleIndices: Record<string, number> = {};
    headers.forEach((header, idx) => {
      if (/^C\d+$/.test(header)) {
        cycleIndices[header] = idx;
      }
    });
    
    // Initialize cycles data
    const cyclesData: Record<string, { course: string; courseCode: string; grade: number; numericGrade: number; gpa: number }[]> = {};
    for (const cycle of Object.keys(cycleIndices)) {
      cyclesData[cycle] = [];
    }
    
    // Parse rows
    const rows = reportCardTable.find('tr.sg-asp-table-data-row');
    rows.each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      
      const courseCode = $(cells[0]).text().trim();
      const courseLink = $(cells[1]).find('a');
      const courseName = courseLink.length 
        ? courseLink.text().trim() 
        : $(cells[1]).text().trim();
      
      // Get grade for each cycle
      for (const [cycleName, idx] of Object.entries(cycleIndices)) {
        if (idx < cells.length) {
          const gradeText = $(cells[idx]).text().trim();
          if (gradeText && /^\d+$/.test(gradeText)) {
            const grade = parseInt(gradeText, 10);
            const gpa = Math.round(calculateGpaForGrade(grade, courseName) * 100) / 100;
            
            cyclesData[cycleName].push({
              course: courseName,
              courseCode,
              grade,
              numericGrade: grade,
              gpa
            });
          }
        }
      }
    });
    
    // Build cycles array
    const cycles: HACReportCardCycle[] = [];
    
    // Sort cycles by number
    const sortedCycleKeys = Object.keys(cyclesData).sort((a, b) => {
      const numA = parseInt(a.substring(1), 10);
      const numB = parseInt(b.substring(1), 10);
      return numA - numB;
    });
    
    for (const cycleKey of sortedCycleKeys) {
      const courses = cyclesData[cycleKey];
      if (courses.length > 0) {
        const totalGpa = courses.reduce((sum, c) => sum + c.gpa, 0);
        const avgGpa = Math.round((totalGpa / courses.length) * 100) / 100;
        
        cycles.push({
          cycleName: `Cycle ${cycleKey.substring(1)}`,
          courses,
          averageGpa: avgGpa
        });
      }
    }
    
    // Calculate overall GPA
    let overallGpa = 0;
    let totalCourses = 0;
    for (const cycle of cycles) {
      for (const course of cycle.courses) {
        overallGpa += course.gpa;
        totalCourses++;
      }
    }
    overallGpa = totalCourses > 0 
      ? Math.round((overallGpa / totalCourses) * 100) / 100 
      : 0;
    
    return { cycles, overallGpa };
  } catch (error) {
    console.error('Error fetching report card:', error);
    return null;
  }
}

/**
 * Calculate cumulative GPA including past cycles
 */
export async function calculateCumulativeGpa(
  sessionId: string,
  selectedCourseIds: string[],
  excludedCourseNames: string[] = []
): Promise<HACGPACalculation | null> {
  const gradesData = await fetchGrades(sessionId);
  if (!gradesData) return null;
  
  const reportCard = await fetchReportCard(sessionId);
  
  // Calculate GPA from current courses
  const currentCourseGpas: number[] = [];
  for (const grade of gradesData.grades) {
    if (selectedCourseIds.includes(grade.courseId) && grade.gpa !== null) {
      currentCourseGpas.push(grade.gpa);
    }
  }
  
  // Calculate GPA from past cycles
  const pastCycleGpas: number[] = [];
  const pastCyclesDetail: HACGPACalculation['pastCyclesDetail'] = [];
  
  if (reportCard) {
    for (const cycle of reportCard.cycles) {
      const cycleCourses: { courseName: string; grade: number; gpa: number }[] = [];
      let cycleTotalGpa = 0;
      let cycleCount = 0;
      
      for (const course of cycle.courses) {
        // Skip excluded courses
        if (excludedCourseNames.includes(course.course)) continue;
        
        cycleTotalGpa += course.gpa;
        cycleCount++;
        cycleCourses.push({
          courseName: course.course,
          grade: course.grade,
          gpa: course.gpa
        });
      }
      
      if (cycleCount > 0) {
        const cycleAvg = Math.round((cycleTotalGpa / cycleCount) * 100) / 100;
        pastCycleGpas.push(cycleAvg);
        pastCyclesDetail.push({
          cycleName: cycle.cycleName,
          courses: cycleCourses,
          averageGpa: cycleAvg
        });
      }
    }
  }
  
  // Combine all GPAs
  const allGpas = [...currentCourseGpas, ...pastCycleGpas];
  const cumulativeGpa = allGpas.length > 0
    ? Math.round((allGpas.reduce((a, b) => a + b, 0) / allGpas.length) * 100) / 100
    : 0;
  
  return {
    cumulativeGpa,
    currentCoursesCount: currentCourseGpas.length,
    pastCyclesCount: pastCycleGpas.length,
    pastCyclesDetail
  };
}

/**
 * Logout / destroy session
 */
export function destroySession(sessionId: string): void {
  activeSessions.delete(sessionId);
}

/**
 * Export session store for external management
 */
export { activeSessions };
