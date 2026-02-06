/**
 * Haptic feedback utility for mobile devices
 * Uses Capacitor Haptics plugin on native platforms, falls back to Vibration API on web
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNativeApp } from './capacitor';

type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const webPatterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [30, 50, 30],
  error: [50, 100, 50],
};

/**
 * Trigger haptic feedback on supported devices
 * Uses native Capacitor Haptics on iOS/Android, falls back to Vibration API on web
 * @param pattern - The type of haptic feedback to trigger
 * @returns true if vibration was triggered, false otherwise
 */
export async function hapticFeedback(pattern: HapticPattern = "light"): Promise<boolean> {
  // Use native haptics on mobile platforms
  if (isNativeApp()) {
    try {
      switch (pattern) {
        case "light":
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case "medium":
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case "heavy":
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case "success":
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case "warning":
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case "error":
          await Haptics.notification({ type: NotificationType.Error });
          break;
      }
      return true;
    } catch {
      return false;
    }
  }

  // Fall back to web Vibration API
  if (!("vibrate" in navigator)) {
    return false;
  }

  try {
    const vibrationPattern = webPatterns[pattern];
    navigator.vibrate(vibrationPattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return isNativeApp() || "vibrate" in navigator;
}

/**
 * Trigger a selection haptic (light tap for UI selections)
 */
export async function hapticSelection(): Promise<void> {
  if (isNativeApp()) {
    try {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } catch {
      // Ignore errors
    }
  } else {
    hapticFeedback("light");
  }
}
