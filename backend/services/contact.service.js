'use strict';

/**
 * Validate a phone number in E.164 format.
 * E.164: + followed by 1–15 digits, first digit non-zero.
 * @param {string} number
 * @returns {boolean}
 */
function isValidE164(number) {
  if (typeof number !== 'string') return false;
  return /^\+[1-9]\d{1,14}$/.test(number);
}

/**
 * Load emergency contacts from environment variables.
 * Reads EMERGENCY_CONTACT_1, EMERGENCY_CONTACT_2, … up to the first gap.
 * Invalid numbers are skipped with a warning.
 * @returns {string[]} Array of valid E.164 phone numbers
 */
function getEmergencyContacts() {
  const contacts = [];

  for (let i = 1; i <= 50; i++) {
    const value = process.env[`EMERGENCY_CONTACT_${i}`];
    if (!value) break;

    const trimmed = value.trim();
    if (isValidE164(trimmed)) {
      contacts.push(trimmed);
    } else {
      console.warn(
        `[Contacts] EMERGENCY_CONTACT_${i} is not valid E.164, skipping: ${trimmed.slice(0, 4)}****`
      );
    }
  }

  return contacts;
}

/**
 * Get the test-mode recipient phone number.
 * @returns {string|null}
 */
function getTestRecipient() {
  const phone = process.env.TEST_RECIPIENT_PHONE;
  if (!phone) return null;
  const trimmed = phone.trim();
  return isValidE164(trimmed) ? trimmed : null;
}

/**
 * Check whether test mode is enabled.
 * @returns {boolean}
 */
function isTestModeEnabled() {
  return process.env.ENABLE_TEST_MODE === 'true';
}

module.exports = {
  isValidE164,
  getEmergencyContacts,
  getTestRecipient,
  isTestModeEnabled,
};
