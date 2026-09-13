'use strict';

const textbeeService = require('./textbee.service');
const twilioService = require('./twilio.service');

/**
 * Dispatch SMS through the active provider (TextBee or Twilio).
 * If TEXTBEE_API_KEY is configured, TextBee will be used.
 * Otherwise, falls back to Twilio.
 *
 * @param {string} to - Recipient phone in E.164 format
 * @param {string} message - Text content
 * @returns {Promise<{success: boolean, sid?: string, status?: string, error?: string}>}
 */
async function sendSMS(to, message) {
  if (process.env.TEXTBEE_API_KEY) {
    return await textbeeService.sendSMS(to, message);
  }

  return await twilioService.sendSMS(to, message);
}

module.exports = { sendSMS };
