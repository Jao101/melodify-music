async function testConnection() {
  console.log('🔗 Testing Nextcloud connection...');
  
  try {
    // Test WebDAV connection by listing root directory
    console.log('📁 Checking WebDAV access...');
    
    const response = await fetch('https://alpenview.ch/remote.php/dav/files/admin/', {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${btoa('admin:9xHKC-WpYfd-4GwXB-HeXac-2p3as')}`,
        'Depth': '1',
        'Content-Type': 'text/xml'
      }
    });
    
    if (response.ok) {
      console.log('✅ WebDAV connection successful!');
      console.log('📊 Status:', response.status);
      
      const content = await response.text();
      console.log('📂 Directory listing preview:');
      console.log(content.substring(0, 500) + '...');
      
      // Test creating audio directory
      console.log('\n📂 Creating audio directory...');
      const createResponse = await fetch('https://alpenview.ch/remote.php/dav/files/admin/audio/', {
        method: 'MKCOL',
        headers: {
          'Authorization': `Basic ${btoa('admin:9xHKC-WpYfd-4GwXB-HeXac-2p3as')}`
        }
      });
      
      if (createResponse.ok || createResponse.status === 405) {
        console.log('✅ Audio directory ready! (Status:', createResponse.status, ')');
      } else {
        console.log('⚠️  Directory creation status:', createResponse.status);
      }
      
    } else {
      console.error('❌ WebDAV connection failed:', response.status);
      console.error('Error:', await response.text());
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

testConnection();
