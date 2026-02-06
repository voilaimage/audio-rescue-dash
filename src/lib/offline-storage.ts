/**
 * Offline storage utility using Capacitor Preferences
 * Provides persistent key-value storage that works across app restarts
 */

import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from './capacitor';

/**
 * Set a value in storage
 * @param key - The key to store the value under
 * @param value - The value to store (will be JSON stringified)
 */
export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await Preferences.set({
      key,
      value: JSON.stringify(value),
    });
  } catch (error) {
    console.error('Failed to set storage item:', error);
    // Fallback to localStorage on web
    if (!isNativeApp()) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }
}

/**
 * Get a value from storage
 * @param key - The key to retrieve
 * @param defaultValue - Default value if key doesn't exist
 * @returns The stored value or default
 */
export async function getItem<T>(key: string, defaultValue: T | null = null): Promise<T | null> {
  try {
    const result = await Preferences.get({ key });
    
    if (result.value === null) {
      return defaultValue;
    }
    
    return JSON.parse(result.value) as T;
  } catch (error) {
    console.error('Failed to get storage item:', error);
    // Fallback to localStorage on web
    if (!isNativeApp()) {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    }
    return defaultValue;
  }
}

/**
 * Remove a value from storage
 * @param key - The key to remove
 */
export async function removeItem(key: string): Promise<void> {
  try {
    await Preferences.remove({ key });
  } catch (error) {
    console.error('Failed to remove storage item:', error);
    // Fallback to localStorage on web
    if (!isNativeApp()) {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Clear all stored values
 */
export async function clear(): Promise<void> {
  try {
    await Preferences.clear();
  } catch (error) {
    console.error('Failed to clear storage:', error);
    // Fallback to localStorage on web
    if (!isNativeApp()) {
      localStorage.clear();
    }
  }
}

/**
 * Get all keys in storage
 * @returns Array of all stored keys
 */
export async function keys(): Promise<string[]> {
  try {
    const result = await Preferences.keys();
    return result.keys;
  } catch (error) {
    console.error('Failed to get storage keys:', error);
    // Fallback to localStorage on web
    if (!isNativeApp()) {
      return Object.keys(localStorage);
    }
    return [];
  }
}

// Convenience functions for common data types

/**
 * Cache user profile data for offline access
 */
export async function cacheUserProfile(profile: any): Promise<void> {
  await setItem('cached_user_profile', {
    data: profile,
    timestamp: Date.now(),
  });
}

/**
 * Get cached user profile
 * @param maxAgeMs - Maximum age in milliseconds (default 1 hour)
 */
export async function getCachedUserProfile(maxAgeMs: number = 3600000): Promise<any | null> {
  const cached = await getItem<{ data: any; timestamp: number }>('cached_user_profile');
  
  if (!cached) return null;
  
  // Check if cache is still valid
  if (Date.now() - cached.timestamp > maxAgeMs) {
    return null;
  }
  
  return cached.data;
}

/**
 * Cache requests list for offline access
 */
export async function cacheRequests(requests: any[]): Promise<void> {
  await setItem('cached_requests', {
    data: requests,
    timestamp: Date.now(),
  });
}

/**
 * Get cached requests
 * @param maxAgeMs - Maximum age in milliseconds (default 5 minutes)
 */
export async function getCachedRequests(maxAgeMs: number = 300000): Promise<any[] | null> {
  const cached = await getItem<{ data: any[]; timestamp: number }>('cached_requests');
  
  if (!cached) return null;
  
  // Check if cache is still valid
  if (Date.now() - cached.timestamp > maxAgeMs) {
    return null;
  }
  
  return cached.data;
}

/**
 * Store pending request for offline submission
 */
export async function storePendingRequest(request: any): Promise<void> {
  const pending = await getItem<any[]>('pending_requests', []);
  pending?.push({
    ...request,
    pendingId: `pending_${Date.now()}`,
    createdAt: Date.now(),
  });
  await setItem('pending_requests', pending);
}

/**
 * Get all pending requests
 */
export async function getPendingRequests(): Promise<any[]> {
  return await getItem<any[]>('pending_requests', []) ?? [];
}

/**
 * Remove a pending request after successful sync
 */
export async function removePendingRequest(pendingId: string): Promise<void> {
  const pending = await getItem<any[]>('pending_requests', []);
  const filtered = pending?.filter(r => r.pendingId !== pendingId) ?? [];
  await setItem('pending_requests', filtered);
}
