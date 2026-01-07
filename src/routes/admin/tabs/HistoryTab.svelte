<script lang="ts">
  import autoAnimate from '@formkit/auto-animate';
  import * as Card from '$lib/components/ui/card';
  import { History, Search } from '@lucide/svelte';

  export let tournaments: any[] = [];

  let listEl: HTMLElement;
  let searchQuery = '';
  $: listEl && autoAnimate(listEl);

  $: completedTournaments = tournaments.filter((t) => t.status === 'completed');
  $: filteredTournaments = searchQuery 
    ? completedTournaments.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : completedTournaments;
</script>

<!-- Top Bar -->
<div class="top-bar">
  <div class="top-bar-left">
    <span class="top-bar-breadcrumb">Admin</span>
    <span class="top-bar-title">Match History</span>
  </div>
  <div class="top-bar-center">
    <div class="top-bar-stats">
      <div class="top-bar-stat">
        <div class="top-bar-stat-value">{completedTournaments.length}</div>
        <div class="top-bar-stat-label">Tournaments</div>
      </div>
    </div>
  </div>
  <div class="top-bar-right">
    <div class="top-bar-search" style="width: 200px;">
      <Search class="h-3.5 w-3.5" />
      <input 
        type="text" 
        bind:value={searchQuery}
        placeholder="Search tournaments..."
      />
    </div>
  </div>
</div>

{#if filteredTournaments.length === 0}
  <Card.Root class="border-dashed">
    <Card.Content class="flex flex-col items-center justify-center py-12">
      <History class="mb-4 h-12 w-12 text-muted-foreground/50" />
      <p class="text-muted-foreground">No completed tournaments yet</p>
    </Card.Content>
  </Card.Root>
{:else}
  <div class="space-y-4" bind:this={listEl}>
    {#each filteredTournaments as tournament (tournament._id)}
      <Card.Root>
        <Card.Header>
          <Card.Title class="truncate">{tournament.name}</Card.Title>
          <Card.Description>📅 {tournament.date}</Card.Description>
        </Card.Header>
      </Card.Root>
    {/each}
  </div>
{/if}
