# Shiaijo Optimization Audit
> Generated: January 2026  
> Stack: SvelteKit 2 + Svelte 5 + Convex + Tailwind v4 + Vercel

## ✅ Implemented Optimizations

### 1. Database (Convex)
- **Compound indexes** on all frequently queried tables
  - `matches.by_tournament_court` - Fast court-specific queries
  - `matches.by_tournament_status` - Active match queries
  - `participants.by_tournament_group` - Group lookups
- **Indexed queries** used consistently (no full table scans)
- **Efficient batch operations** for group court assignments

### 2. Fonts
- **Self-hosted WOFF2 fonts** (no Google Fonts CDN)
- **Font preloading** in `app.html` for critical fonts
- **font-display: swap** prevents invisible text during loading
- **unicode-range** for Japanese fonts (only loads CJK characters)

### 3. CSS/Styling
- **Tailwind v4 + Vite plugin** - CSS-first config, faster builds
- **CSS variables for theming** - No runtime style recalculations
- **@layer components** - Proper cascade organization
- **@custom-variant dark** - Efficient dark mode handling

### 4. Accessibility
- **44x44px minimum touch targets** for 45+ users
- **font-display: swap** for text visibility
- **prefers-reduced-motion** support
- **prefers-contrast: high** support
- **Clear focus states** for keyboard navigation

### 5. Bundle Size
- **Removed duplicate dependencies** (lucide-svelte → @lucide/svelte)
- **Removed unused deps** (postcss, autoprefixer not needed with Tailwind v4 Vite plugin)
- **Tree-shakeable icon imports** with Lucide

---

## 🔮 Remaining Optimizations (Medium Priority)

### 1. SSR Optimization with Convex
**Issue:** Initial load shows loading states for Convex queries

**Solution:** Use `+page.server.ts` with `ConvexHttpClient` for initial data:
```typescript
// src/routes/spectator/+page.server.ts
import { ConvexHttpClient } from 'convex/browser';
import { api } from '$lib/convex/_generated/api';

export const load = async () => {
  const client = new ConvexHttpClient(PUBLIC_CONVEX_URL);
  return {
    tournaments: await client.query(api.tournaments.getActive)
  };
};
```

Then pass as `initialData` to `useQuery()`:
```svelte
const tournaments = useQuery(
  api.tournaments.getActive,
  () => ({}),
  () => ({ initialData: data.tournaments })
);
```

### 2. Optimistic Updates
**Current:** Some mutations wait for server response

**Solution:** For instant UI feedback on court assignments:
```svelte
let localCourts = $state<Map<string, string>>(new Map());

async function assignCourt(groupId: string, court: string) {
  // Immediate UI update
  localCourts.set(groupId, court);
  
  // Server update in background
  await client.mutation(api.matches.setGroupCourt, { groupId, court });
}
```

### 3. Code Splitting for Admin
**Current:** Admin page loads all tabs at once

**Solution:** Lazy load tab content:
```svelte
{#if activeTab === 'members'}
  {#await import('./tabs/MembersTab.svelte') then { default: Tab }}
    <Tab />
  {/await}
{/if}
```

### 4. Service Worker for Offline Courtkeeper
**Benefit:** Courtkeepers can continue scoring if connection drops briefly

**Implementation:** Add `@vite-pwa/sveltekit` and cache Convex responses

---

## ⚡ Performance Metrics to Monitor

### Core Web Vitals Targets
| Metric | Target | How to Measure |
|--------|--------|----------------|
| LCP | < 2.5s | Vercel Speed Insights |
| FID | < 100ms | Chrome DevTools |
| CLS | < 0.1 | PageSpeed Insights |

### App-Specific Metrics
- **Initial load → interactive:** < 3s on 3G
- **Match score update:** < 200ms perceived
- **Court switch:** < 100ms

---

## 📦 Current Bundle Analysis

```
// Run locally: npx vite-bundle-visualizer
```

**Key observations:**
- Convex runtime: ~45KB (unavoidable, needed for realtime)
- Svelte runtime: ~15KB (minimal)
- Tailwind: ~20KB (tree-shaken)
- Lucide icons: ~2KB per icon used

---

## 🛡️ Security Considerations

1. **Convex handles auth** - No exposed API keys
2. **No localStorage for sensitive data** - Session-only state
3. **CSP headers** - Add via Vercel config if needed

---

## Next Steps

1. [ ] Implement SSR initial data for Spectator page
2. [ ] Add optimistic updates for court assignments  
3. [ ] Set up Vercel Speed Insights monitoring
4. [ ] Consider PWA for offline Courtkeeper mode
