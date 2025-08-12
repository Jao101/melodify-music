import { NextcloudService } from './src/services/nextcloudService.js';

async function testNextcloudUpload() {
  console.log('🔗 Testing Nextcloud Upload Integration...');
  
  try {
    const nextcloud = new NextcloudService();
    
    // Create a small test audio file (mock)
    const testData = new ArrayBuffer(1024); // 1KB test file
    const testFile = new File([testData], 'test-audio.mp3', { type: 'audio/mpeg' });
    
    console.log('📤 Starting upload test...');
    
    const result = await nextcloud.uploadAndShare(
      testFile,
      `test_${Date.now()}.mp3`,
      (progress) => {
        console.log(`📊 Progress: ${progress}%`);
      }
    );
    
    if (result.success) {
      console.log('✅ Upload successful!');
      console.log('🔗 Download URL:', result.downloadUrl);
      
      // Test the download URL
      console.log('🔍 Testing download URL...');
      const testResponse = await fetch(result.downloadUrl);
      console.log('📊 Download test status:', testResponse.status);
      
    } else {
      console.error('❌ Upload failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNextcloudUpload();
