<script lang="ts">
  import type { Snippet } from 'svelte';

  type Stat = {
    value: number | string;
    label: string;
    variant?: 'default' | 'success' | 'muted';
  };

  let {
    title = 'Page Title',
    subtitle = '',
    stats = [] as Stat[],
    actions,
  }: {
    title?: string;
    subtitle?: string;
    stats?: Stat[];
    actions?: Snippet;
  } = $props();
</script>

<div class="top-bar">
  <div class="top-bar-left">
    <div class="page-title-row">
      <h1 class="page-title">{title}</h1>
      {#if subtitle}
        <span class="page-subtitle">{subtitle}</span>
      {/if}
    </div>
  </div>
  
  {#if stats.length > 0}
    <div class="stats">
      {#each stats as stat, i}
        {#if i > 0}
          <div class="stat-divider"></div>
        {/if}
        <div class="stat">
          <span class="stat-value" class:success={stat.variant === 'success'} class:muted={stat.variant === 'muted'}>
            {stat.value}
          </span>
          <span class="stat-label">{stat.label}</span>
        </div>
      {/each}
    </div>
  {/if}
  
  {#if actions}
    <div class="top-bar-actions">
      {@render actions()}
    </div>
  {/if}
</div>

<style>
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: var(--sidebar, #0a0a0c);
    border-bottom: 1px solid var(--sidebar-border, rgba(82, 82, 91, 0.4));
    min-height: 64px;
    flex-shrink: 0;
  }
  
  .top-bar-left { display: flex; flex-direction: column; gap: 4px; }
  .page-title-row { display: flex; align-items: center; gap: 12px; }
  .page-title { font-size: 18px; font-weight: 700; color: var(--foreground, #fafafa); margin: 0; }
  .page-subtitle { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--muted-foreground, #71717a); }
  
  .stats { display: flex; align-items: center; gap: 20px; }
  .stat { text-align: center; }
  .stat-value { font-size: 18px; font-weight: 700; color: var(--foreground, #fafafa); }
  .stat-value.success { color: #34d399; }
  .stat-value.muted { color: var(--muted-foreground, #71717a); }
  .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground, #71717a); display: block; }
  .stat-divider { width: 1px; height: 32px; background: var(--sidebar-border, rgba(82, 82, 91, 0.4)); }
  
  .top-bar-actions { display: flex; gap: 8px; }
  
  @media (max-width: 768px) {
    .top-bar { flex-direction: column; align-items: flex-start; gap: 12px; }
    .stats { width: 100%; justify-content: space-around; }
  }
</style>
