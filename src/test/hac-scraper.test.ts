import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HACSessionExpiredError,
  createSessionAndLogin,
  fetchGrades,
  fetchReportCard,
  getCourseLevel,
} from '../../lib/hac/scraper';
import { encryptSession } from '../../lib/hac/session-token';
import { detectCourseLevel } from '@/pages/gpa-calculator/types';

const sessionToken = () =>
  encryptSession({
    cookies: 'seed=1',
    username: 'student',
    password: 'password',
    baseUrl: 'https://example.test',
    expiresAt: Date.now() + 60_000,
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HAC scraper', () => {
  it('parses cycles and assignment columns without including the All Runs option', async () => {
    const html = `
      <form>
        <select id="plnMain_ddlReportCardRuns" name="ctl00$plnMain$ddlReportCardRuns">
          <option value="ALL">(All Runs)</option>
          <option selected="selected" value="1-2026">1</option>
          <option value="2-2026">2</option>
        </select>
      </form>
      <div class="AssignmentClass">
        <a class="sg-header-heading">1234 - 1 • Pre-AP Biology</a>
        <span class="sg-header-heading sg-right">95.5% Cycle Average</span>
        <table class="sg-asp-table">
          <tr class="sg-asp-table-header-row">
            <td>Due Date</td><td>Date Assigned</td><td>Assignment</td><td>Category</td>
            <td>Score</td><td>Total Points</td><td>Weight</td><td>Weighted Score</td>
            <td>Weighted Total Points</td><td>Percentage</td>
          </tr>
          <tr class="sg-asp-table-data-row">
            <td>01/01/2026</td><td>12/20/2025</td><td>Lab</td><td>Major</td>
            <td>18 / 20</td><td>20</td><td>1.00</td><td>18</td><td>20</td><td>90%</td>
          </tr>
        </table>
      </div>`;

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(html, { status: 200 })),
    );

    const result = await fetchGrades(sessionToken());

    expect(result?.currentCycle).toBe('1-2026');
    expect(result?.availableCycles.map((cycle) => cycle.value)).toEqual(['1-2026', '2-2026']);
    expect(result?.grades[0]).toMatchObject({
      courseId: '1234 - 1',
      numericGrade: 95.5,
      gpa: 5.1,
    });
    expect(result?.grades[0].assignments[0]).toMatchObject({
      earnedPoints: 18,
      totalPoints: 20,
      percentage: 90,
    });
  });

  it('switches report-card runs with an ASP.NET postback and parses decimal grades', async () => {
    const reportHtml = `
      <form action="/HomeAccess/Content/Student/ReportCards.aspx">
        <select id="plnMain_ddlRCRuns" name="ctl00$plnMain$ddlRCRuns">
          <option selected="selected" value="1-2026">1</option>
          <option value="2-2026">2</option>
        </select>
      </form>
      <table id="plnMain_dgReportCard">
        <tr class="sg-asp-table-header-row"><td>Course</td><td>Description</td><td>Cycle 1</td><td>C2</td></tr>
        <tr class="sg-asp-table-data-row"><td>1234</td><td><a href="#">AP English</a></td><td>95.5</td><td>88.25%</td></tr>
      </table>`;

    const fetchMock = vi.fn(async () => new Response(reportHtml, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchReportCard(sessionToken());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result?.cycles).toHaveLength(2);
    expect(result?.cycles[0].courses[0]).toMatchObject({
      course: 'AP English',
      grade: 95.5,
    });
    expect(result?.cycles[1].courses[0].grade).toBe(88.25);
  });
  it('classifies Pre-AP before AP', () => {
    expect(getCourseLevel('Pre-AP Biology')).toBe('preap');
    expect(detectCourseLevel('Pre-AP Biology', '')).toBe('pre-ap');
  });

  it('surfaces an expired HAC page as an auth error', async () => {
    const loginHtml =
      '<html><input id="LogOnDetails_UserName" /><input name="LogOnDetails.Password" /></html>';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(loginHtml, { status: 200 })),
    );

    await expect(fetchGrades(sessionToken())).rejects.toBeInstanceOf(HACSessionExpiredError);
  });

  it('keeps all cookies when Set-Cookie is exposed as one combined header', async () => {
    const combinedCookies =
      'ApplicationGatewayAffinity=affinity; Path=/, ASP.NET_SessionId=session; Path=/; HttpOnly';
    const response = (status: number, body: string, setCookie = '', location = '') =>
      ({
        ok: status >= 200 && status < 300,
        status,
        headers: {
          get: (name: string) =>
            name === 'set-cookie' ? setCookie : name === 'location' ? location : null,
        },
        text: async () => body,
      }) as unknown as Response;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response(
          200,
          '<form><input type="hidden" name="__RequestVerificationToken" value="token" /></form>',
          combinedCookies,
        ),
      )
      .mockResolvedValueOnce(
        response(
          302,
          '',
          'AuthCookie=auth; Path=/',
          '/HomeAccess/Content/Student/Assignments.aspx',
        ),
      )
      .mockResolvedValueOnce(response(200, '<title>Dashboard</title>'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createSessionAndLogin('student', 'password');

    expect(result.session).not.toBeNull();
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({
      Cookie: expect.stringContaining('ASP.NET_SessionId=session'),
    });
    expect(result.session?.cookies).toContain('AuthCookie=auth');
  });
});
