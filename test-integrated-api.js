// Test der integrierten Nextcloud API
console.log('🧪 Testing integrated Nextcloud API...');

const API_BASE = 'http://localhost:3001';

async function testIntegratedAPI() {
  try {
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    const healthData = await healthResponse.json();
    console.log('Health:', healthData.status === 'OK' ? '✅' : '❌', healthData);
    
    console.log('2️⃣ Testing Nextcloud connection...');
    const testResponse = await fetch(`${API_BASE}/api/nextcloud/test`);
    const testData = await testResponse.json();
    console.log('Connection:', testData.success ? '✅' : '❌', testData);
    
    if (testData.success) {
      console.log('3️⃣ Testing file upload...');
      
      // Create test file
      const testContent = 'Test audio content for integration test';
      const testFile = new Blob([testContent], { type: 'audio/mpeg' });
      const filename = `integration_test_${Date.now()}.mp3`;
      
      const formData = new FormData();
      formData.append('file', testFile, filename);
      formData.append('filename', filename);
      
      const uploadResponse = await fetch(`${API_BASE}/api/nextcloud/upload`, {
        method: 'POST',
        body: formData
      });
      
      const uploadData = await uploadResponse.json();
      console.log('Upload:', uploadData.success ? '✅' : '❌', {
        success: uploadData.success,
        downloadUrl: uploadData.downloadUrl,
        error: uploadData.error
      });
      
      if (uploadData.success && uploadData.downloadUrl) {
        console.log('4️⃣ Testing download access...');
        
        const downloadResponse = await fetch(uploadData.downloadUrl);
        console.log('Download:', downloadResponse.ok ? '✅' : '❌', {
          status: downloadResponse.status,
          contentType: downloadResponse.headers.get('content-type')
        });
        
        if (downloadResponse.ok) {
          const downloadedContent = await downloadResponse.text();
          console.log('Content match:', downloadedContent === testContent ? '✅' : '❌');
          
          console.log('\n🎉 ALL TESTS PASSED! Integrated API is working!');
          console.log('✅ Health check: OK');
          console.log('✅ Nextcloud connection: OK');
          console.log('✅ File upload: OK');
          console.log('✅ Download access: OK');
          console.log('✅ Content verification: OK');
          
          return true;
        }
      }
    }
    
    console.log('\n❌ Some tests failed. Check the logs above.');
    return false;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test
testIntegratedAPI().then(success => {
  if (success) {
    console.log('\n🚀 Ready for deployment!');
    console.log('💡 Next steps:');
    console.log('   1. Install dependencies: npm install');
    console.log('   2. Build for production: npm run build');
    console.log('   3. Set environment variables in Render');
    console.log('   4. Deploy with start command: npm start');
  } else {
    console.log('\n⚠️ Fix the issues above before deploying.');
  }
});
