/**
 * Native camera utility for Capacitor
 * Provides camera access on native platforms with fallback for web
 */

import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { isNativeApp } from './capacitor';

export interface CapturedPhoto {
  dataUrl: string;
  format: string;
  path?: string;
}

/**
 * Take a photo using the native camera
 * @returns The captured photo data
 */
export async function takePhoto(): Promise<CapturedPhoto | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      saveToGallery: false,
      correctOrientation: true,
    });

    if (!photo.dataUrl) {
      return null;
    }

    return {
      dataUrl: photo.dataUrl,
      format: photo.format,
      path: photo.path,
    };
  } catch (error) {
    console.error('Camera error:', error);
    return null;
  }
}

/**
 * Pick a photo from the gallery
 * @returns The selected photo data
 */
export async function pickFromGallery(): Promise<CapturedPhoto | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      correctOrientation: true,
    });

    if (!photo.dataUrl) {
      return null;
    }

    return {
      dataUrl: photo.dataUrl,
      format: photo.format,
      path: photo.path,
    };
  } catch (error) {
    console.error('Gallery error:', error);
    return null;
  }
}

/**
 * Pick multiple photos from the gallery (native only)
 * @param limit - Maximum number of photos to pick
 * @returns Array of captured photo data
 */
export async function pickMultipleFromGallery(limit: number = 10): Promise<CapturedPhoto[]> {
  try {
    const photos = await Camera.pickImages({
      quality: 80,
      limit,
      correctOrientation: true,
    });

    return photos.photos.map(photo => ({
      dataUrl: photo.webPath || '',
      format: photo.format,
      path: photo.path,
    }));
  } catch (error) {
    console.error('Gallery error:', error);
    return [];
  }
}

/**
 * Check if native camera is available
 */
export function isNativeCameraAvailable(): boolean {
  return isNativeApp();
}

/**
 * Request camera permissions
 * @returns Whether permissions were granted
 */
export async function requestCameraPermissions(): Promise<boolean> {
  try {
    const permissions = await Camera.requestPermissions({
      permissions: ['camera', 'photos'],
    });
    
    return permissions.camera === 'granted' || permissions.camera === 'limited';
  } catch {
    return false;
  }
}

/**
 * Check camera permissions status
 */
export async function checkCameraPermissions(): Promise<{
  camera: 'granted' | 'denied' | 'prompt';
  photos: 'granted' | 'denied' | 'prompt' | 'limited';
}> {
  try {
    const permissions = await Camera.checkPermissions();
    return {
      camera: permissions.camera as 'granted' | 'denied' | 'prompt',
      photos: permissions.photos as 'granted' | 'denied' | 'prompt' | 'limited',
    };
  } catch {
    return { camera: 'denied', photos: 'denied' };
  }
}
