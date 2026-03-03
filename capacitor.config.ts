import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vintech.softcopyhero',
  appName: 'VinTech AI Doc',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {}
};

export default config;
