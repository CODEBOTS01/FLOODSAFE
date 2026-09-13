'use strict';

const express = require('express');
const router = express.Router();

const { handleSOS, handleRetry } = require('../controllers/sos.controller');
const { sosLimiter, retryLimiter } = require('../middleware/rate-limiter');
const {
  validateSOSRequest,
  validateRetryRequest,
} = require('../middleware/validator');

// POST /api/sos       — trigger a new SOS event
router.post('/sos', sosLimiter, validateSOSRequest, handleSOS);

// POST /api/sos/retry — retry failed contacts for an existing event
router.post('/sos/retry', retryLimiter, validateRetryRequest, handleRetry);

module.exports = router;
