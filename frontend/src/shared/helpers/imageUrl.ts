export const getBackendUrl = (path?: string): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  // Remove /api from the end of the base URL to get the server origin
  const origin = baseUrl.replace(/\/api\/?$/, '');
  return `${origin}${path}`;
};
