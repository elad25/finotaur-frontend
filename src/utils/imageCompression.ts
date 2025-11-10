// ===============================================
// 🔥 IMAGE COMPRESSION UTILITY - PRODUCTION OPTIMIZED
// ===============================================
// Optimized for 5000+ concurrent users
// ✅ Singleton Supabase client
// ✅ Request batching & throttling
// ✅ Automatic retry logic
// ✅ Memory-efficient compression
// ===============================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ===============================================
// SINGLETON SUPABASE CLIENT
// ===============================================
// יוצר רק instance אחד, משותף לכל הפונקציות
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        global: {
          headers: {
            'x-client-info': 'finotaur-web',
          },
        },
      }
    );
  }
  return supabaseInstance;
}

// ===============================================
// UPLOAD QUEUE & THROTTLING
// ===============================================
// מגביל concurrent uploads כדי לא להציף את Supabase Storage
interface UploadTask {
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

class UploadQueue {
  private queue: UploadTask[] = [];
  private running: number = 0;
  private maxConcurrent: number = 5; // מקסימום 5 העלאות במקביל למשתמש

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ execute: task, resolve, reject });
      this.process();
    });
  }

  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const task = this.queue.shift();

    if (task) {
      try {
        const result = await task.execute();
        task.resolve(result);
      } catch (error) {
        task.reject(error);
      } finally {
        this.running--;
        this.process();
      }
    }
  }
}

const uploadQueue = new UploadQueue();

// ===============================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ===============================================
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      console.log(`⏳ Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// ===============================================
// OPTIMIZED IMAGE COMPRESSION
// ===============================================
/**
 * Compress an image file before uploading
 * ✅ Memory-efficient: משחרר canvas לאחר שימוש
 * ✅ Progressive quality reduction
 */
export async function compressImage(
  file: File,
  maxSizeMB: number = 1,
  maxWidthOrHeight: number = 1920,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = Math.round((height * maxWidthOrHeight) / width);
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = Math.round((width * maxWidthOrHeight) / height);
            height = maxWidthOrHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d', { 
          alpha: false, // מאיץ rendering כשאין צורך ב-transparency
          willReadFrequently: false 
        });
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Helper function to convert with specific quality
        const convertWithQuality = (targetQuality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              const sizeMB = blob.size / 1024 / 1024;
              
              // אם עדיין גדול מדי וניתן להוריד את האיכות
              if (sizeMB > maxSizeMB && targetQuality > 0.3) {
                const newQuality = Math.max(0.3, targetQuality * 0.7);
                console.log(`🔄 Image ${sizeMB.toFixed(2)}MB, retrying with quality ${newQuality.toFixed(2)}`);
                convertWithQuality(newQuality);
                return;
              }
              
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '.jpg'),
                { type: 'image/jpeg' }
              );
              
              console.log(`✅ Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
              
              // ✅ חשוב: משחרר זיכרון
              canvas.width = 0;
              canvas.height = 0;
              
              resolve(compressedFile);
            },
            'image/jpeg',
            targetQuality
          );
        };
        
        convertWithQuality(quality);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ===============================================
// OPTIMIZED UPLOAD FUNCTIONS
// ===============================================

/**
 * Upload compressed screenshot to Supabase Storage
 * ✅ Uses singleton client
 * ✅ Automatic retry with backoff
 * ✅ Queue-based throttling
 */
export async function uploadTradeScreenshot(
  file: File,
  userId: string,
  tradeId: string
): Promise<string | null> {
  return uploadQueue.add(async () => {
    return retryWithBackoff(async () => {
      console.log('📸 Starting screenshot upload...');
      console.log(`   Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      
      // Compress image before upload
      const compressedFile = await compressImage(file, 1, 1920, 0.8);
      console.log(`   Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${userId}/${tradeId}_${timestamp}.jpg`;
      
      const supabase = getSupabaseClient();
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('trade-screenshots')
        .upload(fileName, compressedFile, {
          cacheControl: '31536000', // 1 year - תמונות לא משתנות
          upsert: false
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('trade-screenshots')
        .getPublicUrl(data.path);
      
      console.log('✅ Screenshot uploaded successfully');
      
      return urlData.publicUrl;
    });
  }).catch((error) => {
    console.error('❌ Screenshot upload failed:', error);
    return null;
  });
}

/**
 * Delete screenshot from Supabase Storage
 * ✅ Uses singleton client
 * ✅ Automatic retry
 */
export async function deleteTradeScreenshot(screenshotUrl: string): Promise<boolean> {
  return uploadQueue.add(async () => {
    return retryWithBackoff(async () => {
      const url = new URL(screenshotUrl);
      const pathMatch = url.pathname.match(/\/trade-screenshots\/(.+)/);
      
      if (!pathMatch) {
        throw new Error('Invalid screenshot URL');
      }
      
      const filePath = pathMatch[1];
      const supabase = getSupabaseClient();
      
      const { error } = await supabase.storage
        .from('trade-screenshots')
        .remove([filePath]);
      
      if (error) throw error;
      
      console.log('✅ Screenshot deleted successfully');
      return true;
    });
  }).catch((error) => {
    console.error('❌ Screenshot deletion failed:', error);
    return false;
  });
}

/**
 * Upload profile picture to Supabase Storage
 * ✅ Optimized for avatars (smaller size, faster)
 */
export async function uploadProfilePicture(
  file: File,
  userId: string
): Promise<string | null> {
  return uploadQueue.add(async () => {
    return retryWithBackoff(async () => {
      console.log('👤 Starting profile picture upload...');
      console.log(`   Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      
      // Compress image before upload (500KB, 800px, 85% quality)
      const compressedFile = await compressImage(file, 0.5, 800, 0.85);
      console.log(`   Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
      
      const timestamp = Date.now();
      const fileName = `${userId}/${timestamp}.jpg`;
      
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressedFile, {
          cacheControl: '31536000',
          upsert: false,
          contentType: 'image/jpeg'
        });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);
      
      console.log('✅ Profile picture uploaded successfully');
      
      return urlData.publicUrl;
    });
  }).catch((error) => {
    console.error('❌ Profile picture upload failed:', error);
    return null;
  });
}

/**
 * Delete profile picture from Supabase Storage
 */
export async function deleteProfilePicture(avatarUrl: string): Promise<boolean> {
  return uploadQueue.add(async () => {
    return retryWithBackoff(async () => {
      const url = new URL(avatarUrl);
      const pathMatch = url.pathname.match(/\/avatars\/(.+)/);
      
      if (!pathMatch) {
        throw new Error('Invalid avatar URL');
      }
      
      const filePath = pathMatch[1];
      const supabase = getSupabaseClient();
      
      const { error } = await supabase.storage
        .from('avatars')
        .remove([filePath]);
      
      if (error) throw error;
      
      console.log('✅ Profile picture deleted successfully');
      return true;
    });
  }).catch((error) => {
    console.error('❌ Profile picture deletion failed:', error);
    return false;
  });
}

// ===============================================
// CACHED STORAGE USAGE (מיועד ל-React Query)
// ===============================================
/**
 * Get user's storage usage statistics
 * ✅ Use with React Query for automatic caching
 */
export async function getUserStorageUsage(): Promise<{
  totalFiles: number;
  totalSizeMB: number;
} | null> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.rpc('get_user_storage_usage');
    
    if (error) throw error;
    
    return {
      totalFiles: data[0]?.total_files || 0,
      totalSizeMB: data[0]?.total_size_mb || 0
    };
  } catch (error) {
    console.error('❌ Storage usage query failed:', error);
    return null;
  }
}

// ===============================================
// VALIDATION FUNCTIONS (ללא שינוי - מהירות מקסימלית)
// ===============================================

export function validateImageFile(
  file: File,
  maxSizeMB: number = 5
): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, or WEBP images only.'
    };
  }
  
  const sizeMB = file.size / 1024 / 1024;
  if (sizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB (file is ${sizeMB.toFixed(2)}MB).`
    };
  }
  
  return { valid: true };
}

export function validateImage(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only PNG, JPG, and WebP images are allowed',
    };
  }
  
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image must be less than 10MB',
    };
  }
  
  return { valid: true };
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.readAsDataURL(file);
  });
}

export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeImagePreview(url: string): void {
  URL.revokeObjectURL(url);
}

// ===============================================
// REACT QUERY INTEGRATION (מומלץ!)
// ===============================================

/*
// בקובץ hooks/useImageUpload.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUploadTradeScreenshot() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ file, userId, tradeId }: { 
      file: File; 
      userId: string; 
      tradeId: string 
    }) => uploadTradeScreenshot(file, userId, tradeId),
    
    onSuccess: () => {
      // Invalidate storage usage query
      queryClient.invalidateQueries({ queryKey: ['storageUsage'] });
    },
  });
}

// שימוש בקומפוננטה:
const uploadMutation = useUploadTradeScreenshot();

const handleUpload = async (file: File) => {
  const validation = validateImage(file);
  if (!validation.valid) {
    toast.error(validation.error);
    return;
  }
  
  uploadMutation.mutate(
    { file, userId, tradeId },
    {
      onSuccess: (url) => {
        if (url) {
          toast.success('Screenshot uploaded!');
        } else {
          toast.error('Upload failed');
        }
      },
    }
  );
};
*/