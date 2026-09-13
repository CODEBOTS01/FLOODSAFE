import { useState, useCallback, useRef } from "react";
import { sendSOS, retrySOS, type SOSResult, type ContactResult } from "../services/sosApiService";
import { getCurrentLocation } from "../services/locationService";

// Show test mode button only when explicitly enabled via env variable
const SHOW_TEST_MODE = import.meta.env.VITE_SHOW_TEST_SOS === "true";

// ── Phase machine ─────────────────────────────────────────────────────
type Phase =
  | "confirm"   // Warning + Confirm & Send SOS button
  | "sending"   // Fetching location + calling backend
  | "result";   // Success / partial failure / full failure result

interface Props {
  contacts: string[];
  userName?: string;
  onClose: () => void;
}

// ── Helper: render per-contact rows ───────────────────────────────────
function ContactRows({ contacts }: { contacts: ContactResult[] }) {
  return (
    <div className="sos-contact-list">
      {contacts.map((c, i) => {
        let label: string;
        if (c.status === "sent") {
          label = `Contact ${i + 1}: SMS sent ✓`;
        } else if (c.status === "failed") {
          label = `Contact ${i + 1}: SMS failed ✕${c.failureReason ? ` — ${c.failureReason}` : ""}`;
        } else {
          label = `Contact ${i + 1}: Pending…`;
        }
        return (
          <div key={i} className={`sos-contact-row status-${c.status}`}>
            {label}
          </div>
        );
      })}
    </div>
  );
}

// ── Main modal component ───────────────────────────────────────────────
export default function SOSModal({ contacts, userName, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [result, setResult] = useState<SOSResult | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Prevent accidental double-sends while a request is in flight
  const sendingRef = useRef(false);

  // Pre-fetch location immediately when modal opens so it is ready upon confirmation
  const locationPromiseRef = useRef<Promise<{ lat: number; lng: number } | null> | null>(null);

  // Kick off location acquisition as soon as the modal is opened
  if (locationPromiseRef.current === null) {
    locationPromiseRef.current = getCurrentLocation()
      .then((loc) => {
        if (loc) {
          return { lat: loc.lat, lng: loc.lng };
        }
        return null;
      })
      .catch(() => null);
  }

  // ── Core send logic ─────────────────────────────────────────────────
  const triggerSOS = useCallback(async (isTest: boolean) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setPhase("sending");

    // 1. Resolve pre-fetched location with a 4s cap to avoid delaying emergency SMS
    let location: { lat: number; lng: number } | null = null;
    try {
      if (locationPromiseRef.current) {
        const timeoutPromise = new Promise<{ lat: number; lng: number } | null>((resolve) =>
          setTimeout(() => resolve(null), 4000)
        );
        location = await Promise.race([locationPromiseRef.current, timeoutPromise]);
      }
    } catch {
      location = null;
    }

    // 2. Send to backend immediately
    const res = await sendSOS({ isTest, location, contacts, userName });

    sendingRef.current = false;
    setResult(res);
    setPhase("result");
  }, [contacts, userName]);

  // ── Retry failed contacts ────────────────────────────────────────────
  const handleRetry = useCallback(async () => {
    if (!result || !result.success) return;
    setRetrying(true);
    const retryRes = await retrySOS(result.eventId);
    setRetrying(false);
    if (retryRes.success) {
      // Merge updated contacts into the existing result
      setResult((prev) =>
        prev && prev.success
          ? { ...prev, contacts: retryRes.contacts }
          : prev
      );
    }
  }, [result]);

  // ── Derived state ────────────────────────────────────────────────────
  const hasFailedContacts =
    result?.success &&
    result.contacts.some((c) => c.status === "failed");

  const allSent =
    result?.success &&
    result.contacts.every((c) => c.status === "sent");

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="sos-backdrop sos-scope" role="dialog" aria-modal="true" aria-label="SOS Emergency Alert">
      <div className="sos-modal">

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div className="sos-modal-header">
          <span className="sos-modal-header-icon" aria-hidden="true">🚨</span>
          <h2>
            {phase === "confirm" && "SOS Emergency Alert"}
            {phase === "sending" && "Sending SOS…"}
            {phase === "result" && (result?.success ? "SOS Alert Sent" : "SOS Failed")}
          </h2>
        </div>

        {/* ── CONFIRM PHASE ──────────────────────────────────────── */}
        {phase === "confirm" && (
          <>
            <div className="sos-modal-body">
              <div className="sos-warning-banner">
                <span className="sos-warning-banner-icon" aria-hidden="true">⚠️</span>
                <span>
                  Only use this in a <strong>genuine emergency</strong>. Misuse will alert your
                  emergency contacts unnecessarily.
                </span>
              </div>

              <div className="sos-what-happens">
                <strong>What will happen if you confirm:</strong>
                <ul>
                  <li>
                    An emergency SMS will be sent to <strong>{contacts.length} contact{contacts.length > 1 ? "s" : ""}</strong> (Primary: {contacts[0]}).
                  </li>
                  <li>Your current GPS location may be included in the message.</li>
                  <li>The message will identify you by name ({userName || "User"}) and timestamp.</li>
                </ul>
              </div>

              <p className="sos-notice">
                ⓘ This does <strong>not</strong> automatically contact emergency services (e.g., 112 / 100).
                If you are in immediate danger, call your local emergency number directly.
              </p>

              {/* Test mode button — only visible when VITE_SHOW_TEST_SOS=true */}
              {SHOW_TEST_MODE && (
                <button
                  className="sos-test-btn"
                  onClick={() => triggerSOS(true)}
                >
                  ⚠ Send TEST SOS (dev mode — SMS to test recipient only)
                </button>
              )}
            </div>

            <div className="sos-modal-footer">
              <button className="sos-btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button
                className="sos-btn-confirm"
                onClick={() => triggerSOS(false)}
              >
                Confirm &amp; Send SOS
              </button>
            </div>
          </>
        )}

        {/* ── SENDING PHASE ──────────────────────────────────────── */}
        {phase === "sending" && (
          <div className="sos-sending-state">
            <div className="sos-spinner" aria-label="Sending…" role="status" />
            <p>Getting your location and sending emergency alerts…</p>
          </div>
        )}

        {/* ── RESULT PHASE ───────────────────────────────────────── */}
        {phase === "result" && result && (
          <>
            <div className="sos-result">
              <div className="sos-result-header">
                <span className="sos-result-header-icon" aria-hidden="true">
                  {result.success ? (allSent ? "✅" : "⚠️") : "❌"}
                </span>
                <span>
                  {result.success
                    ? result.duplicate
                      ? "Already sent (duplicate request)"
                      : allSent
                      ? "All contacts notified"
                      : "Partially sent — some contacts failed"
                    : "Failed to send SOS"}
                </span>
              </div>

              {result.success && (
                <p className="sos-result-meta">
                  {`Event: ${result.eventId}\nLocation: ${result.locationAvailable ? "Shared ✓" : "Unavailable ✕"}`}
                </p>
              )}

              {!result.success && (
                <p className="sos-result-meta" style={{ color: "#fca5a5" }}>
                  {result.error}
                </p>
              )}

              {result.success && result.contacts.length > 0 && (
                <ContactRows contacts={result.contacts} />
              )}
            </div>

            <div className="sos-modal-footer">
              {hasFailedContacts && (
                <button
                  className="sos-btn-retry"
                  onClick={handleRetry}
                  disabled={retrying}
                >
                  {retrying ? "Retrying…" : "Retry Failed"}
                </button>
              )}
              <button className="sos-btn-dismiss" onClick={onClose}>
                Dismiss
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
