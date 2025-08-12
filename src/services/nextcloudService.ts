export class NextcloudService {
  private baseUrl: string;
  private username: string;
  private password: string;
  private webdavUrl: string;
  
  constructor() {
    this.baseUrl = import.meta.env.VITE_NEXTCLOUD_BASE_URL || 'https://alpenview.ch';
    this.username = import.meta.env.VITE_NEXTCLOUD_USERNAME || 'admin';
    this.password = import.meta.env.VITE_NEXTCLOUD_PASSWORD || '9xHKC-WpYfd-4GwXB-HeXac-2p3as';
    this.webdavUrl = `${this.baseUrl}/remote.php/dav/files/${this.username}`;
    
    console.log('🔧 NextcloudService initialized');
  }
  
  async createDirectory(path: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.webdavUrl}/${path}/`, {
        method: 'MKCOL',
        headers: {
          'Authorization': `Basic ${btoa(`${this.username}:${this.password}`)}`
        }
      });
      return response.ok || response.status === 405;
    } catch (error) {
      console.error('Error creating directory:', error);
      return false;
    }
  }
  
  async uploadAndShare(
    file: File, 
    filename: string, 
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      console.log('📤 Starting Nextcloud upload:', filename);
      
      await this.createDirectory('audio');
      
      const uploadPath = `audio/${filename}`;
      const uploadUrl = `${this.webdavUrl}/${uploadPath}`;
      
      const uploadResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = (event.loaded / event.total) * 80;
            onProgress(Math.round(progress));
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: `HTTP ${xhr.status}` });
          }
        });
        
        xhr.addEventListener('error', () => {
          resolve({ success: false, error: 'Network error' });
        });
        
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Authorization', `Basic ${btoa(`${this.username}:${this.password}`)}`);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.send(file);
      });
      
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }
      
      onProgress?.(85);
      
      const shareResult = await this.createPublicShare(`/audio/${filename}`);
      
      if (!shareResult.success) {
        return { success: false, error: shareResult.error };
      }
      
      onProgress?.(100);
      
      const downloadUrl = shareResult.shareUrl + '/download';
      
      return { success: true, downloadUrl };
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  async createPublicShare(filepath: string): Promise<{ success: boolean; shareUrl?: string; error?: string }> {
    try {
      const shareData = new URLSearchParams({
        'shareType': '3',
        'path': filepath,
        'permissions': '1'
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
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(responseText, 'text/xml');
      const urlElement = xmlDoc.querySelector('url');
      
      if (urlElement?.textContent) {
        return { success: true, shareUrl: urlElement.textContent };
      } else {
        throw new Error('No share URL in response');
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
