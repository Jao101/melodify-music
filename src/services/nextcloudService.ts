export class NextcloudService {
  private apiUrl: string;
  
  constructor() {
    // Use relative path in production, backend API URL in development
    this.apiUrl = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || '');
    console.log('🔧 NextcloudService initialized - API URL:', this.apiUrl || 'relative');
  }
  
  async uploadAndShare(
    file: File, 
    filename: string, 
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      console.log('📤 Starting Nextcloud upload via API:', filename);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', filename);
      
      onProgress?.(10);
      
      const response = await fetch(`${this.apiUrl}/api/nextcloud/upload`, {
        method: 'POST',
        body: formData
      });
      
      onProgress?.(90);
      
      const result = await response.json();
      
      onProgress?.(100);
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
      
      console.log('✅ Upload successful:', result.downloadUrl);
      
      return {
        success: true,
        downloadUrl: result.downloadUrl
      };
      
    } catch (error) {
      console.error('❌ Upload failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Test connection to API
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/api/nextcloud/test`);
      const result = await response.json();
      
      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }
}
