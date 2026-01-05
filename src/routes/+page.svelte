<script lang="ts">
  import Icon from '$lib/Icon.svelte';
  
  const portals = [
    { id: 'spectator', href: '/spectator', icon: 'eye', label: 'Spectator', color: 'emerald', desc: 'Watch live matches' },
    { id: 'admin', href: '/admin', icon: 'shield-halved', label: 'Admin', color: 'orange', desc: 'Manage tournament' },
    { id: 'courtkeeper', href: '/courtkeeper', icon: 'gavel', label: 'Courtkeeper', color: 'sky', desc: 'Score matches' },
    { id: 'volunteer', href: '/volunteer', icon: 'hand-holding-heart', label: 'Volunteer', color: 'pink', desc: 'Track hours' },
  ];
</script>

<div class="landing">
  <main class="container">
    <div class="logo-section">
      <img src="/shiaijologo.png" alt="試合場 Shiaijo" class="logo" />
    </div>
    
    <div class="portal-grid">
      {#each portals as portal}
        <a href={portal.href} class="portal-card portal-{portal.color}">
          <span class="portal-icon"><Icon name={portal.icon} /></span>
          <span class="portal-label">{portal.label}</span>
          <span class="portal-desc">{portal.desc}</span>
        </a>
      {/each}
    </div>
    
    <footer class="footer">
      <a href="https://renbudojo.com" target="_blank" rel="noopener noreferrer" class="footer-link">
        <img src="/renbu-logo.png" alt="Renbu Dojo" class="renbu-logo" />
        <span>Renbu Dojo</span>
      </a>
    </footer>
  </main>
</div>

<style>
  .landing { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: var(--space-6); background: radial-gradient(ellipse at center, var(--color-bg-medium) 0%, var(--color-bg) 70%); }
  .container { width: 100%; max-width: 480px; display: flex; flex-direction: column; align-items: center; gap: var(--space-8); }
  .logo-section { text-align: center; }
  .logo { width: 180px; height: auto; filter: drop-shadow(0 0 30px rgba(249, 115, 22, 0.3)); }
  .portal-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); width: 100%; }
  .portal-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-2); min-height: 140px; padding: var(--space-5); background: var(--color-bg-card); border: 2px solid var(--border-color); border-radius: var(--border-radius-lg); text-decoration: none; transition: all var(--transition); }
  .portal-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
  .portal-icon { font-size: 2.5rem; margin-bottom: var(--space-2); }
  .portal-label { font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text); }
  .portal-desc { font-size: var(--font-size-sm); color: var(--color-text-muted); text-align: center; }
  .portal-emerald { border-color: rgba(16, 185, 129, 0.3); }
  .portal-emerald:hover { border-color: rgba(16, 185, 129, 0.6); background: rgba(16, 185, 129, 0.1); }
  .portal-emerald .portal-icon { color: #10b981; }
  .portal-orange { border-color: rgba(249, 115, 22, 0.3); }
  .portal-orange:hover { border-color: rgba(249, 115, 22, 0.6); background: rgba(249, 115, 22, 0.1); }
  .portal-orange .portal-icon { color: #f97316; }
  .portal-sky { border-color: rgba(14, 165, 233, 0.3); }
  .portal-sky:hover { border-color: rgba(14, 165, 233, 0.6); background: rgba(14, 165, 233, 0.1); }
  .portal-sky .portal-icon { color: #0ea5e9; }
  .portal-pink { border-color: rgba(236, 72, 153, 0.3); }
  .portal-pink:hover { border-color: rgba(236, 72, 153, 0.6); background: rgba(236, 72, 153, 0.1); }
  .portal-pink .portal-icon { color: #ec4899; }
  .footer { margin-top: var(--space-4); }
  .footer-link { display: flex; align-items: center; gap: var(--space-2); color: var(--color-text-muted); font-size: var(--font-size-sm); }
  .footer-link:hover { color: var(--color-text); }
  .renbu-logo { height: 28px; width: auto; opacity: 0.7; }
  .footer-link:hover .renbu-logo { opacity: 1; }
  @media (max-width: 400px) { .portal-grid { grid-template-columns: 1fr; } .logo { width: 150px; } }
</style>
