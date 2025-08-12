// Backend API für Nextcloud Upload - umgeht CORS
const express = require('express');
const multer = require('multer');
const axios = require('axios');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.post('/api/nextcloud-upload', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Backend: Nextcloud upload request received');
    
    const { filename, baseUrl = 'https://alpenview.ch', username = 'admin', password = '9xHKC-WpYfd-4GwXB-HeXac-2p3as' } = req.body;
    const file = req.file;
    
    if (!file || !filename) {
      return res.status(400).json({ 
        success: false, 
        error: 'File and filename required' 
      });
    }
    
    const webdavUrl = `${baseUrl}/remote.php/dav/files/${username}`;
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    // 1. Create directory
    try {
      await axios({
        method: 'MKCOL',
        url: `${webdavUrl}/audio/`,
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });
    } catch (error) {
      // Directory might already exist
      console.log('Directory creation response:', error.response?.status);
    }
    
    // 2. Upload file
    const uploadUrl = `${webdavUrl}/audio/${filename}`;
    const uploadResponse = await axios({
      method: 'PUT',
      url: uploadUrl,
      data: file.buffer,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/octet-stream'
      }
    });
    
    if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }
    
    console.log('✅ File uploaded successfully to Nextcloud');
    
    // 3. Create public share (simplified approach)
    try {
      const shareData = new URLSearchParams({
        'shareType': '3',
        'path': `/audio/${filename}`,
        'permissions': '1'
      });
      
      const shareResponse = await axios({
        method: 'POST',
        url: `${baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json`,
        data: shareData.toString(),
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'OCS-APIRequest': 'true',
          'Accept': 'application/json'
        }
      });
      
      console.log('📋 Share response status:', shareResponse.status);
      console.log('📋 Share response data:', JSON.stringify(shareResponse.data, null, 2));
      
      // Try to extract URL from JSON response
      let shareUrl = null;
      if (shareResponse.data && shareResponse.data.ocs && shareResponse.data.ocs.data && shareResponse.data.ocs.data.url) {
        shareUrl = shareResponse.data.ocs.data.url;
      }
      
      if (!shareUrl) {
        console.log('⚠️ No share URL found, using direct file access');
        // Fallback: Generate direct access URL
        shareUrl = `${baseUrl}/remote.php/dav/files/${username}/audio/${filename}`;
      }
      
      const downloadUrl = shareUrl + (shareUrl.includes('/s/') ? '/download' : '');
      
      console.log('✅ Backend: Upload successful', downloadUrl);
      
      res.json({
        success: true,
        downloadUrl
      });
      
    } catch (shareError) {
      console.warn('⚠️ Share creation failed, using direct access:', shareError.message);
      
      // Fallback to direct file access
      const directUrl = `${baseUrl}/remote.php/dav/files/${username}/audio/${filename}`;
      
      res.json({
        success: true,
        downloadUrl: directUrl,
        warning: 'File uploaded but public share failed, using direct access'
      });
    }
    
  } catch (error) {
    console.error('❌ Backend upload error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Nextcloud Upload API running on port ${PORT}`);
});

module.exports = app;
