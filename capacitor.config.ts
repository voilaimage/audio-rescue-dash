import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.4ad5e9540b9d4f62b7e2e745116f99ea',
  appName: 'AudioSalvageUK Partner',
  webDir: 'dist',
  server: {
    url: 'https://4ad5e954-0b9d-4f62-b7e2-e745116f99ea.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#000000',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      presentationStyle: 'fullScreen',
    },
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#000000',
  },
  android: {
    backgroundColor: '#000000',
  },
};

export default config;
