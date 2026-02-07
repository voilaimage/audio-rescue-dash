import { useState, useEffect, useCallback } from "react";

const SOUND_ENABLED_KEY = "sound-feedback-enabled";
const HAPTIC_ENABLED_KEY = "haptic-feedback-enabled";

/**
 * Hook to manage sound feedback settings
 * Persists preference to localStorage
 */
export function useSoundSettings() {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    // Default to enabled if not set
    return stored === null ? true : stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(SOUND_ENABLED_KEY, String(soundEnabled));
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  return {
    soundEnabled,
    setSoundEnabled,
    toggleSound,
  };
}

/**
 * Check if sound feedback is enabled (for use outside React components)
 */
export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  return stored === null ? true : stored === "true";
}

/**
 * Hook to manage haptic feedback settings
 * Persists preference to localStorage
 */
export function useHapticSettings() {
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(HAPTIC_ENABLED_KEY);
    // Default to enabled if not set
    return stored === null ? true : stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(HAPTIC_ENABLED_KEY, String(hapticEnabled));
  }, [hapticEnabled]);

  const toggleHaptic = useCallback(() => {
    setHapticEnabled((prev) => !prev);
  }, []);

  return {
    hapticEnabled,
    setHapticEnabled,
    toggleHaptic,
  };
}

/**
 * Check if haptic feedback is enabled (for use outside React components)
 */
export function isHapticEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(HAPTIC_ENABLED_KEY);
  return stored === null ? true : stored === "true";
}
