/**
 * Push notifications utility for Capacitor
 * Handles native push notifications on iOS and Android
 */

import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { isNativeApp } from './capacitor';

export interface PushNotificationHandlers {
  onRegistration?: (token: string) => void;
  onRegistrationError?: (error: any) => void;
  onNotificationReceived?: (notification: PushNotificationSchema) => void;
  onNotificationActionPerformed?: (notification: ActionPerformed) => void;
}

let initialized = false;

/**
 * Initialize push notifications
 * Should be called once when the app starts
 */
export async function initializePushNotifications(
  handlers: PushNotificationHandlers = {}
): Promise<boolean> {
  if (!isNativeApp()) {
    console.log('Push notifications are only available on native platforms');
    return false;
  }

  if (initialized) {
    console.log('Push notifications already initialized');
    return true;
  }

  try {
    // Request permission
    const permissionResult = await PushNotifications.requestPermissions();
    
    if (permissionResult.receive !== 'granted') {
      console.log('Push notification permission not granted');
      return false;
    }

    // Register for push notifications
    await PushNotifications.register();

    // Set up listeners
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token:', token.value);
      handlers.onRegistration?.(token.value);
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
      handlers.onRegistrationError?.(error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      handlers.onNotificationReceived?.(notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push notification action performed:', notification);
      handlers.onNotificationActionPerformed?.(notification);
    });

    initialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return false;
  }
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationsSupported(): boolean {
  return isNativeApp();
}

/**
 * Get the list of delivered notifications
 */
export async function getDeliveredNotifications(): Promise<PushNotificationSchema[]> {
  if (!isNativeApp()) return [];
  
  try {
    const result = await PushNotifications.getDeliveredNotifications();
    return result.notifications;
  } catch {
    return [];
  }
}

/**
 * Remove all delivered notifications
 */
export async function removeAllDeliveredNotifications(): Promise<void> {
  if (!isNativeApp()) return;
  
  try {
    await PushNotifications.removeAllDeliveredNotifications();
  } catch (error) {
    console.error('Failed to remove notifications:', error);
  }
}

/**
 * Remove specific delivered notifications by ID
 */
export async function removeDeliveredNotifications(ids: string[]): Promise<void> {
  if (!isNativeApp()) return;
  
  try {
    // Get delivered notifications to find matching ones
    const delivered = await PushNotifications.getDeliveredNotifications();
    const toRemove = delivered.notifications.filter(n => ids.includes(n.id));
    
    if (toRemove.length > 0) {
      await PushNotifications.removeDeliveredNotifications({
        notifications: toRemove,
      });
    }
  } catch (error) {
    console.error('Failed to remove notifications:', error);
  }
}
