/**
 * Audio feedback utility for UI interactions
 * Uses Web Audio API to generate synthetic sounds
 */

import { isSoundEnabled } from "@/hooks/useSoundSettings";

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      console.warn("Web Audio API not supported");
      return null;
    }
  }
  
  // Resume if suspended (required for iOS/Chrome autoplay policies)
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  
  return audioContext;
}

/**
 * Play a confirmation sound (soft chime)
 */
export function playConfirmSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Create oscillator for the main tone
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Soft, pleasant confirmation tone (E5 note, 659.25 Hz)
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(659.25, now);
  oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.05); // Quick rise to A5
  
  // Quick fade envelope for a "ding" effect
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02); // Soft attack
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2); // Quick decay
  
  oscillator.start(now);
  oscillator.stop(now + 0.25);
}

/**
 * Play a delete/cancel warning sound (lower tone)
 */
export function playDeleteSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Create oscillator
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Lower, attention-grabbing tone (C4 to G3)
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(261.63, now); // C4
  oscillator.frequency.exponentialRampToValueAtTime(196, now + 0.1); // Down to G3
  
  // Envelope
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.12, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  
  oscillator.start(now);
  oscillator.stop(now + 0.2);
}

/**
 * Play a subtle tap sound
 */
export function playTapSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  // Very short, subtle click
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(1200, now);
  
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.08, now + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  
  oscillator.start(now);
  oscillator.stop(now + 0.06);
}
