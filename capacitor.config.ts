import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vintech.softcopyhero',
  appName: 'SoftCopy Hero',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    buildOptions: {
      versionName: '1.0.0',
      versionCode: 1
    }
  }
};

export default config;
