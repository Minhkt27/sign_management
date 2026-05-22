export const getBackendUrl = (path?: string): string => {
  if (!path) return '';

  // Extract /signage-assets/... path from any host — always use Vite proxy
  const storageMatch = path.match(/(\/signage-assets\/.+)/);
  if (storageMatch) return storageMatch[1];

  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  // Remove /api from the end of the base URL to get the server origin
  const origin = baseUrl.replace(/\/api\/?$/, '');
  return `${origin}${path}`;
};
