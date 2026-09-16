'use strict';

/**
 * Validate the body of POST /api/sos.
 */
function validateSOSRequest(req, res, next) {
  const { requestId, isTest, location } = req.body;

  // requestId — required string, 8–64 chars
  if (
    !requestId ||
    typeof requestId !== 'string' ||
    requestId.length < 8 ||
    requestId.length > 64
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request. Missing or invalid request identifier.',
    });
  }

  // isTest — required boolean
  if (typeof isTest !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'Invalid request format.',
    });
  }

  // location — optional, but must be valid if present
  if (location != null) {
    if (typeof location !== 'object' || Array.isArray(location)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid location format.',
      });
    }

    const { lat, lng } = location;
    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      !isFinite(lat) ||
      !isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid location coordinates.',
      });
    }
  }

  // contacts — optional, but must be valid array of E.164 strings if present
  const { contacts, userName } = req.body;
  if (contacts != null) {
    if (!Array.isArray(contacts) || contacts.length === 0 || contacts.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contacts list. Must contain 1 to 10 contacts.',
      });
    }

    const e164Regex = /^\+[1-9]\d{1,14}$/;
    for (const phone of contacts) {
      if (typeof phone !== 'string' || !e164Regex.test(phone.trim())) {
        return res.status(400).json({
          success: false,
          error: 'One or more emergency contacts have an invalid phone format.',
        });
      }
    }
  }

  // userName — optional string up to 100 chars
  if (userName != null && (typeof userName !== 'string' || userName.length > 100)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid user name.',
    });
  }

  next();
}

/**
 * Validate the body of POST /api/sos/retry.
 */
function validateRetryRequest(req, res, next) {
  const { eventId } = req.body;

  if (
    !eventId ||
    typeof eventId !== 'string' ||
    !/^SOS-\d{8}-[A-F0-9]{6}$/.test(eventId)
  ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid event identifier.',
    });
  }

  next();
}

/**
 * Validate the body of POST /api/sos/authority-alert.
 */
function validateAuthorityAlertRequest(req, res, next) {
  const { wardName, district, riskLevel, floodProbability, validFor } = req.body;

  if (!wardName || typeof wardName !== 'string' || wardName.length > 200) {
    return res.status(400).json({ success: false, error: 'Invalid or missing wardName.' });
  }

  if (district != null && (typeof district !== 'string' || district.length > 200)) {
    return res.status(400).json({ success: false, error: 'Invalid district.' });
  }

  if (!['HIGH', 'CRITICAL'].includes(riskLevel)) {
    return res.status(400).json({ success: false, error: 'riskLevel must be HIGH or CRITICAL.' });
  }

  if (
    typeof floodProbability !== 'number' ||
    !isFinite(floodProbability) ||
    floodProbability < 0 ||
    floodProbability > 1
  ) {
    return res.status(400).json({ success: false, error: 'floodProbability must be a number between 0 and 1.' });
  }

  if (!validFor || Number.isNaN(new Date(validFor).getTime())) {
    return res.status(400).json({ success: false, error: 'Invalid or missing validFor timestamp.' });
  }

  next();
}

module.exports = { validateSOSRequest, validateRetryRequest, validateAuthorityAlertRequest };
