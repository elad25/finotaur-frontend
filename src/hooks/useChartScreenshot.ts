// ==================== USE CHART SCREENSHOT HOOK ====================
// Capture chart screenshots for journal entries

import { useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';

export interface ScreenshotOptions {
  quality?: number; // 0-1, default 0.95
  format?: 'png' | 'jpeg' | 'webp';
  backgroundColor?: string;
  scale?: number; // default 2 for retina
}

export interface UseChartScreenshotReturn {
  captureScreenshot: (element?: HTMLElement | null, options?: ScreenshotOptions) => Promise<string | null>;
  captureChartArea: (options?: ScreenshotOptions) => Promise<string | null>;
  downloadScreenshot: (dataUrl: string, filename?: string) => void;
  uploadToSupabase: (dataUrl: string, userId: string, tradeId?: string) => Promise<string | null>;
  isCapturing: boolean;
}

export const useChartScreenshot = (chartContainerRef?: React.RefObject<HTMLElement>): UseChartScreenshotReturn => {
  const isCapturingRef = useRef(false);

  /**
   * Capture screenshot of any element
   */
  const captureScreenshot = useCallback(async (
    element?: HTMLElement | null,
    options: ScreenshotOptions = {}
  ): Promise<string | null> => {
    const {
      quality = 0.95,
      format = 'png',
      backgroundColor = '#0A0E1B',
      scale = 2,
    } = options;

    if (isCapturingRef.current) {
      console.warn('Screenshot capture already in progress');
      return null;
    }

    const targetElement = element || chartContainerRef?.current;

    if (!targetElement) {
      console.error('No element to capture');
      return null;
    }

    isCapturingRef.current = true;

    try {
      const canvas = await html2canvas(targetElement, {
        backgroundColor,
        scale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: targetElement.scrollWidth,
        windowHeight: targetElement.scrollHeight,
      });

      const mimeType = `image/${format}`;
      const dataUrl = canvas.toDataURL(mimeType, quality);

      console.log('✅ Screenshot captured:', {
        width: canvas.width,
        height: canvas.height,
        size: `${(dataUrl.length / 1024).toFixed(2)} KB`,
      });

      return dataUrl;
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      return null;
    } finally {
      isCapturingRef.current = false;
    }
  }, [chartContainerRef]);

  /**
   * Capture just the chart area (for cleaner screenshots)
   */
  const captureChartArea = useCallback(async (
    options: ScreenshotOptions = {}
  ): Promise<string | null> => {
    if (!chartContainerRef?.current) {
      console.error('Chart container ref not provided');
      return null;
    }

    // Find the actual chart canvas
    const chartCanvas = chartContainerRef.current.querySelector('canvas');
    
    if (chartCanvas) {
      // If we have direct canvas access, use it for better quality
      try {
        const mimeType = `image/${options.format || 'png'}`;
        const dataUrl = chartCanvas.toDataURL(mimeType, options.quality || 0.95);
        return dataUrl;
      } catch (error) {
        console.warn('Canvas direct capture failed, using html2canvas:', error);
      }
    }

    // Fallback to html2canvas
    return captureScreenshot(chartContainerRef.current, options);
  }, [chartContainerRef, captureScreenshot]);

  /**
   * Download screenshot as file
   */
  const downloadScreenshot = useCallback((dataUrl: string, filename?: string) => {
    const link = document.createElement('a');
    link.download = filename || `finotaur-chart-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    console.log('✅ Screenshot downloaded');
  }, []);

  /**
   * Upload screenshot to Supabase Storage
   */
  const uploadToSupabase = useCallback(async (
    dataUrl: string,
    userId: string,
    tradeId?: string
  ): Promise<string | null> => {
    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Generate filename
      const timestamp = Date.now();
      const filename = tradeId 
        ? `${userId}/trades/${tradeId}/${timestamp}.png`
        : `${userId}/screenshots/${timestamp}.png`;

      // Import Supabase client
      const { supabase } = await import('@/integrations/supabase/client');

      // Upload to storage
      const { data, error } = await supabase.storage
        .from('trade-screenshots')
        .upload(filename, blob, {
          contentType: 'image/png',
          cacheControl: '31536000', // 1 year
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('trade-screenshots')
        .getPublicUrl(filename);

      console.log('✅ Screenshot uploaded to Supabase:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Failed to upload screenshot:', error);
      return null;
    }
  }, []);

  return {
    captureScreenshot,
    captureChartArea,
    downloadScreenshot,
    uploadToSupabase,
    isCapturing: isCapturingRef.current,
  };
};

/**
 * Utility: Convert data URL to File object
 */
export const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
};

/**
 * Utility: Compress image data URL
 */
export const compressImage = async (
  dataUrl: string,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
};