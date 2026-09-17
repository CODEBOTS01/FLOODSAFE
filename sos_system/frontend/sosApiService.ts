/**
 * SOSApiService — communicates with the SOS Express backend.
 * All TextBee credentials remain server-side.
 * API base URL is read from VITE_SOS_API_URL (falls back to /api via Vite proxy).
 */

const API_BASE = import.meta.env.VITE_SOS_API_URL ?? '/api';
const TIMEOUT_MS = 30_000;

// ── Types ─────────────────────────────────────────────────────────────

export interface SOSLocation {
  lat: number;
  lng: number;
}

export interface ContactResult {
  status: 'pending' | 'sent' | 'failed';
  twilioStatus: string | null;
  failureReason: string | null;
}

export interface SOSSuccess {
  success: true;
  duplicate: boolean;
  eventId: string;
  timestamp: string;
  locationAvailable: boolean;
  contacts: ContactResult[];
}

export interface SOSFailure {
  success: false;
  error: string;
}

export type SOSResult = SOSSuccess | SOSFailure;

export interface RetrySuccess {
  success: true;
  eventId: string;
  contacts: ContactResult[];
}

export type RetryResult = RetrySuccess | SOSFailure;

// ── Helpers ───────────────────────────────────────────────────────────

function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── API calls ─────────────────────────────────────────────────────────

/**
 * Trigger a new SOS event.
 * A unique requestId is generated client-side for idempotency.
 */
export async function sendSOS(params: {
  isTest: boolean;
  location: SOSLocation | null;
  contacts?: string[];
  userName?: string;
}): Promise<SOSResult> {
  const requestId = generateRequestId();
  try {
    const response = await fetchWithTimeout(`${API_BASE}/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        isTest: params.isTest,
        location: params.location ?? null,
        contacts: params.contacts && params.contacts.length > 0 ? params.contacts : undefined,
        userName: params.userName || undefined,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error ?? `Server error (${response.status})` };
    }
    return data as SOSResult;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: 'Request timed out. Check your internet connection.' };
    }
    return { success: false, error: 'Unable to reach the SOS server. Check your internet connection.' };
  }
}

/**
 * Retry only failed contacts for an existing SOS event.
 */
export async function retrySOS(eventId: string): Promise<RetryResult> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/sos/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error ?? `Server error (${response.status})` };
    }
    return data as RetryResult;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: 'Retry timed out.' };
    }
    return { success: false, error: 'Unable to reach the SOS server.' };
  }
}
