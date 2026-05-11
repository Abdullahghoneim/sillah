import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL = 'http://localhost:3000';

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  plugins: [
    expoClient({
      scheme: 'sillah',
      storagePrefix: 'sillah',
      storage: SecureStore,
    }),
    emailOTPClient(),
  ],
});

export async function registerUser(input: {
  name: string;
  email: string;
  phone?: string;
  acceptTerms: true;
}) {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? `Register failed (${res.status})`);
  }
  return data as { user: { id: string; email: string }; otpRequired: true };
}
