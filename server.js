// Production Server - kombiniert Vite Build und Nextcloud API
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import nextcloudApi from './server/nextcloud-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from dist
app.use(express.static(join(__dirname, 'dist')));

// Use Nextcloud API routes
app.use(nextcloudApi);

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📁 Static files: ${join(__dirname, 'dist')}`);
  console.log(`🔗 Nextcloud API: /api/nextcloud/*`);
});
