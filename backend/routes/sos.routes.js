'use strict';

const express = require('express');
const router = express.Router();

const { handleSOS, handleRetry } = require('../controllers/sos.controller');
const { handleAuthorityAlert } = require('../controllers/authority-alert.controller');
const { sosLimiter, retryLimiter, authorityAlertLimiter } = require('../middleware/rate-limiter');
const {
  validateSOSRequest,
  validateRetryRequest,
  validateAuthorityAlertRequest,
} = require('../middleware/validator');
const { requireInternalApiKey } = require('../middleware/internal-auth');

const https = require('https');
const http = require('http');

// Simple in-memory cache for NDMA alerts (cache for 2 minutes)
let sachetCache = { data: null, timestamp: 0 };

// GET /api/alerts/sachet — Proxy NDMA SACHET to eliminate CORS errors in browser
router.get('/alerts/sachet', async (_req, res) => {
  const now = Date.now();
  if (sachetCache.data && now - sachetCache.timestamp < 2 * 60 * 1000) {
    return res.json(sachetCache.data);
  }

  try {
    const data = await new Promise((resolve, reject) => {
      const req = https.get(
        'https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails',
        { timeout: 7000 },
        (response) => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            return resolve([]);
          }
          let body = '';
          response.on('data', (chunk) => (body += chunk));
          response.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch {
              resolve([]);
            }
          });
        }
      );
      req.on('timeout', () => {
        req.destroy();
        resolve([]);
      });
      req.on('error', () => resolve([]));
    });

    sachetCache = { data, timestamp: now };
    return res.json(data);
  } catch {
    return res.json([]);
  }
});

// GET /api/shelters — Query Overpass API with fallbacks and short timeout
router.get('/shelters', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.json({ elements: [] });
  }

  const query = `[out:json][timeout:10];(nwr["amenity"="social_facility"]["social_facility"="shelter"](around:20000,${lat},${lon});nwr["emergency:social_facility"="shelter"](around:20000,${lat},${lon});nwr["evacuation_center"="yes"](around:20000,${lat},${lon}););out center;`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ];

  for (const endpoint of endpoints) {
    try {
      const url = `${endpoint}?data=${encodeURIComponent(query)}`;
      const result = await new Promise((resolve) => {
        const req = https.get(url, { timeout: 8000 }, (response) => {
          if (response.statusCode !== 200) return resolve(null);
          let body = '';
          response.on('data', (chunk) => (body += chunk));
          response.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch {
              resolve(null);
            }
          });
        });
        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
        req.on('error', () => resolve(null));
      });

      if (result && Array.isArray(result.elements)) {
        return res.json(result);
      }
    } catch {
      // Try next endpoint
    }
  }

  return res.json({ elements: [] });
});

// POST /api/sos       — trigger a new SOS event
router.post('/sos', sosLimiter, validateSOSRequest, handleSOS);

// POST /api/sos/retry — retry failed contacts for an existing event
router.post('/sos/retry', retryLimiter, validateRetryRequest, handleRetry);

// POST /api/sos/authority-alert — FFGS pipeline -> district authority SMS.
// Server-to-server only (see middleware/internal-auth.js), not a user action.
router.post(
  '/sos/authority-alert',
  authorityAlertLimiter,
  requireInternalApiKey,
  validateAuthorityAlertRequest,
  handleAuthorityAlert
);

module.exports = router;
