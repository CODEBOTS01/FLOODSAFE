'use strict';

/**
 * Generate the SOS SMS message body.
 *
 * @param {object} p
 * @param {string}       p.userName
 * @param {object|null}  p.location   — { lat, lng } or null
 * @param {string}       p.timestamp  — ISO 8601 string
 * @param {boolean}      p.isTest
 * @returns {string}
 */
function generateSOSMessage({ userName, location, timestamp, isTest }) {
  const prefix = isTest ? '⚠️ [TEST] ' : '';

  let locationText;
  if (location && location.lat != null && location.lng != null) {
    const mapsLink = `https://maps.google.com/?q=${location.lat},${location.lng}`;
    locationText = `My current location:\n${mapsLink}`;
  } else {
    locationText = 'Location unavailable.';
  }

  const time = new Date(timestamp).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  return [
    `${prefix}🚨 EMERGENCY SOS ALERT`,
    '',
    `Help! I need assistance.`,
    '',
    locationText,
    '',
    `Sender: ${userName}`,
    `Time: ${time}`,
  ].join('\n');
}

module.exports = { generateSOSMessage };
