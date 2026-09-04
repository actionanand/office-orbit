import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.actionanand.officeorbit.app',
  appName: 'Office Orbit',
  webDir: 'www',
  server: { androidScheme: 'https' },
  android: { backgroundColor: '#f3f7f4' },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#f3f7f4',
      showSpinner: false,
      androidScaleType: 'CENTER_INSIDE',
      splashFullScreen: true,
      splashImmersive: false,
    },
  },
};
export default config;
