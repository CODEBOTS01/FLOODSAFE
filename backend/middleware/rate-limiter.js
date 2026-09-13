'use strict';

const rateLimit = require('express-rate-limit');

/**
 * SOS endpoint — max 5 requests per 15 minutes per IP.
 * Tight limit to prevent abuse while still allowing genuine emergencies.
 */
const sosLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many SOS requests. Please wait before trying again.',
  },
});

/**
 * Retry endpoint — max 10 requests per 15 minutes per IP.
 * Slightly more lenient since retries target only failed contacts.
 */
const retryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many retry requests. Please wait before trying again.',
  },
});

module.exports = { sosLimiter, retryLimiter };
