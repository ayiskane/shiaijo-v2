<script lang="ts">
  import { useQuery } from 'convex-svelte';
  import { api } from '../../convex/_generated/api';
  import { 
    LayoutDashboard, 
    Users, 
    Globe, 
    Trophy, 
    Activity, 
    History, 
    Settings, 
    UserPlus,
    PanelLeftClose,
    PanelLeft,
    LayoutGrid,
    Eye,
    Heart
  } from 'lucide-svelte';

  // State
  let sidebarCollapsed = $state(false);
  let activeTab = $state('dashboard');

  // Data
  const tournamentsQuery = useQuery(api.tournaments.list, () => ({}));
  const membersQuery = useQuery(api.members.list, () => ({}));
  
  let tournaments = $derived(tournamentsQuery.data ?? []);
  let members = $derived(membersQuery.data ?? []);
  let activeTournament = $derived(tournaments.find(t => t.status === 'in_progress'));
  let memberCount = $derived(members.length);

  // Navigation structure
  const navItems = $derived([
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      group: null 
    },
    { 
      id: 'members', 
      label: 'Members', 
      icon: Users, 
      group: 'Roster',
      badge: memberCount > 0 ? memberCount : undefined
    },
    { 
      id: 'guests', 
      label: 'Guests', 
      icon: Globe, 
      group: 'Roster' 
    },
    { 
      id: 'tournament', 
      label: 'Tournament', 
      icon: Trophy, 
      group: 'Shiai' 
    },
    ...(activeTournament ? [{
      id: 'current-result',
      label: 'Current Result',
      icon: Activity,
      group: 'Shiai',
      live: true
    }] : []),
    { 
      id: 'history', 
      label: 'History', 
      icon: History, 
      group: 'Shiai' 
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings, 
      group: 'Admin' 
    },
    { 
      id: 'volunteers', 
      label: 'Volunteers', 
      icon: UserPlus, 
      group: 'Admin' 
    },
  ]);

  const portalLinks = [
    { id: 'court', href: '/courtkeeper', label: 'Court / Scorekeeper', icon: LayoutGrid },
    { id: 'spectator', href: '/spectator', label: 'Spectator', icon: Eye },
    { id: 'volunteer', href: '/volunteer', label: 'Volunteer', icon: Heart },
  ];

  // Computed breadcrumb
  let breadcrumb = $derived(() => {
    const item = navItems.find(n => n.id === activeTab);
    if (!item) return ['Admin', 'Dashboard'];
    if (item.group) return ['Admin', item.group, item.label];
    return ['Admin', item.label];
  });

  // Group navigation items
  function getGroupedNav() {
    const groups: Record<string, typeof navItems> = { '': [] };
    for (const item of navItems) {
      const group = item.group ?? '';
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    }
    return groups;
  }

  let groupedNav = $derived(getGroupedNav());

  function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
  }

  function setActiveTab(id: string) {
    activeTab = id;
  }
</script>

<svelte:head>
  <title>Admin Portal - Shiaijo</title>
</svelte:head>

<div class="admin-layout">
  <!-- SIDEBAR -->
  <aside class="sidebar" class:collapsed={sidebarCollapsed}>
    <!-- Header with Logo -->
    <div class="sidebar-header">
      <a href="/" class="sidebar-logo">
        <img src="/shiaijologo.png" alt="Shiaijo" class="logo-img" />
        <span class="logo-text">試合場</span>
      </a>
      <button class="fab-collapse" onclick={toggleSidebar} aria-label="Toggle sidebar">
        {#if sidebarCollapsed}
          <PanelLeft size={14} />
        {:else}
          <PanelLeftClose size={14} />
        {/if}
      </button>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      {#each Object.entries(groupedNav) as [group, items]}
        <div class="nav-group">
          {#if group}
            <div class="nav-group-label">{group}</div>
          {/if}
          {#each items as item}
            <button
              class="nav-item"
              class:active={activeTab === item.id}
              class:live={item.live}
              onclick={() => setActiveTab(item.id)}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              <span class="nav-item-icon">
                <item.icon size={20} />
              </span>
              <span class="nav-item-text">{item.label}</span>
              {#if item.badge}
                <span class="nav-badge">{item.badge}</span>
              {/if}
              {#if item.live}
                <span class="live-dot"></span>
              {/if}
            </button>
          {/each}
        </div>
      {/each}
    </nav>

    <!-- Portal Links -->
    <div class="sidebar-footer">
      <div class="portal-section-label">Portals</div>
      <div class="portal-links">
        {#each portalLinks as portal}
          <a href={portal.href} class="portal-link {portal.id}">
            <span class="portal-link-icon">
              <portal.icon size={20} />
            </span>
            <span class="portal-link-text">{portal.label}</span>
          </a>
        {/each}
      </div>
    </div>
  </aside>

  <!-- MAIN AREA -->
  <main class="main-area">
    <!-- Header -->
    <header class="header">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        {#each breadcrumb() as crumb, i}
          {#if i > 0}
            <span class="breadcrumb-sep">/</span>
          {/if}
          <span 
            class="breadcrumb-item" 
            class:active={i === breadcrumb().length - 1}
          >
            {crumb}
          </span>
        {/each}
      </nav>

      <div class="header-actions">
        <button class="user-btn">
          <div class="user-avatar">A</div>
          <span class="user-name">Admin</span>
        </button>
      </div>
    </header>

    <!-- Content -->
    <div class="content">
      <div class="content-placeholder">
        {activeTab} tab content will be rendered here
      </div>
    </div>
  </main>
</div>

<style>
  /* ═══════════════════════════════════════════════════
     CSS VARIABLES
     ═══════════════════════════════════════════════════ */
  .admin-layout {
    --bg-base: #09090b;
    --bg-sidebar: #0a0a0c;
    --bg-header: #0c0c0e;
    --bg-content: #09090b;
    --bg-hover: #18181b;
    --bg-active: #1c1c20;
    
    --border-subtle: #1f1f23;
    --border-accent: #27272a;
    
    --text-primary: #fafafa;
    --text-secondary: #b4b4bb;
    --text-muted: #8a8a94;
    
    --accent-primary: #818cf8;
    --accent-secondary: #6366f1;
    --accent-glow: rgba(129, 140, 248, 0.12);
    --accent-border: rgba(129, 140, 248, 0.25);
    
    --live-color: #22c55e;
    --live-glow: rgba(34, 197, 94, 0.15);
    
    --sidebar-width: 250px;
    --sidebar-collapsed: 68px;
    --header-height: 64px;
    
    --radius: 10px;
    --radius-lg: 12px;
    --transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* ═══════════════════════════════════════════════════
     LAYOUT
     ═══════════════════════════════════════════════════ */
  .admin-layout {
    display: flex;
    min-height: 100vh;
    background: var(--bg-base);
    color: var(--text-primary);
    font-family: 'Titillium Web', sans-serif;
    font-size: 16px;
    line-height: 1.6;
  }

  /* ═══════════════════════════════════════════════════
     SIDEBAR
     ═══════════════════════════════════════════════════ */
  .sidebar {
    width: var(--sidebar-width);
    background: var(--bg-sidebar);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 100;
    transition: width var(--transition);
    padding: 10px;
  }

  .sidebar.collapsed {
    width: var(--sidebar-collapsed);
    padding: 10px 8px;
  }

  /* Sidebar Header */
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 6px 6px 8px;
    margin-bottom: 12px;
  }

  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
  }

  .logo-img {
    width: 36px;
    height: 36px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .logo-text {
    font-family: 'SicYubi-FudeGyosho', serif;
    font-size: 20px;
    color: var(--text-primary);
    letter-spacing: 0.1em;
    transition: opacity var(--transition), width var(--transition);
    overflow: hidden;
    white-space: nowrap;
  }

  .sidebar.collapsed .logo-text {
    opacity: 0;
    width: 0;
  }

  /* FAB Toggle */
  .fab-collapse {
    width: 30px;
    height: 30px;
    background: var(--bg-hover);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition);
    flex-shrink: 0;
    color: var(--text-muted);
  }

  .fab-collapse:hover {
    background: var(--bg-active);
    border-color: var(--border-accent);
    color: var(--text-secondary);
  }

  /* Navigation */
  .sidebar-nav {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .nav-group {
    margin-bottom: 8px;
  }

  .nav-group-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--text-muted);
    padding: 6px 12px 4px;
    transition: opacity var(--transition);
  }

  .sidebar.collapsed .nav-group-label {
    opacity: 0;
    height: 0;
    padding: 0;
    overflow: hidden;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: var(--radius);
    color: var(--text-secondary);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all var(--transition);
    min-height: 44px;
    position: relative;
    width: 100%;
    text-align: left;
    font-family: inherit;
    font-size: 15px;
  }

  .sidebar.collapsed .nav-item {
    justify-content: center;
    padding: 10px;
  }

  .nav-item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .nav-item.active {
    background: var(--accent-glow);
    color: var(--accent-primary);
    box-shadow: inset 0 0 0 1px var(--accent-border);
  }

  .nav-item-icon {
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .nav-item-text {
    font-weight: 500;
    white-space: nowrap;
    transition: opacity var(--transition), width var(--transition);
    overflow: hidden;
  }

  .sidebar.collapsed .nav-item-text {
    opacity: 0;
    width: 0;
  }

  /* Badge */
  .nav-badge {
    margin-left: auto;
    background: var(--accent-primary);
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 8px;
    transition: opacity var(--transition);
  }

  .sidebar.collapsed .nav-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    margin: 0;
    padding: 1px 5px;
    font-size: 10px;
  }

  /* Live Indicator */
  .nav-item.live {
    background: var(--live-glow);
    color: var(--live-color);
  }

  .nav-item.live:hover {
    background: rgba(34, 197, 94, 0.2);
  }

  .live-dot {
    width: 8px;
    height: 8px;
    background: var(--live-color);
    border-radius: 50%;
    margin-left: auto;
    animation: pulse 2s ease-in-out infinite;
    flex-shrink: 0;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .sidebar.collapsed .live-dot {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 6px;
    height: 6px;
  }

  /* ═══════════════════════════════════════════════════
     SIDEBAR FOOTER - PORTAL LINKS
     ═══════════════════════════════════════════════════ */
  .sidebar-footer {
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid var(--border-subtle);
  }

  .portal-section-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--text-muted);
    padding: 6px 12px 4px;
    transition: opacity var(--transition);
  }

  .sidebar.collapsed .portal-section-label {
    opacity: 0;
    height: 0;
    padding: 0;
    overflow: hidden;
  }

  .portal-links {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .portal-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    color: var(--text-muted);
    text-decoration: none;
    transition: all var(--transition);
    min-height: 42px;
  }

  .sidebar.collapsed .portal-link {
    justify-content: center;
    padding: 10px;
  }

  .portal-link:hover {
    background: var(--bg-hover);
    color: var(--text-secondary);
  }

  .portal-link-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .portal-link-text {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    transition: opacity var(--transition), width var(--transition);
    overflow: hidden;
  }

  .sidebar.collapsed .portal-link-text {
    opacity: 0;
    width: 0;
  }

  .portal-link.court:hover { color: #60a5fa; }
  .portal-link.spectator:hover { color: #34d399; }
  .portal-link.volunteer:hover { color: #f472b6; }

  /* ═══════════════════════════════════════════════════
     MAIN AREA
     ═══════════════════════════════════════════════════ */
  .main-area {
    flex: 1;
    margin-left: var(--sidebar-width);
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    transition: margin-left var(--transition);
  }

  .sidebar.collapsed ~ .main-area {
    margin-left: var(--sidebar-collapsed);
  }

  /* Header */
  .header {
    height: var(--header-height);
    background: var(--bg-header);
    border-bottom: 1px solid var(--border-subtle);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    position: sticky;
    top: 0;
    z-index: 50;
  }

  /* Breadcrumb */
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .breadcrumb-item {
    font-size: 15px;
    color: var(--text-muted);
    padding: 8px 12px;
    border-radius: 8px;
    transition: all var(--transition);
  }

  .breadcrumb-item.active {
    background: var(--bg-active);
    color: var(--text-primary);
    font-weight: 600;
  }

  .breadcrumb-sep {
    color: var(--border-accent);
    font-size: 16px;
  }

  /* Header Actions */
  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .user-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px 6px 6px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all var(--transition);
    font-family: inherit;
    min-height: 46px;
  }

  .user-btn:hover {
    background: var(--bg-hover);
    border-color: var(--border-subtle);
  }

  .user-avatar {
    width: 34px;
    height: 34px;
    background: linear-gradient(135deg, var(--accent-primary), #a78bfa);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    color: white;
  }

  .user-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }

  /* Content */
  .content {
    flex: 1;
    padding: 24px;
  }

  .content-placeholder {
    background: linear-gradient(135deg, var(--bg-sidebar) 0%, var(--bg-header) 100%);
    border: 2px dashed var(--border-accent);
    border-radius: var(--radius-lg);
    height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 16px;
    text-transform: capitalize;
  }

  /* ═══════════════════════════════════════════════════
     FOCUS & ACCESSIBILITY
     ═══════════════════════════════════════════════════ */
  .nav-item:focus-visible,
  .portal-link:focus-visible,
  .fab-collapse:focus-visible,
  .user-btn:focus-visible,
  .sidebar-logo:focus-visible {
    outline: 3px solid var(--accent-primary);
    outline-offset: 2px;
  }

  @media (prefers-contrast: high) {
    .admin-layout {
      --text-secondary: #d4d4d8;
      --text-muted: #a1a1aa;
      --border-subtle: #3f3f46;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .admin-layout *, .live-dot {
      transition: none !important;
      animation: none !important;
    }
  }

  /* ═══════════════════════════════════════════════════
     MOBILE RESPONSIVE
     ═══════════════════════════════════════════════════ */
  @media (max-width: 768px) {
    .sidebar {
      transform: translateX(-100%);
    }
    
    .sidebar.open {
      transform: translateX(0);
    }
    
    .main-area {
      margin-left: 0;
    }
    
    .user-name {
      display: none;
    }
  }
</style>
