// ─── User & Contact Types ──────────────────────────────────────────────────

export interface UserData {
  name: string;
  mobile: string;       // 10-digit Indian mobile
  relativeMobile: string; // 10-digit Indian mobile — mandatory Contact 1
  place: string;
  email: string;
  latitude?: number;
  longitude?: number;
}

export interface EmergencyContact {
  id: string;           // stable uuid for React key
  label: string;        // e.g. "Close Relative (Mandatory)", "Contact 2"
  phone: string;        // E.164 format: +91XXXXXXXXXX
  mandatory: boolean;   // Contact 1 is mandatory — cannot be removed
}

/**
 * Convert a 10-digit Indian mobile number to E.164 (+91XXXXXXXXXX).
 */
export function toE164(tenDigit: string): string {
  return `+91${tenDigit.replace(/\D/g, "")}`;
}

/**
 * Validate an E.164 phone number.
 */
export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone);
}
