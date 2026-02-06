import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isNativeApp } from '@/lib/capacitor';
import { 
  initializePushNotifications, 
  isPushNotificationsSupported,
  PushNotificationHandlers 
} from '@/lib/push-notifications';
import { useToast } from '@/hooks/use-toast';

export function usePushNotifications(userId: string | undefined) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Save token to database
  const saveToken = useCallback(async (token: string, platform: 'ios' | 'android') => {
    if (!userId) {
      console.log('No user ID, skipping token save');
      return;
    }

    try {
      // Upsert the token (insert or update if exists)
      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          { 
            user_id: userId, 
            device_token: token, 
            platform,
            updated_at: new Date().toISOString()
          },
          { 
            onConflict: 'user_id,device_token',
            ignoreDuplicates: false
          }
        );

      if (error) {
        console.error('Failed to save push token:', error);
        return;
      }

      console.log('Push token saved successfully');
      setIsRegistered(true);
    } catch (err) {
      console.error('Error saving push token:', err);
    }
  }, [userId]);

  // Initialize push notifications
  const initialize = useCallback(async () => {
    if (!isPushNotificationsSupported() || !userId) {
      return;
    }

    setIsLoading(true);

    try {
      // Detect platform
      const userAgent = navigator.userAgent.toLowerCase();
      const platform: 'ios' | 'android' = userAgent.includes('iphone') || userAgent.includes('ipad') 
        ? 'ios' 
        : 'android';

      const handlers: PushNotificationHandlers = {
        onRegistration: (token) => {
          console.log('Push token received:', token.substring(0, 20) + '...');
          saveToken(token, platform);
        },
        onRegistrationError: (error) => {
          console.error('Push registration failed:', error);
          toast({
            title: 'Notification Setup Failed',
            description: 'Unable to enable push notifications. Please try again later.',
            variant: 'destructive',
          });
        },
        onNotificationReceived: (notification) => {
          console.log('Notification received in foreground:', notification);
          // Show in-app toast for foreground notifications
          toast({
            title: notification.title || 'New Notification',
            description: notification.body || '',
          });
        },
        onNotificationActionPerformed: (action) => {
          console.log('Notification action:', action);
          // Handle notification tap - could navigate to request detail
          const requestId = action.notification.data?.request_id;
          if (requestId) {
            // Navigation could be handled here if needed
            console.log('Should navigate to request:', requestId);
          }
        },
      };

      const success = await initializePushNotifications(handlers);
      
      if (!success) {
        console.log('Push notifications not enabled');
      }
    } catch (err) {
      console.error('Failed to initialize push notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, saveToken, toast]);

  // Remove token on logout
  const removeToken = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to remove push token:', error);
      } else {
        setIsRegistered(false);
        console.log('Push token removed');
      }
    } catch (err) {
      console.error('Error removing push token:', err);
    }
  }, [userId]);

  // Initialize on mount when user is available
  useEffect(() => {
    if (userId && isNativeApp()) {
      initialize();
    }
  }, [userId, initialize]);

  return {
    isRegistered,
    isLoading,
    initialize,
    removeToken,
    isSupported: isPushNotificationsSupported(),
  };
}
