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

<!-- Top Bar - Design 2 -->
<div class="top-bar sticky top-0 z-10 -mx-4 sm:-mx-6 px-5 py-4 mb-5" style="background: var(--surface); border-bottom: 1px solid var(--border-subtle);">
  <div class="flex items-center justify-between">
    <div>
      <div class="text-[0.6rem] uppercase tracking-widest mb-1" style="color: var(--text-faint);">Admin / Shiai</div>
      <h1 class="font-jp text-lg font-bold" style="color: var(--text-primary);">Match History</h1>
    </div>
    <div class="flex items-center gap-6">
      <div class="text-center">
        <div class="text-xl font-bold" style="color: var(--text-primary);">{completedTournaments.length}</div>
        <div class="text-[0.55rem] uppercase" style="color: var(--text-muted);">Tournaments</div>
      </div>
    </div>
    <div class="flex items-center gap-2 px-3 py-1.5 rounded-md" style="background: var(--background); border: 1px solid var(--border-subtle); width: 220px;">
      <Search class="h-3 w-3" style="color: var(--text-faint);" />
      <input 
        type="text" 
        bind:value={searchQuery}
        placeholder="Search tournaments..."
        class="bg-transparent border-none outline-none text-xs w-full"
        style="color: var(--text-primary);"
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
