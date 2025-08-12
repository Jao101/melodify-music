// API Utilities - ensures correct API base URL for all environments

/**
 * Get the correct API base URL for the current environment
 * In production on Render, use the full Render URL
 * In development, use relative URLs (Vite proxy)
 */
export function getApiBaseUrl(): string {
  // Check if we're running on Render in production
  if (import.meta.env.PROD && window.location.hostname.includes('onrender.com')) {
    return window.location.origin;
  }
  
  // In development or other production environments, use relative URLs
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
