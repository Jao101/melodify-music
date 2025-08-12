// Debug test für Nextcloud Upload Problem
async function debugNextcloudUpload() {
  console.log('🔍 Debugging Nextcloud Upload Issue...');
  
  // Test environment variables
  console.log('🔧 Environment Variables:');
  console.log('BASE_URL:', import.meta?.env?.VITE_NEXTCLOUD_BASE_URL || 'https://alpenview.ch');
  console.log('USERNAME:', import.meta?.env?.VITE_NEXTCLOUD_USERNAME || 'admin');
  console.log('PASSWORD:', import.meta?.env?.VITE_NEXTCLOUD_PASSWORD ? '[SET]' : '[MISSING]');
  
  // Test basic WebDAV connection
  console.log('\n🔗 Testing WebDAV Connection...');
  const baseUrl = 'https://alpenview.ch';
  const username = 'admin';
  const password = '9xHKC-WpYfd-4GwXB-HeXac-2p3as';
  
  try {
    const response = await fetch(`${baseUrl}/remote.php/dav/files/${username}/`, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
        'Depth': '1',
        'Content-Type': 'text/xml'
      }
    });
    
    console.log('✅ WebDAV Status:', response.status);
    
    if (response.ok) {
      // Test directory creation
      console.log('\n📁 Testing Directory Creation...');
      const dirResponse = await fetch(`${baseUrl}/remote.php/dav/files/${username}/audio/`, {
        method: 'MKCOL',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`
        }
      });
      
      console.log('📁 Directory Status:', dirResponse.status, dirResponse.status === 405 ? '(already exists)' : '');
      
      // Test small file upload
      console.log('\n📤 Testing File Upload...');
      const testData = 'test audio content for upload test';
      const testBlob = new Blob([testData], { type: 'audio/mpeg' });
      const testFile = new File([testBlob], 'debug-test.mp3', { type: 'audio/mpeg' });
      
      const filename = `debug_test_${Date.now()}.mp3`;
      const uploadUrl = `${baseUrl}/remote.php/dav/files/${username}/audio/${filename}`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
          'Content-Type': 'application/octet-stream'
        },
        body: testFile
      });
      
      console.log('📤 Upload Status:', uploadResponse.status);
      
      if (uploadResponse.ok) {
        console.log('✅ Upload successful!');
        
        // Test public share creation
        console.log('\n🔗 Testing Public Share...');
        const shareData = new URLSearchParams({
          'shareType': '3',
          'path': `/audio/${filename}`,
          'permissions': '1'
        });
        
        const shareResponse = await fetch(`${baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'OCS-APIRequest': 'true'
          },
          body: shareData
        });
        
        console.log('🔗 Share Status:', shareResponse.status);
        
        if (shareResponse.ok) {
          const responseText = await shareResponse.text();
          console.log('✅ Share Response:', responseText.substring(0, 200) + '...');
          
          // Parse share URL
          try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(responseText, 'text/xml');
            const urlElement = xmlDoc.querySelector('url');
            
            if (urlElement?.textContent) {
              const shareUrl = urlElement.textContent;
              const downloadUrl = shareUrl + '/download';
              console.log('🔗 Share URL:', shareUrl);
              console.log('📥 Download URL:', downloadUrl);
              
              // Test download
              console.log('\n📥 Testing Download...');
              const downloadResponse = await fetch(downloadUrl);
              console.log('📥 Download Status:', downloadResponse.status);
              
              if (downloadResponse.ok) {
                const content = await downloadResponse.text();
                console.log('✅ Downloaded content:', content === testData ? 'MATCHES!' : 'MISMATCH');
              }
            }
          } catch (parseError) {
            console.error('❌ Parse Error:', parseError);
          }
        } else {
          console.error('❌ Share failed:', await shareResponse.text());
        }
      } else {
        console.error('❌ Upload failed:', await uploadResponse.text());
      }
    } else {
      console.error('❌ WebDAV connection failed:', await response.text());
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

// Run in browser console
console.log('🚀 Starting Nextcloud Debug Test...');
debugNextcloudUpload().then(() => {
  console.log('🏁 Debug test completed!');
});
