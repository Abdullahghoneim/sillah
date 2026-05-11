import { API_BASE_URL, authClient } from './auth-client';

export type StudentLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type StudentStatusValue = 'ACTIVE' | 'INACTIVE';
export type AgeFilter = 'under8' | '8-12' | 'over12';

export interface Student {
  id: string;
  name: string;
  email: string | null;
  age: number | null;
  level: StudentLevel;
  status: StudentStatusValue;
  parentEmail: string | null;
  avatarUrl: string | null;
  teacherId: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProgress {
  overallProgress: number;
  attendanceRate: number;
  lessonsCompleted: number;
  practiceCompleted: number;
}

export interface StudentWithProgress extends Student {
  progress: StudentProgress | null;
}

export interface StudentWithTeacher extends Student {
  teacher: { id: string; name: string; email: string } | null;
  progress: StudentProgress | null;
}

export interface StudentsListResponse {
  students: Student[];
  total: number;
  page: number;
  totalPages: number;
}

export interface InviteStudentBody {
  name: string;
  email: string;
  age?: number;
  level?: StudentLevel;
  parentEmail?: string;
}

export interface ListStudentsParams {
  search?: string;
  age?: AgeFilter;
  level?: StudentLevel;
  page?: number;
  limit?: number;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const cookie = authClient.getCookie();
  return {
    'Content-Type': 'application/json',
    ...(cookie ? { Cookie: cookie } : {}),
    ...(extra ?? {}),
  };
}

async function parseJsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data
        ? String((data as { error?: unknown }).error)
        : '') || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function listStudents(
  params: ListStudentsParams = {},
): Promise<StudentsListResponse> {
  const search = new URLSearchParams();
  if (params.search) search.set('search', params.search);
  if (params.age) search.set('age', params.age);
  if (params.level) search.set('level', params.level);
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  const qs = search.toString();
  const res = await fetch(
    `${API_BASE_URL}/api/students${qs ? `?${qs}` : ''}`,
    { method: 'GET', headers: authHeaders() },
  );
  return parseJsonOrThrow(res) as Promise<StudentsListResponse>;
}

export async function inviteStudent(
  body: InviteStudentBody,
): Promise<{
  student: Student;
  invitation: { id: string; status: string; expiresAt: string };
}> {
  const res = await fetch(`${API_BASE_URL}/api/students/invite`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return parseJsonOrThrow(res) as Promise<{
    student: Student;
    invitation: { id: string; status: string; expiresAt: string };
  }>;
}

export async function getStudent(
  studentId: string,
): Promise<{ student: StudentWithProgress }> {
  const res = await fetch(`${API_BASE_URL}/api/students/${studentId}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseJsonOrThrow(res) as Promise<{ student: StudentWithProgress }>;
}

export async function updateStudent(
  studentId: string,
  body: Partial<Pick<Student, 'name' | 'age' | 'level' | 'status'>>,
): Promise<Student> {
  const res = await fetch(`${API_BASE_URL}/api/students/${studentId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return parseJsonOrThrow(res) as Promise<Student>;
}

export async function removeStudent(studentId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/students/${studentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data && typeof data === 'object' && 'error' in data
        ? String((data as { error?: unknown }).error)
        : '') || `Request failed (${res.status})`,
    );
  }
}

export async function getMyStudentProfile(): Promise<{
  student: StudentWithTeacher;
}> {
  const res = await fetch(`${API_BASE_URL}/api/students/me`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseJsonOrThrow(res) as Promise<{ student: StudentWithTeacher }>;
}

export async function acceptInviteToken(token: string): Promise<{
  student?: Student;
  valid?: boolean;
  studentName?: string;
  email?: string;
}> {
  const res = await fetch(
    `${API_BASE_URL}/api/students/invitations/accept?token=${encodeURIComponent(token)}`,
    { method: 'POST', headers: authHeaders() },
  );
  return parseJsonOrThrow(res) as Promise<{
    student?: Student;
    valid?: boolean;
    studentName?: string;
    email?: string;
  }>;
}
