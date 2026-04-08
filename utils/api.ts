import Constants from 'expo-constants';

import type { ProfileSnapshots } from '@/store/useProfileStore';

export interface RemoteUser {
  id: string;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface RequestOtpResponse {
  message: string;
}

export interface VerifyOtpResponse {
  isNewUser: boolean;
  message: string;
  profile: ProfileSnapshots;
  profileUpdatedAt: string | null;
  sessionToken: string;
  user: RemoteUser;
}

export interface CurrentUserResponse {
  profile: ProfileSnapshots;
  profileUpdatedAt: string | null;
  user: RemoteUser;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function resolveApiBaseUrl() {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return trimTrailingSlash(explicitBaseUrl);
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3001`;
  }

  return 'http://localhost:3001';
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new ApiError(payload?.message ?? 'Request failed.', response.status);
  }

  return payload as T;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  sessionToken?: string
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }

  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    ...options,
    headers,
  });

  return parseResponse<T>(response);
}

export async function requestEmailOtp(email: string) {
  return apiRequest<RequestOtpResponse>('/api/auth/request-otp', {
    body: JSON.stringify({ email }),
    method: 'POST',
  });
}

export async function verifyEmailOtp(email: string, otp: string) {
  return apiRequest<VerifyOtpResponse>('/api/auth/verify-otp', {
    body: JSON.stringify({ email, otp }),
    method: 'POST',
  });
}

export async function fetchCurrentUser(sessionToken: string) {
  return apiRequest<CurrentUserResponse>('/api/me', { method: 'GET' }, sessionToken);
}

export async function saveRemoteProfile(sessionToken: string, profile: ProfileSnapshots) {
  return apiRequest<CurrentUserResponse>('/api/me/profile', {
    body: JSON.stringify({ profile }),
    method: 'PUT',
  }, sessionToken);
}

export async function logoutRemoteSession(sessionToken: string) {
  return apiRequest<{ message: string }>('/api/auth/logout', { method: 'POST' }, sessionToken);
}
