// Avatar Upload Service
// Handles profile picture uploads with compression and Firebase Storage

class AvatarService {
  constructor() {
    this.storage = window.firebaseStorage;
    this.maxFileSize = 500 * 1024; // 500KB max
    this.maxDimension = 400; // 400x400px
    this.compressionQuality = 0.8;
  }

  /**
   * Compress and resize image
   * @param {File} file - Image file
   * @returns {Promise<Blob>} Compressed image blob
   */
  async compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > this.maxDimension) {
              height = (height * this.maxDimension) / width;
              width = this.maxDimension;
            }
          } else {
            if (height > this.maxDimension) {
              width = (width * this.maxDimension) / height;
              height = this.maxDimension;
            }
          }
          
          // Create canvas and compress
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            this.compressionQuality
          );
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Upload avatar (stores as base64 in Realtime Database to avoid CORS)
   * @param {string} userId - User ID
   * @param {File} file - Image file
   * @returns {Promise<string>} Base64 data URL
   */
  async uploadAvatar(userId, file) {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Compress image
      console.log('🖼️ Compressing image...');
      const compressedBlob = await this.compressImage(file);
      
      // Check size after compression
      if (compressedBlob.size > this.maxFileSize) {
        throw new Error(`Image too large. Max size: ${this.maxFileSize / 1024}KB`);
      }

      console.log(`✅ Compressed: ${file.size} → ${compressedBlob.size} bytes`);

      // Convert to base64 data URL (no CORS issues!)
      console.log('📤 Converting to base64...');
      const base64 = await this.blobToBase64(compressedBlob);
      
      console.log('✅ Upload complete (base64)');

      return base64;
    } catch (error) {
      console.error('❌ Avatar upload error:', error);
      throw error;
    }
  }
  
  /**
   * Convert blob to base64 data URL
   * @param {Blob} blob - Image blob
   * @returns {Promise<string>} Base64 data URL
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Delete avatar from Firebase Storage
   * @param {string} userId - User ID
   */
  async deleteAvatar(userId) {
    try {
      const storageRef = this.storage.ref();
      const avatarRef = storageRef.child(`avatars/${userId}.jpg`);
      await avatarRef.delete();
      console.log('✅ Avatar deleted');
    } catch (error) {
      if (error.code === 'storage/object-not-found') {
        console.log('ℹ️ No avatar to delete');
      } else {
        console.error('❌ Avatar deletion error:', error);
        throw error;
      }
    }
  }

  /**
   * Get avatar URL for user
   * @param {string} userId - User ID
   * @returns {string} Avatar URL (always returns URL, may 404 if not uploaded)
   */
  getAvatarUrl(userId) {
    // Always return public URL - let the browser handle 404s with default avatar fallback
    const bucket = this.storage.ref().bucket;
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent('avatars/' + userId + '.jpg')}?alt=media`;
  }
  
  /**
   * Get avatar URL with fallback
   * @param {string} userId - User ID
   * @returns {string} Avatar URL or default
   */
  getAvatarUrlWithFallback(userId) {
    const bucket = this.storage.ref().bucket;
    const publicURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent('avatars/' + userId + '.jpg')}?alt=media`;
    
    // Return default avatar for now - we'll check if uploaded via profilePicture field
    return `https://api.dicebear.com/7.x/thumbs/svg?seed=${userId}`;
  }
}

// Initialize and export
window.avatarService = new AvatarService();
console.log('✅ Avatar Service initialized');
