# Shiaijo V2

Kendo tournament management system built with SvelteKit + Convex.

## Stack
- **Frontend**: SvelteKit 5 (Svelte 5 with runes)
- **Database**: Convex (real-time)
- **Hosting**: Vercel

## Features
- Real-time scoring across devices
- Multiple court support (A/B)
- Kendo-specific scoring (Men, Kote, Do, Tsuki)
- Hansoku (foul) tracking
- Round-robin tournament generation
- Spectator view
- Admin management

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Deploy Convex
npx convex dev
```

## Portals
- **Spectator**: Public view of live matches
- **Courtkeeper**: Scoring interface for officials
- **Admin**: Tournament management
- **Volunteer**: Sign up and hour logging
