import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourmoney.app',
  appName: 'YourMoney',
  webDir: 'dist/yourmoney-app/browser',
  backgroundColor: '#0c1020',
  android: {
    backgroundColor: '#0c1020',
  },
};

export default config;
