<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { convexQuery, convexMutation } from '$lib/convex';
  
  interface Member { _id: string; firstName: string; lastName: string; groupId: string; }
  interface Group { _id: string; groupId: string; name: string; isHantei: boolean; }
  interface Tournament { _id: string; name: string; status: string; defaultTimerDuration: number; }
  interface Match {
    _id: string; tournamentId: string; groupId: string;
    player1Id: string; player2Id: string;
    player1Score: number[]; player2Score: number[];
    player1Hansoku: number; player2Hansoku: number;
    court: 'A' | 'B' | 'A+B'; status: 'pending' | 'in_progress' | 'completed';
    matchType: 'sanbon' | 'ippon' | 'hantei';
    timerDuration: number; timerStartedAt?: number; timerPausedAt?: number;
    winner?: string; orderIndex: number;
  }
  
  const SCORE_LABELS: Record<number, string> = { 1: 'M', 2: 'K', 3: 'D', 4: 'T', 5: 'H', 6: 'FF' };
  const SCORE_BUTTONS = [{ type: 1, label: 'M' }, { type: 2, label: 'K' }, { type: 3, label: 'D' }, { type: 4, label: 'T' }];
  
  let showCourtSelect = $state(true);
  let selectedCourt = $state<'A' | 'B' | null>(null);
  let tournament = $state<Tournament | null>(null);
  let matches = $state<Match[]>([]);
  let members = $state<Member[]>([]);
  let groups = $state<Group[]>([]);
  let currentMatch = $state<Match | null>(null);
  let elapsedSeconds = $state(0);
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let showWinModal = $state(false);
  let pendingWinner = $state<'player1' | 'player2' | null>(null);
  let showQueuePanel = $state(false);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  
  let p1Score = $derived(currentMatch?.player1Score || []);
  let p2Score = $derived(currentMatch?.player2Score || []);
  let p1Hansoku = $derived(currentMatch?.player1Hansoku || 0);
  let p2Hansoku = $derived(currentMatch?.player2Hansoku || 0);
  let winTarget = $derived(currentMatch?.matchType === 'ippon' ? 1 : 2);
  let gameOver = $derived(p1Score.length >= winTarget || p2Score.length >= winTarget);
  let timerDuration = $derived(currentMatch?.timerDuration || 180);
  let progress = $derived(Math.min(100, (elapsedSeconds / timerDuration) * 100));
  let timerExpired = $derived(elapsedSeconds >= timerDuration);
  let timerRunning = $derived(!!(currentMatch?.timerStartedAt && !currentMatch?.timerPausedAt));
  let courtMatches = $derived(matches.filter(m => m.court === selectedCourt || m.court === 'A+B').sort((a, b) => a.orderIndex - b.orderIndex));
  let pendingMatches = $derived(courtMatches.filter(m => m.status === 'pending'));
  let inProgressMatches = $derived(courtMatches.filter(m => m.status === 'in_progress'));
  
  $effect(() => {
    if (!selectedCourt || matches.length === 0) return;
    const live = inProgressMatches.find(m => m.court === selectedCourt || m.court === 'A+B');
    currentMatch = live || pendingMatches[0] || null;
  });
  
  $effect(() => {
    if (!currentMatch) return;
    if (currentMatch.timerStartedAt && !currentMatch.timerPausedAt) {
      elapsedSeconds = Math.floor((Date.now() - currentMatch.timerStartedAt) / 1000);
      startLocalTimer();
    } else if (currentMatch.timerPausedAt) {
      elapsedSeconds = currentMatch.timerPausedAt;
      stopLocalTimer();
    } else {
      elapsedSeconds = 0;
      stopLocalTimer();
    }
  });
  
  function startLocalTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
      if (currentMatch?.timerStartedAt && !currentMatch?.timerPausedAt) {
        elapsedSeconds = Math.floor((Date.now() - currentMatch.timerStartedAt) / 1000);
      }
    }, 100);
  }
  
  function stopLocalTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }
  
  function formatTime(s: number): string {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }
  
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
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      if (!tournament) return;
      try { matches = await convexQuery<Match[]>('matches:getByTournament', { tournamentId: tournament._id }); } catch {}
    }, 500);
  }
  
  function stopPolling() { if (pollInterval) { clearInterval(pollInterval); pollInterval = null; } }
  
  async function refreshMatches() {
    if (tournament) matches = await convexQuery<Match[]>('matches:getByTournament', { tournamentId: tournament._id });
  }
  
  async function addScore(player: 'player1' | 'player2', scoreType: number) {
    if (!currentMatch || gameOver) return;
    try {
      if (currentMatch.status === 'pending') await convexMutation('matches:startMatch', { matchId: currentMatch._id });
      const result = await convexMutation<{ winner?: string }>('matches:addScore', { matchId: currentMatch._id, player, scoreType });
      if (result.winner) { pendingWinner = player; showWinModal = true; }
      await refreshMatches();
    } catch (e) { console.error(e); }
  }
  
  async function addHansoku(player: 'player1' | 'player2') {
    if (!currentMatch || gameOver) return;
    try {
      const result = await convexMutation<{ winner?: string }>('matches:addHansoku', { matchId: currentMatch._id, player });
      if (result.winner) { pendingWinner = player === 'player1' ? 'player2' : 'player1'; showWinModal = true; }
      await refreshMatches();
    } catch (e) { console.error(e); }
  }
  
  async function undoScore(player: 'player1' | 'player2') {
    if (!currentMatch) return;
    try { await convexMutation('matches:undoScore', { matchId: currentMatch._id, player }); showWinModal = false; pendingWinner = null; await refreshMatches(); } catch (e) { console.error(e); }
  }
  
  async function toggleTimer() {
    if (!currentMatch) return;
    try { await convexMutation('matches:toggleTimer', { matchId: currentMatch._id }); await refreshMatches(); } catch (e) { console.error(e); }
  }
  
  async function confirmWin() {
    if (!currentMatch || !pendingWinner) return;
    try { await convexMutation('matches:declareWinner', { matchId: currentMatch._id, winner: pendingWinner }); showWinModal = false; pendingWinner = null; await refreshMatches(); } catch (e) { console.error(e); }
  }
  
  async function declareForfeit(player: 'player1' | 'player2') {
    if (!currentMatch) return;
    try { await convexMutation('matches:declareForfeit', { matchId: currentMatch._id, forfeitingPlayer: player }); pendingWinner = player === 'player1' ? 'player2' : 'player1'; showWinModal = true; await refreshMatches(); } catch (e) { console.error(e); }
  }
  
  function selectCourt(court: 'A' | 'B') { selectedCourt = court; showCourtSelect = false; startPolling(); }
  function getMemberName(id: string | undefined): string { if (!id) return 'Unknown'; const m = members.find(mem => mem._id === id); return m ? `${m.firstName} ${m.lastName.charAt(0)}.` : 'Unknown'; }
  function getGroupName(id: string): string { return groups.find(g => g.groupId === id)?.name || id; }
  
  onMount(() => loadData());
  onDestroy(() => { stopLocalTimer(); stopPolling(); });
</script>

<svelte:head><title>Courtkeeper - Shiaijo</title></svelte:head>

{#if showCourtSelect}
<div class="fixed inset-0 bg-[#0a1017] flex items-center justify-center p-4 z-50">
  <div class="bg-[#142130] rounded-2xl p-6 max-w-sm w-full text-center border border-[#1e3a5f]">
    <img src="/shiaijo-logo.png" alt="試合場" class="h-20 mx-auto mb-4" />
    <h2 class="text-lg text-[#8fb3d1] mb-6">Which court are you keeping score for?</h2>
    <div class="grid grid-cols-2 gap-4">
      <button onclick={() => selectCourt('A')} class="py-4 rounded-xl font-bold text-lg bg-amber-500 text-black hover:bg-amber-400">Court A</button>
      <button onclick={() => selectCourt('B')} class="py-4 rounded-xl font-bold text-lg bg-blue-500 text-white hover:bg-blue-400">Court B</button>
    </div>
  </div>
</div>
{/if}

{#if !showCourtSelect && selectedCourt}
<div class="min-h-screen bg-[#0a1017] text-white flex flex-col select-none">
  <header class="bg-[#0f1a24] border-b border-[#1e3a5f] px-4 py-3 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <img src="/shiaijo-logo.png" alt="" class="h-8" />
      <span class="font-bold text-lg {selectedCourt === 'A' ? 'text-amber-400' : 'text-blue-400'}">Court {selectedCourt}</span>
      {#if currentMatch}<span class="text-sm text-[#6b8fad]">{getGroupName(currentMatch.groupId)}</span>{/if}
    </div>
    <button onclick={() => showQueuePanel = !showQueuePanel} class="p-2 rounded-lg bg-[#1e3a5f]">☰</button>
  </header>
  
  {#if loading}
    <div class="flex-1 flex items-center justify-center"><img src="/shiaijo-logo.png" alt="" class="h-24 animate-pulse" /></div>
  {:else if error}
    <div class="flex-1 flex items-center justify-center flex-col gap-4 text-red-400"><p>{error}</p><button onclick={loadData} class="px-4 py-2 bg-[#1e3a5f] rounded-lg">Retry</button></div>
  {:else if !tournament}
    <div class="flex-1 flex items-center justify-center flex-col gap-4"><p class="text-[#6b8fad]">No active tournament</p><a href="/admin" class="px-4 py-2 bg-orange-500 rounded-lg">Go to Admin</a></div>
  {:else if !currentMatch}
    <div class="flex-1 flex items-center justify-center"><p class="text-[#6b8fad]">No matches for Court {selectedCourt}</p></div>
  {:else}
    <div class="flex-1 flex flex-col p-3 gap-3">
      <!-- Score Display -->
      <div class="bg-gradient-to-r from-red-950/80 via-transparent to-slate-800/80 rounded-xl p-4 border border-[#1e3a5f]">
        <div class="flex items-center justify-between">
          <div class="flex-1"><p class="text-xs text-red-400 mb-1">AKA</p><p class="text-xl font-bold truncate">{getMemberName(currentMatch.player1Id)}</p>
            <div class="flex gap-1 mt-2">{#each p1Score as s}<span class="w-7 h-7 rounded-full border-2 border-red-400 text-red-400 flex items-center justify-center text-sm font-bold">{SCORE_LABELS[s]}</span>{/each}</div>
          </div>
          <div class="px-4 text-center">
            <div class="text-4xl font-mono font-bold"><span class="text-red-400">{Math.min(p1Score.length, winTarget)}</span>:<span>{Math.min(p2Score.length, winTarget)}</span></div>
            <div class="text-amber-400 text-sm mt-1">{p1Hansoku > 0 ? '▲'.repeat(p1Hansoku) : ''} · {p2Hansoku > 0 ? '▲'.repeat(p2Hansoku) : ''}</div>
          </div>
          <div class="flex-1 text-right"><p class="text-xs text-slate-300 mb-1">SHIRO</p><p class="text-xl font-bold truncate">{getMemberName(currentMatch.player2Id)}</p>
            <div class="flex gap-1 mt-2 justify-end">{#each p2Score as s}<span class="w-7 h-7 rounded-full border-2 border-slate-300 text-slate-300 flex items-center justify-center text-sm font-bold">{SCORE_LABELS[s]}</span>{/each}</div>
          </div>
        </div>
      </div>
      
      <!-- Score Buttons -->
      <div class="grid grid-cols-2 gap-3 flex-1">
        <div class="bg-red-950/30 rounded-xl p-3 border border-red-900/50 flex flex-col gap-2">
          <div class="grid grid-cols-4 gap-2">{#each SCORE_BUTTONS as btn}<button onclick={() => addScore('player1', btn.type)} disabled={gameOver} class="h-14 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 font-bold text-lg">{btn.label}</button>{/each}</div>
          <button onclick={() => addHansoku('player1')} disabled={gameOver} class="h-10 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 font-semibold">▲ Hansoku</button>
          <div class="flex gap-2">
            <button onclick={() => undoScore('player1')} disabled={p1Score.length === 0} class="flex-1 h-10 rounded-lg bg-slate-700 disabled:opacity-30 text-sm">↩ Undo</button>
            <button onclick={() => declareForfeit('player1')} disabled={gameOver} class="flex-1 h-10 rounded-lg bg-slate-800 text-red-400 border border-red-900/50 text-sm">Forfeit</button>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl p-3 border border-slate-700 flex flex-col gap-2">
          <div class="grid grid-cols-4 gap-2">{#each SCORE_BUTTONS as btn}<button onclick={() => addScore('player2', btn.type)} disabled={gameOver} class="h-14 rounded-xl bg-slate-600 hover:bg-slate-500 disabled:opacity-50 font-bold text-lg">{btn.label}</button>{/each}</div>
          <button onclick={() => addHansoku('player2')} disabled={gameOver} class="h-10 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 font-semibold">Hansoku ▲</button>
          <div class="flex gap-2">
            <button onclick={() => declareForfeit('player2')} disabled={gameOver} class="flex-1 h-10 rounded-lg bg-slate-800 text-red-400 border border-slate-600 text-sm">Forfeit</button>
            <button onclick={() => undoScore('player2')} disabled={p2Score.length === 0} class="flex-1 h-10 rounded-lg bg-slate-700 disabled:opacity-30 text-sm">Undo ↩</button>
          </div>
        </div>
      </div>
      
      <!-- Timer -->
      <div class="rounded-xl p-4 border {timerExpired ? 'bg-amber-950/50 border-amber-500' : 'bg-[#142130] border-[#1e3a5f]'}">
        {#if timerExpired}<div class="bg-amber-500 text-black font-bold text-center py-2 rounded-lg mb-3">TIME!</div>{:else}<div class="h-2 bg-slate-700 rounded-full mb-3"><div class="h-full bg-emerald-500 transition-all" style="width: {progress}%"></div></div>{/if}
        <div class="flex items-center justify-center gap-4">
          <button onclick={toggleTimer} class="w-14 h-14 rounded-full font-bold text-lg {timerRunning ? 'bg-amber-500 text-black' : 'bg-emerald-500'}">{timerRunning ? '⏸' : '▶'}</button>
          <span class="text-4xl font-mono font-bold">{formatTime(elapsedSeconds)}</span>
          <button onclick={() => elapsedSeconds = 0} class="px-4 py-2 rounded-lg bg-slate-700 text-sm">Reset</button>
        </div>
      </div>
      
      {#if pendingMatches.length > 1}
        {@const next = pendingMatches[1]}
        <div class="bg-[#142130]/50 rounded-lg p-3 border border-[#1e3a5f]/50">
          <div class="text-xs text-[#6b8fad] mb-1">UP NEXT</div>
          <div class="flex items-center justify-between">
            <span class="text-sm">{getMemberName(next.player1Id)} vs {getMemberName(next.player2Id)}</span>
            <span class="text-xs text-[#6b8fad]">{getGroupName(next.groupId)}</span>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

{#if showWinModal && pendingWinner}
<div class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
  <div class="rounded-2xl p-6 max-w-sm w-full text-center border {pendingWinner === 'player1' ? 'bg-red-950 border-red-700' : 'bg-slate-800 border-slate-600'}">
    <div class="text-5xl mb-4">🏆</div>
    <h2 class="text-2xl font-bold mb-6">{pendingWinner === 'player1' ? getMemberName(currentMatch?.player1Id) : getMemberName(currentMatch?.player2Id)} wins!</h2>
    <div class="grid grid-cols-2 gap-3">
      <button onclick={confirmWin} class="py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold">Confirm</button>
      <button onclick={() => { if (pendingWinner) undoScore(pendingWinner); }} class="py-3 rounded-lg bg-slate-700">Undo</button>
    </div>
  </div>
</div>
{/if}

{#if showQueuePanel}
<div class="fixed inset-0 bg-black/50 z-40" onclick={() => showQueuePanel = false}></div>
<div class="fixed right-0 top-0 bottom-0 w-72 bg-[#0f1a24] border-l border-[#1e3a5f] z-50 p-4 overflow-auto">
  <div class="flex justify-between mb-4"><h3 class="font-bold">Queue</h3><button onclick={() => showQueuePanel = false}>✕</button></div>
  <div class="flex gap-2 mb-4">
    <button onclick={() => selectedCourt = 'A'} class="flex-1 py-2 rounded-lg font-semibold {selectedCourt === 'A' ? 'bg-amber-500 text-black' : 'bg-slate-700'}">A</button>
    <button onclick={() => selectedCourt = 'B'} class="flex-1 py-2 rounded-lg font-semibold {selectedCourt === 'B' ? 'bg-blue-500' : 'bg-slate-700'}">B</button>
  </div>
  <div class="space-y-2">{#each pendingMatches as m}<div class="p-2 rounded bg-slate-800/50 text-sm">{getMemberName(m.player1Id)} vs {getMemberName(m.player2Id)}</div>{/each}</div>
  <div class="mt-4 pt-4 border-t border-slate-700"><a href="/admin" class="block text-center py-2 rounded-lg bg-orange-500/20 text-orange-400">Admin Portal</a></div>
</div>
{/if}
{/if}
