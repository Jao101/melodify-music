export class NextcloudService {
  private apiUrl: string;
  
  constructor() {
    // Use backend API to bypass CORS
    this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    console.log('🔧 NextcloudService initialized - Backend API mode');
  }
  
  async uploadAndShare(
    file: File, 
    filename: string, 
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
    try {
      console.log('📤 Starting Nextcloud upload via backend API:', filename);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', filename);
      
      onProgress?.(10);
      
      const response = await fetch(`${this.apiUrl}/api/nextcloud-upload`, {
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
}
