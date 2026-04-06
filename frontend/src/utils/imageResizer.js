/**
 * Image resizing utility to reduce file size before upload
 * Maintains quality while resizing to reasonable dimensions
 */

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const MAX_FILE_SIZE_MB = 2;
const JPEG_QUALITY = 0.85;

/**
 * Resize an image file to reduce file size
 * @param {File} file - The original image file
 * @returns {Promise<Blob>} - Resized image as Blob
 */
export const resizeImage = (file) => {
  return new Promise((resolve, reject) => {
    // If file is already small enough, return as-is
    if (file.size <= MAX_FILE_SIZE_MB * 1024 * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Create canvas for resizing
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      
      // Use better quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob with compression
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Create a new File from the blob to preserve filename
            const resizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Get file size in MB
 * @param {number} bytes - File size in bytes
 * @returns {number} - File size in MB
 */
export const getFileSizeMB = (bytes) => {
  return (bytes / (1024 * 1024)).toFixed(2);
};

/**
 * Check if file needs resizing
 * @param {File} file - The file to check
 * @returns {boolean} - True if file needs resizing
 */
export const needsResizing = (file) => {
  return file.size > MAX_FILE_SIZE_MB * 1024 * 1024;
};

/**
 * Resize multiple images
 * @param {FileList} files - List of files to resize
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<File[]>} - Array of resized files
 */
export const resizeMultipleImages = async (files, onProgress = () => {}) => {
  const resizedFiles = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      if (needsResizing(file)) {
        const resized = await resizeImage(file);
        resizedFiles.push(resized);
      } else {
        resizedFiles.push(file);
      }
      onProgress(i + 1, files.length);
    } catch (error) {
      console.error(`Error resizing ${file.name}:`, error);
      // Still include original file if resize fails
      resizedFiles.push(file);
    }
  }
  
  return resizedFiles;
};
