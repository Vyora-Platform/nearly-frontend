import { useState, useCallback } from 'react';

// Type definitions for Median camera API
declare global {
  interface Window {
    Median?: {
      camera?: {
        takePhoto?: () => Promise<string>;
        pickFromGallery?: () => Promise<string>;
      };
    };
    ReactNativeWebView?: any;
  }
}

interface CameraOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  source?: 'camera' | 'gallery';
}

export function useNativeCamera() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const takePhoto = useCallback(async (options: CameraOptions = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if running in Median native wrapper
      if (window.Median?.camera?.takePhoto) {
        const result = await window.Median.camera.takePhoto();
        return result; // This would be a base64 string or file path
      }

      // Check if running in React Native WebView
      if (window.ReactNativeWebView) {
        return new Promise<string>((resolve, reject) => {
          // Send message to React Native
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'CAMERA_REQUEST',
            payload: { source: 'camera', ...options }
          }));

          // Listen for response (this would need to be set up in the WebView)
          const handleMessage = (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'CAMERA_RESPONSE') {
                window.removeEventListener('message', handleMessage);
                if (data.success) {
                  resolve(data.result);
                } else {
                  reject(new Error(data.error || 'Camera failed'));
                }
              }
            } catch (e) {
              // Ignore non-JSON messages
            }
          };

          window.addEventListener('message', handleMessage);

          // Timeout after 30 seconds
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            reject(new Error('Camera request timeout'));
          }, 30000);
        });
      }

      // Fallback to web camera API
      return await takePhotoWeb(options);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Camera access failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pickFromGallery = useCallback(async (options: CameraOptions = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if running in Median native wrapper
      if (window.Median?.camera?.pickFromGallery) {
        const result = await window.Median.camera.pickFromGallery();
        return result;
      }

      // Check if running in React Native WebView
      if (window.ReactNativeWebView) {
        return new Promise<string>((resolve, reject) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'GALLERY_REQUEST',
            payload: options
          }));

          const handleMessage = (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'GALLERY_RESPONSE') {
                window.removeEventListener('message', handleMessage);
                if (data.success) {
                  resolve(data.result);
                } else {
                  reject(new Error(data.error || 'Gallery access failed'));
                }
              }
            } catch (e) {
              // Ignore non-JSON messages
            }
          };

          window.addEventListener('message', handleMessage);

          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            reject(new Error('Gallery request timeout'));
          }, 30000);
        });
      }

      // Fallback to web file picker
      return await pickFromGalleryWeb(options);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gallery access failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    takePhoto,
    pickFromGallery,
    isLoading,
    error
  };
}

// Fallback web camera implementation
async function takePhotoWeb(options: CameraOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Prefer rear camera

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    };

    input.oncancel = () => reject(new Error('Camera cancelled'));

    input.click();
  });
}

// Fallback web gallery implementation
async function pickFromGalleryWeb(options: CameraOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    };

    input.oncancel = () => reject(new Error('Gallery cancelled'));

    input.click();
  });
}