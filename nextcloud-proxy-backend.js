// Backend-Proxy für Nextcloud (Node.js/Express)
import express from 'express';
import fetch from 'node-fetch';
import multer from 'multer';

const app = express();
const upload = multer();

// Nextcloud Proxy Endpoint
app.post('/api/nextcloud/upload', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    const { filename } = req.body;
    
    const nextcloudConfig = {
      baseUrl: 'https://alpenview.ch',
      username: 'admin',
      password: '9xHKC-WpYfd-4GwXB-HeXac-2p3as'
    };
    
    // 1. Create directory
    await fetch(`${nextcloudConfig.baseUrl}/remote.php/dav/files/${nextcloudConfig.username}/audio/`, {
      method: 'MKCOL',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${nextcloudConfig.username}:${nextcloudConfig.password}`).toString('base64')}`
      }
    });
    
    // 2. Upload file
    const uploadUrl = `${nextcloudConfig.baseUrl}/remote.php/dav/files/${nextcloudConfig.username}/audio/${filename}`;
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${nextcloudConfig.username}:${nextcloudConfig.password}`).toString('base64')}`,
        'Content-Type': 'application/octet-stream'
      },
      body: file.buffer
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }
    
    // 3. Create public share
    const shareData = new URLSearchParams({
      'shareType': '3',
      'path': `/audio/${filename}`,
      'permissions': '1'
    });
    
    const shareResponse = await fetch(`${nextcloudConfig.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${nextcloudConfig.username}:${nextcloudConfig.password}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'OCS-APIRequest': 'true'
      },
      body: shareData
    });
    
    const shareText = await shareResponse.text();
    // Parse XML and extract URL...
    
    res.json({ success: true, downloadUrl: 'parsed_download_url' });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;
