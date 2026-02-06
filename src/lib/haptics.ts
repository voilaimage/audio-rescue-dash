/**
 * Haptic feedback utility for mobile devices
 * Uses the Vibration API where available
 */

type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [30, 50, 30],
  error: [50, 100, 50],
};

/**
 * Trigger haptic feedback on supported devices
 * @param pattern - The type of haptic feedback to trigger
 * @returns true if vibration was triggered, false otherwise
 */
export function hapticFeedback(pattern: HapticPattern = "light"): boolean {
  // Check if Vibration API is available
  if (!("vibrate" in navigator)) {
    return false;
  }

  try {
    const vibrationPattern = patterns[pattern];
    navigator.vibrate(vibrationPattern);
    return true;
  } catch {
    // Vibration may fail on some devices or contexts
    return false;
  }
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return "vibrate" in navigator;
}
