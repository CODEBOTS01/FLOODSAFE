'use strict';

const twilio = require('twilio');

let client = null;

/**
 * Lazily initialize and return the Twilio client.
 * Credentials are read from environment variables — never logged.
 */
function getClient() {
  if (!client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }

    client = twilio(accountSid, authToken);
  }
  return client;
}

/**
 * Send a single SMS via Twilio.
 * @param {string} to  — Recipient phone number in E.164 format
 * @param {string} message — SMS body text
 * @returns {Promise<{success: boolean, sid?: string, status?: string, error?: string}>}
 */
async function sendSMS(to, message) {
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!fromNumber) {
    return { success: false, error: 'Twilio phone number not configured' };
  }

  try {
    const twilioClient = getClient();
    const result = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    });

    // Twilio returns statuses like 'queued', 'sent', 'accepted'.
    // We never claim 'delivered' without a delivery-status webhook.
    return {
      success: true,
      sid: result.sid,
      status: result.status,
    };
  } catch (err) {
    // Log enough to debug, but never log credentials or full phone numbers
    console.error(`[Twilio] SMS failed to ${to.slice(0, 4)}****: ${err.message}`);
    return {
      success: false,
      error: err.message || 'SMS send failed',
    };
  }
}

module.exports = { sendSMS };
