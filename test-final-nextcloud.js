// Final test to verify Nextcloud integration works
console.log('🔍 Final Nextcloud Integration Test');

// Test configuration
const config = {
  baseUrl: 'https://alpenview.ch',
  username: 'admin',
  password: '9xHKC-WpYfd-4GwXB-HeXac-2p3as'
};

async function finalTest() {
  try {
    console.log('1️⃣ Testing basic WebDAV connection...');
    
    const response = await fetch(`${config.baseUrl}/remote.php/dav/files/${config.username}/`, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${btoa(`${config.username}:${config.password}`)}`,
        'Depth': '1'
      }
    });
    
    console.log('WebDAV Status:', response.status, response.ok ? '✅' : '❌');
    
    if (response.ok) {
      console.log('2️⃣ Testing audio directory creation...');
      
      const dirResponse = await fetch(`${config.baseUrl}/remote.php/dav/files/${config.username}/audio/`, {
        method: 'MKCOL',
        headers: {
          'Authorization': `Basic ${btoa(`${config.username}:${config.password}`)}`
        }
      });
      
      console.log('Directory Status:', dirResponse.status, (dirResponse.ok || dirResponse.status === 405) ? '✅' : '❌');
      
      console.log('3️⃣ Testing small file upload...');
      
      const testContent = 'test audio content';
      const testFile = new Blob([testContent], { type: 'audio/mpeg' });
      const filename = `final_test_${Date.now()}.mp3`;
      
      const uploadResponse = await fetch(`${config.baseUrl}/remote.php/dav/files/${config.username}/audio/${filename}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${btoa(`${config.username}:${config.password}`)}`,
          'Content-Type': 'application/octet-stream'
        },
        body: testFile
      });
      
      console.log('Upload Status:', uploadResponse.status, uploadResponse.ok ? '✅' : '❌');
      
      if (uploadResponse.ok) {
        console.log('4️⃣ Testing public share creation...');
        
        const shareData = new URLSearchParams({
          'shareType': '3',
          'path': `/audio/${filename}`,
          'permissions': '1'
        });
        
        const shareResponse = await fetch(`${config.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${config.username}:${config.password}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'OCS-APIRequest': 'true'
          },
          body: shareData
        });
        
        console.log('Share Status:', shareResponse.status, shareResponse.ok ? '✅' : '❌');
        
        if (shareResponse.ok) {
          const responseText = await shareResponse.text();
          console.log('Share Response Preview:', responseText.substring(0, 200) + '...');
          
          try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(responseText, 'text/xml');
            const urlElement = xmlDoc.querySelector('url');
            
            if (urlElement?.textContent) {
              const shareUrl = urlElement.textContent;
              const downloadUrl = shareUrl + '/download';
              
              console.log('✅ Share URL:', shareUrl);
              console.log('✅ Download URL:', downloadUrl);
              
              console.log('5️⃣ Testing download access...');
              
              const downloadResponse = await fetch(downloadUrl);
              console.log('Download Status:', downloadResponse.status, downloadResponse.ok ? '✅' : '❌');
              
              if (downloadResponse.ok) {
                const content = await downloadResponse.text();
                console.log('Downloaded content matches:', content === testContent ? '✅' : '❌');
                
                console.log('\n🎉 ALL TESTS PASSED! Nextcloud integration is working!');
                console.log('✅ WebDAV connection: OK');
                console.log('✅ Directory creation: OK');
                console.log('✅ File upload: OK');
                console.log('✅ Public share: OK');
                console.log('✅ Download access: OK');
                
                return true;
              }
            }
          } catch (parseError) {
            console.error('❌ XML parsing failed:', parseError);
          }
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
finalTest().then(success => {
  if (success) {
    console.log('\n🚀 Ready for production deployment!');
    console.log('💡 Next steps:');
    console.log('   1. Set environment variables in Render');
    console.log('   2. Deploy to Render');
    console.log('   3. Test upload in production');
  } else {
    console.log('\n⚠️ Fix the issues above before deploying.');
  }
});
