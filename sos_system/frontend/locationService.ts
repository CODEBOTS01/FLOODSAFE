// ─── Location Service ──────────────────────────────────────────────────────

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy: number; // metres
}

/**
 * Request the user's current GPS position.
 * Resolves with coordinates or null if unavailable / denied.
 */
export function getCurrentLocation(
  timeoutMs = 8000
): Promise<GeoLocation | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 30_000,
      }
    );
  });
}
