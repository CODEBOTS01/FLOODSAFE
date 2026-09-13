'use strict';

const eventService = require('../services/event.service');
const contactService = require('../services/contact.service');
const smsService = require('../services/sms.service');
const messageService = require('../services/message.service');

// -----------------------------------------------------------------------
// POST /api/sos  — Trigger a new SOS event
// -----------------------------------------------------------------------
async function handleSOS(req, res) {
  try {
    const { requestId, isTest, location } = req.body;

    // ── 1. Idempotency check ──────────────────────────────────────────
    const existing = eventService.findByRequestId(requestId);
    if (existing) {
      return res.json({
        success: true,
        duplicate: true,
        eventId: existing.eventId,
        timestamp: existing.timestamp,
        locationAvailable: existing.locationAvailable,
        contacts: existing.contacts.map(sanitizeContact),
      });
    }

    // ── 2. Determine recipients ───────────────────────────────────────
    let contacts;

    if (isTest) {
      // ENFORCED: test mode ONLY sends to TEST_RECIPIENT_PHONE
      if (!contactService.isTestModeEnabled()) {
        return res.status(403).json({
          success: false,
          error: 'Test mode is disabled.',
        });
      }

      const testPhone = contactService.getTestRecipient();
      if (!testPhone) {
        return res.status(500).json({
          success: false,
          error: 'Test recipient not configured on server.',
        });
      }
      contacts = [testPhone];
    } else {
      if (Array.isArray(req.body.contacts) && req.body.contacts.length > 0) {
        contacts = req.body.contacts.map((c) => c.trim());
      } else {
        contacts = contactService.getEmergencyContacts();
      }

      if (contacts.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No emergency contacts provided or configured.',
        });
      }
    }

    // ── 3. User name ─────────────────────────────────────────────
    const userName = req.body.userName || process.env.USER_NAME || 'User';

    // ── 4. Create event ───────────────────────────────────────────────
    const event = eventService.createEvent({
      requestId,
      userName,
      isTest,
      location: location || null,
      contacts,
    });

    // ── 5. Generate SMS body ──────────────────────────────────────────
    const message = messageService.generateSOSMessage({
      userName,
      location: location || null,
      timestamp: event.timestamp,
      isTest,
    });

    // ── 6. Send SMS to each contact independently ─────────────────────
    await sendToContacts(event.eventId, contacts, message);

    // ── 7. Return per-contact results ─────────────────────────────────
    const updated = eventService.getEvent(event.eventId);
    return res.json({
      success: true,
      duplicate: false,
      eventId: updated.eventId,
      timestamp: updated.timestamp,
      locationAvailable: updated.locationAvailable,
      contacts: updated.contacts.map(sanitizeContact),
    });
  } catch (err) {
    console.error('[SOS Controller] Unexpected error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    });
  }
}

// -----------------------------------------------------------------------
// POST /api/sos/retry  — Retry only failed contacts for an existing event
// -----------------------------------------------------------------------
async function handleRetry(req, res) {
  try {
    const { eventId } = req.body;

    // ── 1. Find the event ─────────────────────────────────────────────
    const event = eventService.getEvent(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'SOS event not found or has expired.',
      });
    }

    // ── 2. Get only the failed contacts ───────────────────────────────
    const failedContacts = eventService.getFailedContacts(eventId);
    if (failedContacts.length === 0) {
      return res.json({
        success: true,
        eventId,
        message: 'No failed contacts to retry.',
        contacts: event.contacts.map(sanitizeContact),
      });
    }

    // ── 3. Rebuild message ────────────────────────────────────────────
    // Use stored event location for the retry so the SMS matches.
    const userName = process.env.USER_NAME || 'User';
    const message = messageService.generateSOSMessage({
      userName,
      location: event.location,
      timestamp: event.timestamp,
      isTest: event.isTest,
    });

    // ── 4. Retry only the failed ones ─────────────────────────────────
    const phones = failedContacts.map((c) => c.phone);
    await sendToContacts(eventId, phones, message);

    // ── 5. Return full updated contact list ───────────────────────────
    const updated = eventService.getEvent(eventId);
    return res.json({
      success: true,
      eventId,
      contacts: updated.contacts.map(sanitizeContact),
    });
  } catch (err) {
    console.error('[SOS Controller] Retry error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during retry.',
    });
  }
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/**
 * Send the SMS message to each phone number and update event status.
 * Each contact is handled independently — one failure doesn't stop others.
 */
async function sendToContacts(eventId, phones, message) {
  await Promise.all(
    phones.map(async (phone) => {
      try {
        const result = await smsService.sendSMS(phone, message);

        if (result && result.success) {
          eventService.updateContactStatus(eventId, phone, {
            status: 'sent',
            sid: result.sid,
            twilioStatus: result.status, // e.g. 'queued', 'accepted'
            failureReason: null,
          });
        } else {
          eventService.updateContactStatus(eventId, phone, {
            status: 'failed',
            sid: null,
            twilioStatus: null,
            failureReason: result?.error || 'SMS dispatch failed',
          });
        }
      } catch (err) {
        eventService.updateContactStatus(eventId, phone, {
          status: 'failed',
          sid: null,
          twilioStatus: null,
          failureReason: err.message || 'Unexpected dispatch error',
        });
      }
    })
  );
}

/**
 * Strip internal fields before returning contact info to the client.
 * Phone numbers are never sent back to the frontend.
 */
function sanitizeContact(c) {
  return {
    status: c.status,
    twilioStatus: c.twilioStatus,
    failureReason: c.failureReason,
  };
}

module.exports = { handleSOS, handleRetry };
