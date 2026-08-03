# WetFuel Driver Mobile UI

A ready-to-run Ionic 8 + Angular 22 standalone UI prototype for the WetFuel Driver Mobile Application.

## Included screens

1. Splash
2. Login
3. OTP / account verification
4. Dashboard
5. Geofenced clock-in
6. Active shift
7. Vehicle selection
8. Pre-trip inspection
9. Assigned jobs
10. Job details
11. Route map
12. Site arrival
13. QR scanner
14. Equipment confirmation
15. LCR meter connection
16. Fuel delivery
17. Delivery proof
18. Delivery summary
19. Incident report
20. Offline sync center
21. Notifications
22. Delivery history
23. Hours and shifts
24. Driver profile

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:4200`.

## Add to an existing Ionic Angular project

Copy these folders/files into your project:

- `src/app/pages`
- `src/app/shared`
- `src/app/services`
- `src/app/data`
- `src/app/app.routes.ts`
- `src/global.scss`
- `src/theme/variables.scss`

Then merge `app.component.ts` and `main.ts` if your existing project already contains custom setup.

## Native integrations still to connect

This package intentionally provides UI and mocked behavior. Connect the following during implementation:

- Capacitor Geolocation for GPS/geofence validation
- Capacitor Camera for proof and incident photos
- Native barcode/QR scanner
- Google Maps SDK or Maps JavaScript API
- LCR-II / LCR-IQ Bluetooth or hardware integration
- IndexedDB/SQLite offline queue and conflict resolution
- WetFuel authentication and backend APIs

## White-label branding

All primary branding values are centralized in `src/theme/variables.scss`. Replace the `--wf-*` variables per tenant.
