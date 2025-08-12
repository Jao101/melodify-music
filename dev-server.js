// Development Server für die API (läuft parallel zu Vite)
import nextcloudApi from './server/nextcloud-api.js';

const port = 3001;

nextcloudApi.listen(port, () => {
  console.log(`🔧 Development API Server running on port ${port}`);
  console.log(`🔗 Nextcloud API: http://localhost:${port}/api/nextcloud/*`);
  console.log(`💡 Vite dev server should proxy /api/* requests here`);
});
