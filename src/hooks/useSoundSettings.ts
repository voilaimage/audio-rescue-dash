import { useState, useEffect, useCallback } from "react";

const SOUND_ENABLED_KEY = "sound-feedback-enabled";
const HAPTIC_ENABLED_KEY = "haptic-feedback-enabled";

// Default values
const DEFAULT_SOUND_ENABLED = true;
const DEFAULT_HAPTIC_ENABLED = true;

/**
 * Hook to manage sound feedback settings
 * Persists preference to localStorage
 */
export function useSoundSettings() {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return DEFAULT_SOUND_ENABLED;
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored === null ? DEFAULT_SOUND_ENABLED : stored === "true";
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
  if (typeof window === "undefined") return DEFAULT_SOUND_ENABLED;
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  return stored === null ? DEFAULT_SOUND_ENABLED : stored === "true";
}

/**
 * Hook to manage haptic feedback settings
 * Persists preference to localStorage
 */
export function useHapticSettings() {
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return DEFAULT_HAPTIC_ENABLED;
    const stored = localStorage.getItem(HAPTIC_ENABLED_KEY);
    return stored === null ? DEFAULT_HAPTIC_ENABLED : stored === "true";
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
  if (typeof window === "undefined") return DEFAULT_HAPTIC_ENABLED;
  const stored = localStorage.getItem(HAPTIC_ENABLED_KEY);
  return stored === null ? DEFAULT_HAPTIC_ENABLED : stored === "true";
}

/**
 * Hook to manage all feedback settings together
 * Provides a unified interface for sound and haptic settings
 */
export function useFeedbackSettings() {
  const { soundEnabled, setSoundEnabled } = useSoundSettings();
  const { hapticEnabled, setHapticEnabled } = useHapticSettings();

  const resetToDefaults = useCallback(() => {
    setSoundEnabled(DEFAULT_SOUND_ENABLED);
    setHapticEnabled(DEFAULT_HAPTIC_ENABLED);
  }, [setSoundEnabled, setHapticEnabled]);

  const hasCustomSettings = soundEnabled !== DEFAULT_SOUND_ENABLED || hapticEnabled !== DEFAULT_HAPTIC_ENABLED;

  return {
    soundEnabled,
    setSoundEnabled,
    hapticEnabled,
    setHapticEnabled,
    resetToDefaults,
    hasCustomSettings,
  };
}
