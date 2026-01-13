import { convexQuery } from '$lib/convex';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  try {
    // Prefetch tournaments on server for instant render
    const tournaments = await convexQuery<Array<{
      _id: string;
      name: string;
      status: 'setup' | 'in_progress' | 'completed';
    }>>('tournaments:list', {});
    
    return {
      initialTournaments: tournaments,
    };
  } catch (e) {
    // Graceful fallback - client will fetch
    console.error('SSR prefetch failed:', e);
    return {
      initialTournaments: null,
    };
  }
};
