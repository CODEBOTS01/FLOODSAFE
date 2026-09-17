'use strict';

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// In-memory event store.  For production, replace with a database.
// ---------------------------------------------------------------------------
const events = new Map();           // eventId → event object
const requestIdMap = new Map();     // requestId → eventId  (idempotency)

const EVENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Periodic cleanup — remove expired events every hour
const _cleanup = setInterval(() => {
  const now = Date.now();
  for (const [eventId, event] of events) {
    if (now - new Date(event.timestamp).getTime() > EVENT_TTL_MS) {
      events.delete(eventId);
      // Remove matching requestId mapping
      for (const [reqId, evtId] of requestIdMap) {
        if (evtId === eventId) requestIdMap.delete(reqId);
      }
    }
  }
}, 60 * 60 * 1000);

// Allow the Node process to exit even if the interval is running
if (_cleanup.unref) _cleanup.unref();

/**
 * Generate a unique, human-readable event ID.
 * Format: SOS-YYYYMMDD-XXXXXX  (6 hex chars = 16 million combinations per day)
 * @returns {string}
 */
function generateEventId() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SOS-${dateStr}-${rand}`;
}

/**
 * Look up an existing event by client-side request ID (idempotency check).
 * @param {string} requestId
 * @returns {object|null}
 */
function findByRequestId(requestId) {
  const eventId = requestIdMap.get(requestId);
  return eventId ? events.get(eventId) || null : null;
}

/**
 * Create and store a new SOS event.
 * @param {object} p
 * @param {string}   p.requestId
 * @param {string}   p.userName
 * @param {boolean}  p.isTest
 * @param {object|null} p.location  — { lat, lng } or null
 * @param {string[]} p.contacts    — phone numbers being messaged
 * @returns {object} The created event
 */
function createEvent({ requestId, userName, isTest, location, contacts }) {
  const eventId = generateEventId();

  const event = {
    eventId,
    requestId,
    userName,
    isTest,
    timestamp: new Date().toISOString(),
    locationAvailable: !!location,
    // Store minimal location data; it is purged with the event after 24 h
    location: location ? { lat: location.lat, lng: location.lng } : null,
    contacts: contacts.map((phone) => ({
      phone,
      status: 'pending',    // pending | sent | failed
      sid: null,
      twilioStatus: null,
      failureReason: null,
    })),
  };

  events.set(eventId, event);
  requestIdMap.set(requestId, eventId);

  return event;
}

/**
 * Retrieve an event by its event ID.
 * @param {string} eventId
 * @returns {object|null}
 */
function getEvent(eventId) {
  return events.get(eventId) || null;
}

/**
 * Update the SMS-send result for one contact within an event.
 * @param {string} eventId
 * @param {string} phone
 * @param {object} update — { status, sid?, twilioStatus?, failureReason? }
 */
function updateContactStatus(eventId, phone, update) {
  const event = events.get(eventId);
  if (!event) return;

  const contact = event.contacts.find((c) => c.phone === phone);
  if (contact) Object.assign(contact, update);
}

/**
 * Return only the contacts that have status === 'failed' for a given event.
 * @param {string} eventId
 * @returns {object[]}
 */
function getFailedContacts(eventId) {
  const event = events.get(eventId);
  if (!event) return [];
  return event.contacts.filter((c) => c.status === 'failed');
}

module.exports = {
  generateEventId,
  findByRequestId,
  createEvent,
  getEvent,
  updateContactStatus,
  getFailedContacts,
};
