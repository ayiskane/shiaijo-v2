import type { Handle } from '@sveltejs/kit';

/**
 * Server hook for performance optimizations:
 * 1. Font preloading - reduces FOIT/FOUT
 * 2. Static asset caching - improves repeat visits
 */
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event, {
    // Preload fonts, js, and css for optimal loading
    preload: ({ type }) => type === 'font' || type === 'js' || type === 'css'
  });

  // Add long-term caching for static assets
  const path = event.url.pathname;
  if (path.startsWith('/fonts/') || 
      path.endsWith('.png') || 
      path.endsWith('.woff2')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  return response;
};
