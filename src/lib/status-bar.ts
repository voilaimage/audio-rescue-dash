/**
 * Status bar utility for native apps
 * Controls the appearance of the device status bar
 */

import { StatusBar, Style } from '@capacitor/status-bar';
import { isNativeApp, isIOS, isAndroid } from './capacitor';

/**
 * Set the status bar style (light or dark icons)
 */
export async function setStatusBarStyle(style: 'light' | 'dark'): Promise<void> {
  if (!isNativeApp()) return;
  
  try {
    await StatusBar.setStyle({
      style: style === 'dark' ? Style.Dark : Style.Light,
    });
  } catch (error) {
    console.error('Failed to set status bar style:', error);
  }
}

/**
 * Set the status bar background color (Android only)
 */
export async function setStatusBarColor(color: string): Promise<void> {
  if (!isAndroid()) return;
  
  try {
    await StatusBar.setBackgroundColor({ color });
  } catch (error) {
    console.error('Failed to set status bar color:', error);
  }
}

/**
 * Hide the status bar
 */
export async function hideStatusBar(): Promise<void> {
  if (!isNativeApp()) return;
  
  try {
    await StatusBar.hide();
  } catch (error) {
    console.error('Failed to hide status bar:', error);
  }
}

/**
 * Show the status bar
 */
export async function showStatusBar(): Promise<void> {
  if (!isNativeApp()) return;
  
  try {
    await StatusBar.show();
  } catch (error) {
    console.error('Failed to show status bar:', error);
  }
}

/**
 * Set overlay mode (content shows behind status bar)
 * iOS only - Android handles this differently
 */
export async function setOverlaysWebView(overlay: boolean): Promise<void> {
  if (!isIOS()) return;
  
  try {
    await StatusBar.setOverlaysWebView({ overlay });
  } catch (error) {
    console.error('Failed to set overlay mode:', error);
  }
}

/**
 * Configure status bar for dark theme (light icons on dark background)
 * Call this on app initialization
 */
export async function configureStatusBarForDarkTheme(): Promise<void> {
  if (!isNativeApp()) return;
  
  try {
    // Use light content (white icons) for dark backgrounds
    await StatusBar.setStyle({ style: Style.Dark });
    
    // Set black background on Android
    if (isAndroid()) {
      await StatusBar.setBackgroundColor({ color: '#000000' });
    }
  } catch (error) {
    console.error('Failed to configure status bar:', error);
  }
}
