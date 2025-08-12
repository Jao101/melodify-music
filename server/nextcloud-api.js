// Nextcloud API Server für Production
import express from 'express';
import multer from 'multer';
import cors from 'cors';

const app = express();
const upload = multer();

// CORS für alle Origins erlauben (in Production anpassen)
app.use(cors());
app.use(express.json());

// Nextcloud Konfiguration aus Environment Variables
const nextcloudConfig = {
  baseUrl: process.env.NEXTCLOUD_URL || 'https://alpenview.ch',
  username: process.env.NEXTCLOUD_USERNAME || 'admin',
  password: process.env.NEXTCLOUD_PASSWORD || '9xHKC-WpYfd-4GwXB-HeXac-2p3as'
};

// Nextcloud Upload Endpoint
app.post('/api/nextcloud/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Nextcloud upload request received');
    
    const { file } = req;
    const { filename } = req.body;
    
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }
    
    const auth = Buffer.from(`${nextcloudConfig.username}:${nextcloudConfig.password}`).toString('base64');
    
    console.log('📁 Creating audio directory...');
    // 1. Create directory (ignore if exists)
    await fetch(`${nextcloudConfig.baseUrl}/remote.php/dav/files/${nextcloudConfig.username}/audio/`, {
      method: 'MKCOL',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });
    
    console.log('⬆️ Uploading file to Nextcloud...');
    // 2. Upload file
    const uploadUrl = `${nextcloudConfig.baseUrl}/remote.php/dav/files/${nextcloudConfig.username}/audio/${filename}`;
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/octet-stream'
      },
      body: file.buffer
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }
    
    console.log('🔗 Creating public share...');
    // 3. Create public share
    const shareData = new URLSearchParams({
      'shareType': '3',
      'path': `/audio/${filename}`,
      'permissions': '1'
    });
    
    const shareResponse = await fetch(`${nextcloudConfig.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'OCS-APIRequest': 'true'
      },
      body: shareData
    });
    
    if (!shareResponse.ok) {
      throw new Error(`Share creation failed: ${shareResponse.status} ${shareResponse.statusText}`);
    }
    
    const shareText = await shareResponse.text();
    console.log('📋 Share response preview:', shareText.substring(0, 200));
    
    // Parse XML response to get share URL
    let shareUrl, downloadUrl;
    
    // Extract URL from XML response using regex (simple approach)
    const urlMatch = shareText.match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
    if (urlMatch) {
      shareUrl = urlMatch[1];
      downloadUrl = shareUrl + '/download';
    } else {
      // Try alternative XML format
      const altMatch = shareText.match(/<url>(.*?)<\/url>/);
      if (altMatch) {
        shareUrl = altMatch[1];
        downloadUrl = shareUrl + '/download';
      } else {
        throw new Error('Could not extract share URL from response');
      }
    }
    
    console.log('✅ Upload successful!');
    console.log('🔗 Download URL:', downloadUrl);
    
    res.json({ 
      success: true, 
      downloadUrl,
      shareUrl,
      filename 
    });
    
  } catch (error) {
    console.error('❌ Nextcloud upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'Nextcloud API' });
});

// Test endpoint
app.get('/api/nextcloud/test', async (req, res) => {
  try {
    const auth = Buffer.from(`${nextcloudConfig.username}:${nextcloudConfig.password}`).toString('base64');
    
    const response = await fetch(`${nextcloudConfig.baseUrl}/remote.php/dav/files/${nextcloudConfig.username}/`, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Depth': '1'
      }
    });
    
    res.json({ 
      success: response.ok,
      status: response.status,
      connected: response.ok 
    });
    
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default app;
