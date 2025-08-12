// Test Nextcloud Upload Integration
console.log('🔧 Testing Nextcloud Upload Integration...');

// Test API connectivity
async function testNextcloudUpload() {
  try {
    console.log('📡 Testing backend API connection...');
    
    const response = await fetch('http://localhost:3001/api/nextcloud-upload', {
      method: 'POST',
      body: new FormData() // Empty test
    });
    
    const result = await response.text();
    console.log('📋 API Response:', result);
    
    if (response.status === 400) {
      console.log('✅ API is running and responding correctly (expects file)');
    } else {
      console.log('⚠️ Unexpected response:', response.status);
    }
    
  } catch (error) {
    console.error('❌ API Connection failed:', error.message);
  }
}

// Test with dummy file
async function testWithDummyFile() {
  try {
    console.log('🎵 Testing with dummy MP3 file...');
    
    // Create a small dummy file
    const dummyContent = new Uint8Array([
      0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 // ID3 header
    ]);
    const dummyFile = new File([dummyContent], 'test.mp3', { type: 'audio/mpeg' });
    
    const formData = new FormData();
    formData.append('file', dummyFile);
    formData.append('filename', 'test-upload.mp3');
    
    const response = await fetch('http://localhost:3001/api/nextcloud-upload', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('🎯 Upload Result:', result);
    
    if (result.success) {
      console.log('✅ Upload successful! Download URL:', result.downloadUrl);
    } else {
      console.log('❌ Upload failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Upload test failed:', error.message);
  }
}

// Run tests
testNextcloudUpload();
setTimeout(testWithDummyFile, 2000);
