<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { convexQuery } from '$lib/convex';
  
  interface Match { _id: string; player1Id: string; player2Id: string; player1Score: number[]; player2Score: number[]; court: 'A' | 'B' | 'A+B'; status: string; groupId: string; winner?: string; timerDuration: number; timerStartedAt?: number; timerPausedAt?: number; orderIndex: number; }
  interface Member { _id: string; firstName: string; lastName: string; }
  interface Group { _id: string; groupId: string; name: string; }
  interface Tournament { _id: string; name: string; status: string; }
  
  let tournament = $state<Tournament | null>(null);
  let matches = $state<Match[]>([]);
  let members = $state<Member[]>([]);
  let groups = $state<Group[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let currentTime = $state(Date.now());
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let timeInterval: ReturnType<typeof setInterval> | null = null;
  
  let liveMatches = $derived(matches.filter(m => m.status === 'in_progress'));
  let courtALive = $derived(liveMatches.find(m => m.court === 'A' || m.court === 'A+B'));
  let courtBLive = $derived(liveMatches.find(m => m.court === 'B' || (m.court === 'A+B' && !courtALive)));
  let courtAQueue = $derived(matches.filter(m => (m.court === 'A' || m.court === 'A+B') && m.status === 'pending').sort((a, b) => a.orderIndex - b.orderIndex).slice(0, 5));
  let courtBQueue = $derived(matches.filter(m => (m.court === 'B' || m.court === 'A+B') && m.status === 'pending').sort((a, b) => a.orderIndex - b.orderIndex).slice(0, 5));
  let recentResults = $derived(matches.filter(m => m.status === 'completed').slice(-8));
  let completedCount = $derived(matches.filter(m => m.status === 'completed').length);
  let pendingCount = $derived(matches.filter(m => m.status === 'pending').length);
  
  async function loadData() {
    try {
      loading = true; error = null;
      const tournaments = await convexQuery<Tournament[]>('tournaments:list', {});
      tournament = tournaments.find(t => t.status === 'in_progress') || null;
      if (!tournament) { loading = false; return; }
      const [m, mem, g] = await Promise.all([
        convexQuery<Match[]>('matches:getByTournament', { tournamentId: tournament._id }),
        convexQuery<Member[]>('members:list', {}),
        convexQuery<Group[]>('groups:list', {}),
      ]);
      matches = m; members = mem; groups = g;
      loading = false;
    } catch (e: any) { error = e.message; loading = false; }
  }
  
  function startPolling() {
    pollInterval = setInterval(async () => {
      if (!tournament) return;
      try { matches = await convexQuery<Match[]>('matches:getByTournament', { tournamentId: tournament._id }); } catch {}
    }, 1000);
    timeInterval = setInterval(() => currentTime = Date.now(), 100);
  }
  
  function stopPolling() {
    if (pollInterval) clearInterval(pollInterval);
    if (timeInterval) clearInterval(timeInterval);
  }
  
  function getMemberName(id: string): string { const m = members.find(mem => mem._id === id); return m ? `${m.firstName} ${m.lastName.charAt(0)}.` : 'TBD'; }
  function getGroupName(id: string): string { return groups.find(g => g.groupId === id)?.name || id; }
  function getElapsedTime(m: Match): number {
    if (m.timerPausedAt) return m.timerPausedAt;
    if (m.timerStartedAt) return Math.floor((currentTime - m.timerStartedAt) / 1000);
    return 0;
  }
  function formatTime(s: number): string { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`; }
  
  onMount(() => { loadData().then(startPolling); });
  onDestroy(stopPolling);
</script>

<svelte:head><title>Spectator - Shiaijo</title></svelte:head>

<div class="min-h-screen bg-[#0a1017] text-white">
  <header class="bg-[#0f1a24] border-b border-[#1e3a5f] px-4 py-3">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a href="/"><img src="/shiaijo-logo.png" alt="試合場" class="h-10" /></a>
        {#if tournament}<span class="text-lg font-bold text-orange-400">{tournament.name}</span>{/if}
      </div>
      {#if tournament}<span class="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>LIVE</span>{/if}
    </div>
  </header>
  
  {#if loading}
    <div class="flex items-center justify-center min-h-[60vh]"><img src="/shiaijo-logo.png" alt="" class="h-24 animate-pulse opacity-50" /></div>
  {:else if error}
    <div class="flex items-center justify-center min-h-[60vh] flex-col gap-4 text-red-400"><p>{error}</p><button onclick={loadData} class="px-4 py-2 bg-[#1e3a5f] rounded-lg">Retry</button></div>
  {:else if !tournament}
    <div class="flex items-center justify-center min-h-[60vh] flex-col gap-4">
      <p class="text-[#6b8fad] text-xl">No active tournament</p>
      <a href="/" class="px-4 py-2 bg-[#1e3a5f] rounded-lg">Back to Home</a>
    </div>
  {:else}
    <main class="max-w-6xl mx-auto p-4 space-y-6">
      <!-- Live Matches -->
      <section>
        <h2 class="text-sm font-semibold text-[#6b8fad] uppercase tracking-wider mb-3">Current Matches</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <div class="rounded-xl p-4 border {courtALive ? 'bg-amber-950/30 border-amber-500/50' : 'bg-[#142130] border-[#1e3a5f]'}">
            <div class="flex items-center justify-between mb-3">
              <span class="font-bold text-amber-400">Court A</span>
              {#if courtALive}<span class="text-xs text-emerald-400">{formatTime(getElapsedTime(courtALive))} / {formatTime(courtALive.timerDuration)}</span>{/if}
            </div>
            {#if courtALive}
              <div class="flex items-center justify-between">
                <div class="flex-1"><p class="font-semibold">{getMemberName(courtALive.player1Id)}</p></div>
                <div class="text-3xl font-mono font-bold px-4"><span class="text-red-400">{courtALive.player1Score.length}</span>:<span>{courtALive.player2Score.length}</span></div>
                <div class="flex-1 text-right"><p class="font-semibold">{getMemberName(courtALive.player2Id)}</p></div>
              </div>
              <div class="text-xs text-[#6b8fad] mt-2 text-center">{getGroupName(courtALive.groupId)}</div>
            {:else}<p class="text-[#6b8fad] text-center py-4">Waiting...</p>{/if}
          </div>
          <div class="rounded-xl p-4 border {courtBLive ? 'bg-blue-950/30 border-blue-500/50' : 'bg-[#142130] border-[#1e3a5f]'}">
            <div class="flex items-center justify-between mb-3">
              <span class="font-bold text-blue-400">Court B</span>
              {#if courtBLive}<span class="text-xs text-emerald-400">{formatTime(getElapsedTime(courtBLive))} / {formatTime(courtBLive.timerDuration)}</span>{/if}
            </div>
            {#if courtBLive}
              <div class="flex items-center justify-between">
                <div class="flex-1"><p class="font-semibold">{getMemberName(courtBLive.player1Id)}</p></div>
                <div class="text-3xl font-mono font-bold px-4"><span class="text-red-400">{courtBLive.player1Score.length}</span>:<span>{courtBLive.player2Score.length}</span></div>
                <div class="flex-1 text-right"><p class="font-semibold">{getMemberName(courtBLive.player2Id)}</p></div>
              </div>
              <div class="text-xs text-[#6b8fad] mt-2 text-center">{getGroupName(courtBLive.groupId)}</div>
            {:else}<p class="text-[#6b8fad] text-center py-4">Waiting...</p>{/if}
          </div>
        </div>
      </section>
      
      <!-- Queues -->
      <section>
        <h2 class="text-sm font-semibold text-[#6b8fad] uppercase tracking-wider mb-3">Up Next</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <div class="bg-[#142130] rounded-xl p-4 border border-amber-500/30">
            <h3 class="font-semibold text-amber-400 mb-3">Court A</h3>
            {#each courtAQueue as m}<div class="p-2 rounded bg-[#0f1a24] mb-1 text-sm">{getMemberName(m.player1Id)} vs {getMemberName(m.player2Id)}</div>{:else}<p class="text-sm text-[#6b8fad]">No pending</p>{/each}
          </div>
          <div class="bg-[#142130] rounded-xl p-4 border border-blue-500/30">
            <h3 class="font-semibold text-blue-400 mb-3">Court B</h3>
            {#each courtBQueue as m}<div class="p-2 rounded bg-[#0f1a24] mb-1 text-sm">{getMemberName(m.player1Id)} vs {getMemberName(m.player2Id)}</div>{:else}<p class="text-sm text-[#6b8fad]">No pending</p>{/each}
          </div>
        </div>
      </section>
      
      <!-- Recent Results -->
      <section>
        <h2 class="text-sm font-semibold text-[#6b8fad] uppercase tracking-wider mb-3">Recent Results</h2>
        <div class="bg-[#142130] rounded-xl p-4 border border-[#1e3a5f]">
          {#each recentResults as m}
            {@const p1Win = m.winner === m.player1Id}
            <div class="flex items-center gap-3 p-2 rounded-lg bg-[#0f1a24] mb-2">
              <span class="{p1Win ? 'text-emerald-400 font-semibold' : ''}">{getMemberName(m.player1Id)} {p1Win ? '🏆' : ''}</span>
              <span class="text-[#6b8fad]">{m.player1Score.length}-{m.player2Score.length}</span>
              <span class="{!p1Win && m.winner ? 'text-emerald-400 font-semibold' : ''}">{!p1Win && m.winner ? '🏆 ' : ''}{getMemberName(m.player2Id)}</span>
            </div>
          {:else}<p class="text-[#6b8fad] text-center py-4">No completed matches</p>{/each}
        </div>
      </section>
      
      <!-- Stats -->
      <section>
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-[#142130] rounded-xl p-4 border border-[#1e3a5f] text-center">
            <div class="text-3xl font-bold text-emerald-400">{completedCount}</div>
            <div class="text-xs text-[#6b8fad]">Completed</div>
          </div>
          <div class="bg-[#142130] rounded-xl p-4 border border-[#1e3a5f] text-center">
            <div class="text-3xl font-bold text-amber-400">{liveMatches.length}</div>
            <div class="text-xs text-[#6b8fad]">In Progress</div>
          </div>
          <div class="bg-[#142130] rounded-xl p-4 border border-[#1e3a5f] text-center">
            <div class="text-3xl font-bold text-[#6b8fad]">{pendingCount}</div>
            <div class="text-xs text-[#6b8fad]">Remaining</div>
          </div>
        </div>
      </section>
    </main>
  {/if}
  
  <footer class="border-t border-[#1e3a5f] py-4 mt-8 text-center">
    <a href="https://renbudojo.com" target="_blank" class="text-[#6b8fad] hover:text-orange-400 text-sm">Powered by Renbu Dojo 錬武道場</a>
  </footer>
</div>
