import { API_BASE_URL, authClient } from './auth-client';

export interface ProfileUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  phone: string | null;
  bio: string | null;
  role: 'STUDENT' | 'TEACHER' | 'PARENT';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
  image?: string | null;
  bio?: string | null;
}

function authHeaders(): Record<string, string> {
  const cookie = authClient.getCookie();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cookie) headers.Cookie = cookie;
  return headers;
}

async function parseOrThrow(res: Response) {
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

export async function getMyProfile(): Promise<ProfileUser> {
  const res = await fetch(`${API_BASE_URL}/api/users/me`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return parseOrThrow(res) as Promise<ProfileUser>;
}

export async function updateMyProfile(
  input: UpdateProfileInput,
): Promise<ProfileUser> {
  const res = await fetch(`${API_BASE_URL}/api/users/me`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return parseOrThrow(res) as Promise<ProfileUser>;
}

export interface UploadAvatarOptions {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}

export async function uploadAvatar({
  uri,
  mimeType,
  fileName,
}: UploadAvatarOptions): Promise<{ image: string }> {
  const cookie = authClient.getCookie();
  const formData = new FormData();
  const inferredExt = (() => {
    const m = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return m ? m[1].toLowerCase() : 'jpg';
  })();
  const mime =
    mimeType ||
    (inferredExt === 'png'
      ? 'image/png'
      : inferredExt === 'webp'
        ? 'image/webp'
        : 'image/jpeg');
  formData.append('file', {
    uri,
    type: mime,
    name: fileName || `avatar.${inferredExt}`,
  } as unknown as Blob);

  const headers: Record<string, string> = {};
  if (cookie) headers.Cookie = cookie;
  // Do NOT set Content-Type manually — fetch sets the multipart boundary.

  const res = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
    method: 'POST',
    headers,
    body: formData as unknown as BodyInit,
  });
  return parseOrThrow(res) as Promise<{ image: string }>;
}

export async function deleteAvatar(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
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
