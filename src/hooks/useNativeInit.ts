/**
 * Hook to initialize native capabilities when app starts
 */

import { useEffect, useState } from 'react';
import { isNativeApp } from '@/lib/capacitor';
import { configureStatusBarForDarkTheme } from '@/lib/status-bar';
import { initializePushNotifications } from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';

export function useNativeInit() {
  const [initialized, setInitialized] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    if (!isNativeApp()) {
      setInitialized(true);
      return;
    }

    const initNative = async () => {
      try {
        // Configure status bar for dark theme
        await configureStatusBarForDarkTheme();

        // Initialize push notifications
        const pushSuccess = await initializePushNotifications({
          onRegistration: async (token) => {
            setPushToken(token);
            console.log('Push token received:', token);
            
            // Store push token in user profile when authenticated
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              // You could store this in the database if needed
              console.log('User authenticated, push token available');
            }
          },
          onNotificationReceived: (notification) => {
            console.log('Notification received in foreground:', notification);
            // Handle foreground notification (e.g., show toast)
          },
          onNotificationActionPerformed: (action) => {
            console.log('Notification action:', action);
            // Handle notification tap (e.g., navigate to relevant screen)
            const data = action.notification.data;
            if (data?.requestId) {
              // Navigate to request detail
              window.location.href = `/requests/${data.requestId}`;
            }
          },
        });

        if (pushSuccess) {
          console.log('Push notifications initialized');
        }

        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize native features:', error);
        setInitialized(true);
      }
    };

    initNative();
  }, []);

  return { initialized, pushToken };
}
