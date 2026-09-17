'use strict';

const https = require('https');

/**
 * Send an SMS via TextBee API gateway (sends through connected Android device).
 * @param {string} to - Recipient phone number in E.164 format (e.g., +919305454311)
 * @param {string} message - SMS body text
 * @returns {Promise<{success: boolean, sid?: string, status?: string, error?: string}>}
 */
/**
 * Internal single attempt helper to send SMS via TextBee API gateway.
 */
function sendSingleAttempt(to, dataString, apiKey) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.textbee.dev',
      port: 443,
      path: '/api/v1/gateway/send-sms',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString),
        'x-api-key': apiKey,
      },
      timeout: 10000, // 10s request timeout
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch (_e) {
          parsed = { raw: body };
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[TextBee] SMS queued/sent to ${to.slice(0, 4)}**** via Android gateway`);
          resolve({
            success: true,
            sid: parsed?.data?.id || parsed?.data?._id || 'txb-' + Date.now(),
            status: 'sent',
          });
        } else {
          const errMsg = parsed?.message || parsed?.error || `HTTP ${res.statusCode}`;
          console.error(`[TextBee] SMS failed to ${to.slice(0, 4)}****: ${errMsg}`);
          resolve({
            success: false,
            isTimeout: false,
            error: errMsg,
          });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      console.warn(`[TextBee] Request timed out for ${to.slice(0, 4)}****`);
      resolve({ success: false, isTimeout: true, error: 'TextBee request timed out' });
    });

    req.on('error', (err) => {
      const isTimeout = err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET';
      console.error(`[TextBee] Network error for ${to.slice(0, 4)}****: ${err.message}`);
      resolve({ success: false, isTimeout, error: err.message || 'TextBee connection error' });
    });

    req.write(dataString);
    req.end();
  });
}

/**
 * Send an SMS via TextBee API gateway (sends through connected Android device).
 * If a timeout occurs, it will automatically retry every 5 seconds (up to maxRetries).
 *
 * @param {string} to - Recipient phone number in E.164 format (e.g., +919305454311)
 * @param {string} message - SMS body text
 * @param {number} maxRetries - Maximum retry attempts on timeout (default 3)
 * @returns {Promise<{success: boolean, sid?: string, status?: string, error?: string}>}
 */
async function sendSMS(to, message, maxRetries = 3) {
  const apiKey = process.env.TEXTBEE_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'TextBee API key not configured' };
  }

  const payload = {
    recipients: [to],
    message: message,
  };

  const deviceId = process.env.TEXTBEE_DEVICE_ID;
  if (deviceId) {
    payload.deviceId = deviceId;
  }

  const dataString = JSON.stringify(payload);

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const result = await sendSingleAttempt(to, dataString, apiKey);

    if (result.success) {
      return result;
    }

    // If it was a timeout and we still have retry attempts remaining
    if (result.isTimeout && attempt <= maxRetries) {
      console.log(`[TextBee] Timeout occurred for ${to.slice(0, 4)}****. Retrying in 5 seconds (attempt ${attempt} of ${maxRetries})...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      continue;
    }

    // If non-timeout error or exceeded retries
    return result;
  }

  return { success: false, error: 'TextBee request timed out after retries' };
}

module.exports = { sendSMS };
