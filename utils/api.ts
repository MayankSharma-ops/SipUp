import Constants from 'expo-constants';
import { Platform } from 'react-native';

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

export interface LoginResponse {
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

function extractHost(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const withoutProtocol = value.replace(/^[a-z]+:\/\//i, '');
  const hostWithPort = withoutProtocol.split('/')[0] ?? '';
  const host = hostWithPort.split(':')[0] ?? '';

  return host || null;
}

function normalizeLoopbackBaseUrl(baseUrl: string) {
  try {
    const parsedUrl = new URL(baseUrl);
    const isLoopbackHost = ['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname);

    if (!isLoopbackHost || Platform.OS === 'web') {
      return trimTrailingSlash(parsedUrl.toString());
    }

    const expoHost =
      extractHost(Constants.expoConfig?.hostUri) ??
      extractHost((Constants.expoGoConfig as { debuggerHost?: string } | null)?.debuggerHost) ??
      extractHost(Constants.linkingUri);

    if (expoHost) {
      parsedUrl.hostname = expoHost;
      return trimTrailingSlash(parsedUrl.toString());
    }

    if (Platform.OS === 'android') {
      parsedUrl.hostname = '10.0.2.2';
      return trimTrailingSlash(parsedUrl.toString());
    }

    return trimTrailingSlash(parsedUrl.toString());
  } catch {
    return trimTrailingSlash(baseUrl);
  }
}

export function resolveApiBaseUrl() {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return normalizeLoopbackBaseUrl(explicitBaseUrl);
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3001`;
  }

  return 'http://localhost:3001';
}

async function parseResponse<T>(response: Response): Promise<T> {
  const responseText = await response.text();
  let payload: ({ message?: string } & T) | null = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText) as ({ message?: string } & T) | null;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (payload?.message) {
      throw new ApiError(payload.message, response.status);
    }

    if (response.status === 404) {
      throw new ApiError(
        'API route not found. Restart the backend so the latest auth routes are loaded.',
        response.status
      );
    }

    if (responseText.trim()) {
      throw new ApiError(`Request failed with status ${response.status}.`, response.status);
    }

    throw new ApiError('Request failed.', response.status);
  }

  return (payload ?? null) as T;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  sessionToken?: string
): Promise<T> {
  const baseUrl = resolveApiBaseUrl();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    const hint =
      Platform.OS === 'web'
        ? 'Make sure the backend is running on localhost:3001.'
        : 'If you are using a real phone, localhost will not work unless it is remapped to your computer IP.';

    throw new ApiError(
      `Network request failed while calling ${baseUrl}${path}. ${hint}`,
      0
    );
  }

  return parseResponse<T>(response);
}

export async function requestEmailOtp(email: string) {
  return apiRequest<RequestOtpResponse>('/api/auth/request-otp', {
    body: JSON.stringify({ email }),
    method: 'POST',
  });
}

export async function verifyEmailOtp(email: string, otp: string, password: string) {
  return apiRequest<VerifyOtpResponse>('/api/auth/verify-otp', {
    body: JSON.stringify({ email, otp, password }),
    method: 'POST',
  });
}

export async function loginWithPassword(email: string, password: string) {
  return apiRequest<LoginResponse>('/api/auth/login', {
    body: JSON.stringify({ email, password }),
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
