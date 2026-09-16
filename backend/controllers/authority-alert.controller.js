'use strict';

const contactService = require('../services/contact.service');
const smsService = require('../services/sms.service');
const messageService = require('../services/message.service');

// -----------------------------------------------------------------------
// POST /api/sos/authority-alert — FFGS pipeline notifying a district
// authority that one of its wards crossed HIGH/CRITICAL flood risk.
//
// Called by ml-pipeline/src/alerts/authority_sos.py, never by the frontend.
// Guarded by middleware/internal-auth.js (shared-secret header), not by a
// user session.
// -----------------------------------------------------------------------
async function handleAuthorityAlert(req, res) {
  try {
    const { wardName, district, riskLevel, floodProbability, validFor } = req.body;

    const contacts = contactService.getAuthorityContacts(district);
    if (contacts.length === 0) {
      // Not an error: the alert is already durably recorded in the FFGS
      // `alerts` table by authority_sos.py before this call is made. No
      // AUTHORITY_CONTACT_<DISTRICT> configured yet just means there is
      // nowhere to SMS it to.
      return res.json({
        success: true,
        smsSent: false,
        reason: `No authority contacts configured for district "${district}".`,
      });
    }

    const message = messageService.generateAuthorityAlertMessage({
      wardName,
      district,
      riskLevel,
      floodProbability,
      validFor,
    });

    const results = await Promise.all(
      contacts.map(async (phone) => {
        try {
          const result = await smsService.sendSMS(phone, message);
          return { success: !!(result && result.success), error: result?.error || null };
        } catch (err) {
          return { success: false, error: err.message };
        }
      })
    );

    const sentCount = results.filter((r) => r.success).length;
    return res.json({
      success: true,
      smsSent: sentCount > 0,
      sentCount,
      totalContacts: contacts.length,
    });
  } catch (err) {
    console.error('[Authority Alert Controller] Unexpected error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred.',
    });
  }
}

module.exports = { handleAuthorityAlert };
