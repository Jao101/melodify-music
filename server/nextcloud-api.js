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
    const { filename, userId } = req.body;
    
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    // Upload Task für die Queue
    const uploadTask = async () => {
      return await performNextcloudUpload(file, filename, userId);
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
async function performNextcloudUpload(file, filename, userId) {
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
  
  // Ensure per-user subfolder if provided
  let userSubdir = '';
  if (userId && typeof userId === 'string') {
    userSubdir = `${userId.replaceAll('..','_').replaceAll('/', '_')}/`;
    console.log('📁 Ensuring user subdirectory:', userSubdir);
    const userDirUrl = `${nextcloudConfig.baseUrl}/remote.php/dav/files/${nextcloudConfig.username}/audio/${encodeURIComponent(userSubdir.replace(/\/$/, ''))}/`;
    await fetch(userDirUrl, {
      method: 'MKCOL',
      headers: { 'Authorization': `Basic ${auth}` }
    });
  }

  console.log('⬆️ Uploading file to Nextcloud...');
  // 2. Upload file
  const encodedFile = encodeURIComponent(filename);
  const uploadUrl = `${nextcloudConfig.baseUrl}/remote.php/dav/files/${nextcloudConfig.username}/audio/${userSubdir}${encodedFile}`
    .replace(/\+/g, '%20');
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
  const sharePath = `/audio/${userSubdir}${filename}`;
  const shareData = new URLSearchParams({
    'shareType': '3',
    'path': sharePath,
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

// Nextcloud Delete Endpoint (supports nested paths under /audio via :path(*))
app.delete('/api/nextcloud/delete/:path(*)', async (req, res) => {
  try {
    console.log('🗑️ Nextcloud delete request received');
    
    const { path } = req.params;
    
    if (!path) {
      return res.status(400).json({ success: false, error: 'No path provided' });
    }

    const result = await performNextcloudDelete(path);
    
    console.log('✅ Delete completed:', path);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Nextcloud Delete by URL Endpoint
app.post('/api/nextcloud/delete-by-url', async (req, res) => {
  try {
    console.log('🗑️ Nextcloud delete-by-url request received');
    
    const { fileUrl } = req.body;
    
    if (!fileUrl) {
      return res.status(400).json({ success: false, error: 'No fileUrl provided' });
    }

    const result = await performNextcloudDeleteByUrl(fileUrl);
    
    console.log('✅ Delete by URL completed:', fileUrl);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Delete by URL error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Nextcloud Delete by URL via HTTP DELETE (preferred for REST semantics)
app.delete('/api/nextcloud/delete-by-url', async (req, res) => {
  try {
    console.log('🗑️ Nextcloud delete-by-url (DELETE) request received');
    
    // Accept fileUrl via query string primarily; fallback to body for clients that send it
    const fileUrl = req.query.fileUrl || req.body?.fileUrl;
    
    if (!fileUrl || typeof fileUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'No fileUrl provided' });
    }

    const result = await performNextcloudDeleteByUrl(fileUrl);
    
    console.log('✅ Delete by URL (DELETE) completed:', fileUrl);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Delete by URL (DELETE) error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Separate Funktion für das Löschen über URL
async function performNextcloudDeleteByUrl(fileUrl) {
  const auth = Buffer.from(`${nextcloudConfig.username}:${nextcloudConfig.password}`).toString('base64');
  
  console.log('🗑️ Deleting file from Nextcloud by URL:', fileUrl);
  
  // Extract share ID from URL (e.g., from https://alpenview.ch/s/Yb9wW4a2dZBetCM/download)
  const shareIdMatch = fileUrl.match(/\/s\/([^\/]+)/);
  if (!shareIdMatch) {
    throw new Error('Could not extract share ID from URL');
  }
  
  const shareId = shareIdMatch[1];
  console.log('🔍 Extracted share ID:', shareId);
  
  // Get share information to find the file path
  console.log('🔍 Getting share information...');
  const shareInfoUrl = `${nextcloudConfig.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares/${shareId}`;
  
  const shareInfoResponse = await fetch(shareInfoUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'OCS-APIRequest': 'true',
      'Accept': 'application/json'
    }
  });
  
  if (!shareInfoResponse.ok) {
    if (shareInfoResponse.status === 404) {
      console.log('⚠️ Share not found (already deleted):', shareId);
      return { 
        success: true, 
        message: 'Share not found (already deleted)',
        shareId 
      };
    }
    throw new Error(`Failed to get share info: ${shareInfoResponse.status} ${shareInfoResponse.statusText}`);
  }
  
  const shareData = await shareInfoResponse.json();
  const filePath = shareData.ocs?.data?.path;
  
  if (!filePath) {
    throw new Error('Could not determine file path from share information');
  }
  
  console.log('🔍 File path from share:', filePath);
  
  // Delete the actual file using WebDAV DELETE
  const deleteUrl = `${nextcloudConfig.baseUrl}/remote.php/dav/files/${nextcloudConfig.username}${filePath}`;
  console.log('🗑️ Sending WebDAV DELETE request to:', deleteUrl);
  
  const deleteResponse = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      'Authorization': `Basic ${auth}`
    }
  });
  
  // Check for rate limiting
  if (deleteResponse.status === 429) {
    throw new Error('Rate limited by Nextcloud - too many requests');
  }
  
  // Successful deletion returns 204 (No Content) - file moved to trash
  if (deleteResponse.status === 204) {
    console.log('✅ File successfully moved to trash via WebDAV DELETE!');
    return { 
      success: true, 
      message: 'File moved to trash successfully',
      filePath,
      shareId
    };
  }
  
  // Check if file already doesn't exist (404)
  if (deleteResponse.status === 404) {
    console.log('⚠️ File not found in Nextcloud (already deleted):', filePath);
    return { 
      success: true, 
      message: 'File not found (already deleted)',
      filePath,
      shareId
    };
  }
  
  // Any other status is an error
  const responseText = await deleteResponse.text();
  throw new Error(`WebDAV DELETE failed: ${deleteResponse.status} ${deleteResponse.statusText} - ${responseText}`);
}

// Separate Funktion für das eigentliche Löschen
async function performNextcloudDelete(pathSegment) {
  const auth = Buffer.from(`${nextcloudConfig.username}:${nextcloudConfig.password}`).toString('base64');
  
  console.log('🗑️ Deleting file from Nextcloud:', pathSegment);
  
  // Encode each segment to preserve slashes in nested paths
  const encodedPath = pathSegment
    .split('/')
    .filter(Boolean)
    .map(s => encodeURIComponent(s))
    .join('/');

  // WebDAV DELETE-Anfrage an die Datei
  const deleteUrl = `${nextcloudConfig.baseUrl}/remote.php/dav/files/${nextcloudConfig.username}/audio/${encodedPath}`;
  const deleteResponse = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      'Authorization': `Basic ${auth}`
    }
  });
  
  // Check for rate limiting
  if (deleteResponse.status === 429) {
    throw new Error('Rate limited by Nextcloud - too many requests');
  }
  
  // Erfolgreiche Löschung wird mit 204 (No Content) bestätigt
  if (deleteResponse.status !== 204) {
    // Prüfen ob die Datei bereits nicht existiert (404)
    if (deleteResponse.status === 404) {
      console.log('⚠️ File not found in Nextcloud (already deleted):', pathSegment);
      return { 
        success: true, 
        message: 'File not found (already deleted)',
        path: pathSegment 
      };
    }
    
    throw new Error(`Delete failed: ${deleteResponse.status} ${deleteResponse.statusText}`);
  }
  
  console.log('✅ File successfully deleted from Nextcloud!');
  
  return { 
    success: true, 
    message: 'File deleted successfully',
    path: pathSegment 
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

// List files in a user's audio folder and return public download links
app.get('/api/nextcloud/list', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const auth = Buffer.from(`${nextcloudConfig.username}:${nextcloudConfig.password}`).toString('base64');
    const basePath = `/audio/${userId}/`;
    const propfindUrl = `${nextcloudConfig.baseUrl}/remote.php/dav/files/${nextcloudConfig.username}${basePath}`;

    // Ensure directory exists (ignore errors)
    await fetch(propfindUrl, { method: 'MKCOL', headers: { 'Authorization': `Basic ${auth}` } });

    // WebDAV PROPFIND to list files
    const propfindRes = await fetch(propfindUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Depth': '1'
      }
    });

    if (!propfindRes.ok) {
      return res.status(propfindRes.status).json({ success: false, error: `PROPFIND failed: ${propfindRes.statusText}` });
    }

    const xml = await propfindRes.text();

    // Naive XML parsing: split responses, pick items with contenttype starting with audio/
    const responses = xml.split('<d:response').slice(1).map(chunk => '<d:response' + chunk);
    const files = [];
    for (const r of responses) {
      const hrefMatch = r.match(/<d:href>(.*?)<\/d:href>/);
      const typeMatch = r.match(/<d:getcontenttype>(.*?)<\/d:getcontenttype>/);
      const lengthMatch = r.match(/<d:getcontentlength>(.*?)<\/d:getcontentlength>/);
      if (!hrefMatch) continue;
      const href = hrefMatch[1];
      const isDir = /\/$/.test(href) && !typeMatch;
      if (isDir) continue;
      const contentType = typeMatch ? typeMatch[1] : '';
      if (contentType && !contentType.startsWith('audio/')) continue;

      // Convert WebDAV href to path under files root
      const decodedHref = decodeURIComponent(href);
      const idx = decodedHref.indexOf(`/remote.php/dav/files/${nextcloudConfig.username}`);
      let path = decodedHref;
      if (idx !== -1) {
        path = decodedHref.substring(idx + (`/remote.php/dav/files/${nextcloudConfig.username}`).length);
      }
      // We only care about items inside basePath
      if (!path.startsWith(basePath)) continue;
      const filename = path.split('/').filter(Boolean).pop();
      const size = lengthMatch ? Number(lengthMatch[1]) : undefined;
      files.push({ path, filename, size, contentType: contentType || 'audio/mpeg' });
    }

    // Get existing shares for this folder (and subfiles)
    const sharesUrl = `${nextcloudConfig.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares?path=${encodeURIComponent(basePath)}&subfiles=true`;
    const sharesRes = await fetch(sharesUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'OCS-APIRequest': 'true',
        'Accept': 'application/json'
      }
    });

    const sharesJson = sharesRes.ok ? await sharesRes.json() : { ocs: { data: [] } };
    const shareMap = new Map();
    const shareItems = sharesJson?.ocs?.data || [];
    for (const s of shareItems) {
      const spath = s?.path; // e.g. /audio/userId/file.mp3
      const surl = s?.url;
      if (spath && surl) {
        shareMap.set(spath, surl + '/download');
      }
    }

    // Ensure every file has a public share
    const results = [];
    for (const f of files) {
      let downloadUrl = shareMap.get(f.path);
      if (!downloadUrl) {
        // Create a public share
        const form = new URLSearchParams({
          'shareType': '3',
          'path': f.path,
          'permissions': '1'
        });
        const shareCreateRes = await fetch(`${nextcloudConfig.baseUrl}/ocs/v2.php/apps/files_sharing/api/v1/shares`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'OCS-APIRequest': 'true'
          },
          body: form
        });
        if (shareCreateRes.ok) {
          const text = await shareCreateRes.text();
          const urlMatch = text.match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/) || text.match(/<url>(.*?)<\/url>/);
          if (urlMatch) downloadUrl = urlMatch[1] + '/download';
        }
      }
      results.push({ ...f, downloadUrl });
    }

    res.json({ success: true, files: results });
  } catch (error) {
    console.error('❌ List error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Audio Proxy Endpoint um CORS-Probleme zu vermeiden
app.get('/api/audio-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log('🎵 Audio proxy request for URL:', url);
    
    // Fetch the audio file from Nextcloud
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Melodify/1.0'
      }
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch audio:', response.status, response.statusText);
      return res.status(response.status).json({ 
        error: `Failed to fetch audio: ${response.statusText}` 
      });
    }

    // Set appropriate headers for CORS and audio streaming
    res.set({
      'Content-Type': response.headers.get('content-type') || 'audio/mpeg',
      'Content-Length': response.headers.get('content-length'),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range'
    });

    // Handle range requests for audio seeking
    if (req.headers.range) {
      const range = req.headers.range;
      res.set('Content-Range', response.headers.get('content-range'));
      res.status(206);
    }

    // Stream the audio data
    const reader = response.body?.getReader();
    if (reader) {
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } catch (error) {
          console.error('❌ Error streaming audio:', error);
          res.end();
        }
      };
      await pump();
    } else {
      // Fallback for environments without streaming support
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    }

  } catch (error) {
    console.error('❌ Audio proxy error:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

export default app;

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Nextcloud API Server running on port ${PORT}`);
    console.log(`📁 Nextcloud URL: ${nextcloudConfig.baseUrl}`);
    console.log(`👤 Username: ${nextcloudConfig.username}`);
  });
}
