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

// Rate Limiting und Queue System
class UploadQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = 1; // Nur 1 gleichzeitiger Upload (konservativer)
    this.delayBetweenUploads = 2000; // 2 Sekunden Pause zwischen Uploads
    this.retryAttempts = 3;
    this.activeUploads = 0;
    this.retryDelay = 5000; // 5 Sekunden base retry delay
  }

  async addToQueue(uploadTask) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task: uploadTask,
        resolve,
        reject,
        attempts: 0
      });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0 || this.activeUploads >= this.maxConcurrent) {
      return;
    }

    this.processing = true;
    
    while (this.queue.length > 0 && this.activeUploads < this.maxConcurrent) {
      const item = this.queue.shift();
      this.activeUploads++;
      
      this.executeUpload(item);
      
      // Delay zwischen Uploads
      if (this.queue.length > 0) {
        await this.delay(this.delayBetweenUploads);
      }
    }
    
    this.processing = false;
  }

  async executeUpload(item) {
    try {
      const result = await item.task();
      item.resolve(result);
    } catch (error) {
      item.attempts++;
      
      if (item.attempts < this.retryAttempts && (error.message.includes('429') || error.message.includes('too many'))) {
        console.log(`🔄 Retry attempt ${item.attempts} for upload after rate limit (waiting ${this.retryDelay * item.attempts}ms)`);
        // Exponential backoff: 5s, 10s, 15s
        await this.delay(this.retryDelay * item.attempts);
        this.queue.unshift(item); // Zurück an den Anfang der Queue
      } else {
        console.log(`❌ Upload failed after ${item.attempts} attempts:`, error.message);
        item.reject(error);
      }
    } finally {
      this.activeUploads--;
      // Continue processing queue with delay
      setTimeout(() => this.processQueue(), this.delayBetweenUploads);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Globale Upload Queue
const uploadQueue = new UploadQueue();

// Nextcloud Upload Endpoint mit Queue
app.post('/api/nextcloud/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Nextcloud upload request received - adding to queue');
    
    const { file } = req;
    const { filename } = req.body;
    
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    // Upload Task für die Queue
    const uploadTask = async () => {
      return await performNextcloudUpload(file, filename);
    };

    // Upload zur Queue hinzufügen
    const result = await uploadQueue.addToQueue(uploadTask);
    
    console.log('✅ Upload completed from queue:', result.downloadUrl);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Queued upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Separate Funktion für den eigentlichen Upload
async function performNextcloudUpload(file, filename) {
  const auth = Buffer.from(`${nextcloudConfig.username}:${nextcloudConfig.password}`).toString('base64');
  
  console.log('📁 Creating audio directory...');
  // 1. Create directory (ignore if exists)
  const dirResponse = await fetch(`${nextcloudConfig.baseUrl}/remote.php/dav/files/${nextcloudConfig.username}/audio/`, {
    method: 'MKCOL',
    headers: {
      'Authorization': `Basic ${auth}`
    }
  });
  
  // Check for rate limiting on directory creation
  if (dirResponse.status === 429) {
    throw new Error('Rate limited by Nextcloud - too many requests');
  }
  
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
  
  // Check for rate limiting on upload
  if (uploadResponse.status === 429) {
    throw new Error('Rate limited by Nextcloud - too many requests');
  }
  
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
  
  // Check for rate limiting on share creation
  if (shareResponse.status === 429) {
    throw new Error('Rate limited by Nextcloud - too many requests');
  }
  
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
  
  return { 
    success: true, 
    downloadUrl,
    shareUrl,
    filename 
  };
}

// Queue Status endpoint
app.get('/api/nextcloud/queue-status', (req, res) => {
  res.json({
    queueLength: uploadQueue.queue.length,
    activeUploads: uploadQueue.activeUploads,
    maxConcurrent: uploadQueue.maxConcurrent,
    isProcessing: uploadQueue.processing
  });
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
