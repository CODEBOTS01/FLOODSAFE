# FLOODSAFE Emergency SOS System

Autonomous emergency alert dispatch system integrating TextBee SMS gateway with frontend GPS and contact management.

## Architecture

- **Backend (`sos_system/`)**:
  - Express.js server running on port 3001.
  - Endpoints:
    - `POST /api/sos`: Dispatches emergency SMS alerts with GPS location.
    - `POST /api/sos/retry`: Retries failed numbers for an existing event.
    - `GET /api/alerts/sachet`: Proxies NDMA SACHET public API to avoid CORS issues.
    - `GET /api/shelters`: Queries OpenStreetMap Overpass with 3 mirror fallbacks.
  - Resilience: Automatic timeout retry every 5 seconds (up to 3 attempts) for TextBee cellular gateway.

- **Frontend (`src/sos_system/`)**:
  - `SOSButton.tsx`: Floating action button with pulsing radar emergency indicator.
  - `SOSModal.tsx`: 3-phase emergency confirmation, sending, and delivery status screen.
  - `EmergencyContacts.tsx`: Emergency contact management modal (up to 5 contacts).
  - `sosApiService.ts`: Typed API client for dispatching alerts.
  - `locationService.ts`: Non-blocking GPS resolver with 4-second race condition.

## Setup & Running

1. Configure environment variables in `.env` (refer to `.env.example`):
   ```env
   PORT=3001
   TEXTBEE_API_KEY=your_textbee_api_key
   TEXTBEE_DEVICE_ID=your_device_id
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
