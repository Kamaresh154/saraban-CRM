import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saraban.crm',
  appName: 'Saraban CRM',
  webDir: 'dist',
  server: {
    url: 'https://saraban-crm.onrender.com',
    cleartext: true,
  },
};

export default config;
