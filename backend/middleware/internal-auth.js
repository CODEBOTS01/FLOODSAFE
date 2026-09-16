'use strict';

/**
 * Guards server-to-server endpoints (currently just the authority-alert
 * trigger from src/alerts/authority_sos.py) with a shared secret, so a
 * random internet client can't fabricate a flood-risk claim and cause a
 * real SMS to a real district authority.
 *
 * Requires INTERNAL_API_KEY to be set. If it's not set, the endpoint is
 * disabled entirely (fails closed) rather than silently accepting
 * unauthenticated requests.
 */
function requireInternalApiKey(req, res, next) {
  const configuredKey = process.env.INTERNAL_API_KEY;
  if (!configuredKey) {
    return res.status(503).json({
      success: false,
      error: 'This endpoint is not configured (INTERNAL_API_KEY missing on the server).',
    });
  }

  const providedKey = req.get('X-Internal-Api-Key');
  if (!providedKey || providedKey !== configuredKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  next();
}

module.exports = { requireInternalApiKey };
