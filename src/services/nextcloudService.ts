export class NextcloudService {
  private baseUrl: string;
  private username: string;
  private password: string;
  private webdavUrl: string;
  
  constructor() {
    this.baseUrl = import.meta.env.VITE_NEXTCLOUD_BASE_URL || 'https://alpenview.ch';
    this.username = import.meta.env.VITE_NEXTCLOUD_USERNAME || 'admin';
    this.password = import.meta.env.VITE_NEXTCLOUD_PASSWORD || '';
    this.webdavUrl = `${this.baseUrl}/remote.php/dav/files/${this.username}`;
    
    if (!this.baseUrl || !this.username || !this.password) {
      throw new Error('Nextcloud configuration missing. Please check environment variables.');
    }
  }
  
  private getAuthHeaders() {
    const auth = btoa(`${this.username}:${this.password}`);
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/octet-stream'
    };
  }
  
  /**
   * Create a directory in Nextcloud
   */
  async createDirectory(path: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.webdavUrl}/${path}/`, {
        method: 'MKCOL',
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${this.password}`)}`
        }
      });
      
      // 201 = created, 405 = already exists
      return response.ok || response.status === 405;
    } catch (error) {
      console.error('Error creating directory:', error);
      return false;
    }
  }
  
  /**
   * Upload audio file to Nextcloud with progress tracking
   */
  async uploadAudioFile(
    file: File, 
    filename: string, 
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Ensure audio directory exists
      await this.createDirectory('audio');
      
      const uploadPath = `audio/${filename}`;
      const uploadUrl = `${this.webdavUrl}/${uploadPath}`;
      
      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(Math.round(progress));
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              success: true,
              url: `${this.baseUrl}/remote.php/dav/files/${this.username}/${uploadPath}`
            });
          } else {
            resolve({
              success: false,
              error: `Upload failed with status ${xhr.status}`
            });
          }
        });
        
        xhr.addEventListener('error', () => {
          resolve({
            success: false,
            error: 'Network error during upload'
          });
        });
        
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Authorization', `Basic ${btoa(`${this.username}:${this.password}`)}`);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.send(file);
      });
      
    } catch (error) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Create a public share for a file
   */
  async createPublicShare(filepath: string): Promise<{ success: boolean; shareUrl?: string; error?: string }> {
    try {
      const shareData = new URLSearchParams({
        'shareType': '3', // Public link
        'path': filepath,
        'permissions': '1' // Read only
      });
      
      const response = await fetch(`${this.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${this.password}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'OCS-APIRequest': 'true'
        },
        body: shareData
      });
      
      if (!response.ok) {
        throw new Error(`Share creation failed: ${response.status}`);
      }
      
      const responseText = await response.text();
      
      // Parse XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(responseText, 'text/xml');
      const urlElement = xmlDoc.querySelector('url');
      
      if (urlElement?.textContent) {
        return {
          success: true,
          shareUrl: urlElement.textContent
        };
      } else {
        throw new Error('No share URL in response');
      }
      
    } catch (error) {
      console.error('Error creating public share:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get direct download URL for public share
   */
  getDirectDownloadUrl(shareUrl: string): string {
    // Convert share URL to direct download URL
    return shareUrl + '/download';
  }
  
  /**
   * Complete upload workflow: upload file and create public share
   */
  async uploadAndShare(
    file: File, 
    filename: string, 
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      // Upload file
      const uploadResult = await this.uploadAudioFile(file, filename, (progress) => {
        // Reserve 80% for upload, 20% for share creation
        onProgress?.(progress * 0.8);
      });
      
      if (!uploadResult.success) {
        return uploadResult;
      }
      
      onProgress?.(85);
      
      // Create public share
      const shareResult = await this.createPublicShare(`/audio/${filename}`);
      
      if (!shareResult.success) {
        return {
          success: false,
          error: `Upload succeeded but sharing failed: ${shareResult.error}`
        };
      }
      
      onProgress?.(100);
      
      return {
        success: true,
        downloadUrl: this.getDirectDownloadUrl(shareResult.shareUrl!)
      };
      
    } catch (error) {
      console.error('Error in upload and share workflow:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
