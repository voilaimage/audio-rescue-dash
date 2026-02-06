/**
 * Hook for capturing photos using native camera or web fallback
 * Integrates with the existing image cropping and compression pipeline
 */

import { useState, useCallback } from 'react';
import { isNativeCameraAvailable, takePhoto, pickFromGallery, pickMultipleFromGallery } from '@/lib/native-camera';
import { hapticFeedback } from '@/lib/haptics';

interface UseNativeCameraOptions {
  onPhotoTaken?: (dataUrl: string) => void;
  onMultiplePhotos?: (dataUrls: string[]) => void;
  onError?: (error: string) => void;
}

export function useNativeCamera(options: UseNativeCameraOptions = {}) {
  const [loading, setLoading] = useState(false);
  const isNative = isNativeCameraAvailable();

  const capturePhoto = useCallback(async () => {
    if (!isNative) {
      options.onError?.('Native camera not available');
      return null;
    }

    setLoading(true);
    await hapticFeedback('light');

    try {
      const photo = await takePhoto();
      
      if (photo?.dataUrl) {
        await hapticFeedback('success');
        options.onPhotoTaken?.(photo.dataUrl);
        return photo.dataUrl;
      }
      
      return null;
    } catch (error) {
      await hapticFeedback('error');
      options.onError?.('Failed to capture photo');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isNative, options]);

  const selectFromGallery = useCallback(async () => {
    if (!isNative) {
      options.onError?.('Native gallery not available');
      return null;
    }

    setLoading(true);
    await hapticFeedback('light');

    try {
      const photo = await pickFromGallery();
      
      if (photo?.dataUrl) {
        await hapticFeedback('success');
        options.onPhotoTaken?.(photo.dataUrl);
        return photo.dataUrl;
      }
      
      return null;
    } catch (error) {
      await hapticFeedback('error');
      options.onError?.('Failed to select photo');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isNative, options]);

  const selectMultipleFromGallery = useCallback(async (limit: number = 10) => {
    if (!isNative) {
      options.onError?.('Native gallery not available');
      return [];
    }

    setLoading(true);
    await hapticFeedback('light');

    try {
      const photos = await pickMultipleFromGallery(limit);
      const dataUrls = photos.map(p => p.dataUrl).filter(Boolean);
      
      if (dataUrls.length > 0) {
        await hapticFeedback('success');
        options.onMultiplePhotos?.(dataUrls);
      }
      
      return dataUrls;
    } catch (error) {
      await hapticFeedback('error');
      options.onError?.('Failed to select photos');
      return [];
    } finally {
      setLoading(false);
    }
  }, [isNative, options]);

  return {
    isNative,
    loading,
    capturePhoto,
    selectFromGallery,
    selectMultipleFromGallery,
  };
}
