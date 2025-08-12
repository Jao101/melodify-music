// API Utilities - ensures correct API base URL for all environments

/**
 * Get the correct API base URL for the current environment
 * In production, API and frontend are served from the same origin
 * In development, API is proxied by Vite
 */
export function getApiBaseUrl(): string {
  // In production build, use relative URLs (same origin)
  // In development, Vite handles the proxy
  return '';
}

/**
 * Build a complete API URL
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Build audio proxy URL
 */
export function buildAudioProxyUrl(sourceUrl: string): string {
  return buildApiUrl(`/api/audio-proxy?url=${encodeURIComponent(sourceUrl)}`);
}
