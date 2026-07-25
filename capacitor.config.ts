import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wetfuel.driver',
  appName: 'WetFuel Driver',
  webDir: 'www/browser',
  server: {
    // Without this, Capacitor's WebView hands off any navigation to a domain outside its own
    // origin to the system browser - which is exactly what was sending the OIDC login flow
    // (a redirect to api.wetfuel.com's /connect/authorize page) out of the app.
    allowNavigation: ['api.wetfuel.com'],
  },
};

export default config;
