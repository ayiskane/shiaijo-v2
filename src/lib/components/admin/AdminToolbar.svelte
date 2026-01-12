<script lang="ts">
  import type { Snippet } from 'svelte';
  import Search from '@lucide/svelte/icons/search';

  let {
    searchValue = $bindable(''),
    searchPlaceholder = 'Search...',
    filters,
    actions,
  }: {
    searchValue?: string;
    searchPlaceholder?: string;
    filters?: Snippet;
    actions?: Snippet;
  } = $props();
</script>

<div class="toolbar">
  <div class="search-box">
    <Search size={16} class="search-icon" />
    <input
      type="text"
      class="search-input"
      placeholder={searchPlaceholder}
      bind:value={searchValue}
    />
  </div>
  
  {#if filters}
    {@render filters()}
  {/if}
  
  <div class="toolbar-spacer"></div>
  
  {#if actions}
    {@render actions()}
  {/if}
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 24px;
    background: var(--sidebar, #0a0a0c);
    border-bottom: 1px solid var(--sidebar-border, rgba(82, 82, 91, 0.4));
    flex-shrink: 0;
  }
  
  .search-box { position: relative; flex: 1; max-width: 300px; }
  .search-box :global(.search-icon) {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #52525b;
    pointer-events: none;
  }
  .search-input {
    width: 100%;
    background: var(--background, #09090b);
    border: 1px solid var(--sidebar-border, rgba(82, 82, 91, 0.4));
    border-radius: 8px;
    padding: 10px 14px 10px 40px;
    font-size: 14px;
    color: var(--foreground, #fafafa);
    font-family: inherit;
    transition: border-color 0.15s;
  }
  .search-input:focus { outline: none; border-color: var(--primary, #818cf8); }
  .search-input::placeholder { color: #52525b; }
  
  .toolbar-spacer { flex: 1; }
</style>
