import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.safestep.app',
  appName: 'SafeStep',
  webDir: 'dist',
  server: {
    hostname: 'localhost',
    androidScheme: 'http'
  },
  android: {
    path: '.'
  }
};

export default config;
