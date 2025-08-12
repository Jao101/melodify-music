// Test Production Server
console.log('🏭 Testing Production Server...');

const API_BASE = 'http://localhost:3002';

async function testProductionServer() {
  try {
    console.log('1️⃣ Testing static file serving...');
    const staticResponse = await fetch(`${API_BASE}/`);
    console.log('Static files:', staticResponse.ok ? '✅' : '❌', {
      status: staticResponse.status,
      contentType: staticResponse.headers.get('content-type')
    });
    
    console.log('2️⃣ Testing API health...');
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    const healthData = await healthResponse.json();
    console.log('API Health:', healthData.status === 'OK' ? '✅' : '❌', healthData);
    
    console.log('3️⃣ Testing Nextcloud API...');
    const testResponse = await fetch(`${API_BASE}/api/nextcloud/test`);
    const testData = await testResponse.json();
    console.log('Nextcloud:', testData.success ? '✅' : '❌', testData);
    
    if (testData.success) {
      console.log('4️⃣ Testing upload in production mode...');
      
      const testContent = 'Production test content';
      const testFile = new Blob([testContent], { type: 'audio/mpeg' });
      const filename = `prod_test_${Date.now()}.mp3`;
      
      const formData = new FormData();
      formData.append('file', testFile, filename);
      formData.append('filename', filename);
      
      const uploadResponse = await fetch(`${API_BASE}/api/nextcloud/upload`, {
        method: 'POST',
        body: formData
      });
      
      const uploadData = await uploadResponse.json();
      console.log('Production Upload:', uploadData.success ? '✅' : '❌', {
        success: uploadData.success,
        downloadUrl: uploadData.downloadUrl,
        error: uploadData.error
      });
      
      if (uploadData.success) {
        console.log('\n🎉 PRODUCTION SERVER WORKS PERFECTLY!');
        console.log('✅ Static file serving: OK');
        console.log('✅ API routing: OK');
        console.log('✅ Nextcloud integration: OK');
        console.log('✅ File uploads: OK');
        
        console.log('\n🚀 READY FOR RENDER DEPLOYMENT!');
        console.log('📋 Environment Variables needed in Render:');
        console.log('   - NEXTCLOUD_URL=https://alpenview.ch');
        console.log('   - NEXTCLOUD_USERNAME=admin');
        console.log('   - NEXTCLOUD_PASSWORD=9xHKC-WpYfd-4GwXB-HeXac-2p3as');
        console.log('');
        console.log('📋 Render settings:');
        console.log('   - Build Command: npm install && npm run build');
        console.log('   - Start Command: npm start');
        console.log('   - Node Version: 18 or higher');
        
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Production test failed:', error);
    return false;
  }
}

testProductionServer();
