import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wetfuel.driver',
  appName: 'WetFuel Driver',
  webDir: 'www/browser',
  bundledWebRuntime: false,
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      androidIsEncryption: false,
      iosIsEncryption: false
    }
  }
};

export default config;
