<script lang="ts">
  import autoAnimate from '@formkit/auto-animate';
  import { cn } from '$lib/utils';
  import * as Card from '$lib/components/ui/card';
  import * as Table from '$lib/components/ui/table';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Select from '$lib/components/ui/select';
  import { History, Search, Download, Eye, ChevronDown, ChevronUp, Trophy, Users, Swords, FolderOpen, Calendar, X } from '@lucide/svelte';

  export let tournaments: any[] = [];
  export let groups: any[] = [];
  export let members: any[] = [];
  export let matchesByTournamentId: Map<string, any[]> = new Map();
  export let participantsByTournamentId: Map<string, any[]> = new Map();

  let listEl: HTMLElement;
  let searchQuery = '';
  let yearFilter = 'all';
  let sizeFilter = 'all';
  let expandedTournamentId: string | null = null;
  
  $: listEl && autoAnimate(listEl);

  // Get unique years from tournaments
  $: availableYears = [...new Set(completedTournaments.map(t => {
    const year = new Date(t.date).getFullYear();
    return isNaN(year) ? null : year;
  }).filter(Boolean))].sort((a, b) => (b as number) - (a as number));

  // Completed tournaments
  $: completedTournaments = tournaments.filter((t) => t.status === 'completed');

  // Apply filters
  $: filteredTournaments = completedTournaments.filter(t => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!t.name.toLowerCase().includes(query)) return false;
    }
    
    // Year filter
    if (yearFilter !== 'all') {
      const year = new Date(t.date).getFullYear();
      if (year.toString() !== yearFilter) return false;
    }
    
    // Size filter
    if (sizeFilter !== 'all') {
      const participants = participantsByTournamentId.get(t._id) ?? [];
      const count = participants.length;
      if (sizeFilter === 'small' && count >= 20) return false;
      if (sizeFilter === 'medium' && (count < 20 || count > 30)) return false;
      if (sizeFilter === 'large' && count <= 30) return false;
    }
    
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Build lookup maps
  $: membersById = new Map(members.map(m => [m._id, m]));
  $: groupsById = new Map(groups.map(g => [g.groupId, g]));

  // Get member name
  function getMemberName(memberId: string): string {
    const member = membersById.get(memberId);
    if (!member) return 'Unknown';
    return `${member.lastName}, ${member.firstName.charAt(0)}.`;
  }

  // Get short member name for badges
  function getShortName(memberId: string): string {
    const member = membersById.get(memberId);
    if (!member) return '?';
    return `${member.lastName} ${member.firstName.charAt(0)}.`;
  }

  // Get tournament stats
  function getTournamentStats(tournamentId: string) {
    const participants = participantsByTournamentId.get(tournamentId) ?? [];
    const matches = matchesByTournamentId.get(tournamentId) ?? [];
    const groupIds = new Set(participants.map(p => p.groupId));
    
    return {
      participantCount: participants.length,
      groupCount: groupIds.size,
      matchCount: matches.length,
      completedMatchCount: matches.filter(m => m.status === 'completed').length
    };
  }

  // Compute division winners for a tournament
  function getDivisionWinners(tournamentId: string): Array<{ groupId: string; groupName: string; winnerId: string; winnerName: string; isHantei: boolean }> {
    const matches = matchesByTournamentId.get(tournamentId) ?? [];
    const participants = participantsByTournamentId.get(tournamentId) ?? [];
    
    if (matches.length === 0 || participants.length === 0) return [];
    
    // Group participants by groupId
    const participantsByGroup = new Map<string, any[]>();
    for (const p of participants) {
      const list = participantsByGroup.get(p.groupId) || [];
      list.push(p);
      participantsByGroup.set(p.groupId, list);
    }
    
    const winners: Array<{ groupId: string; groupName: string; winnerId: string; winnerName: string; isHantei: boolean }> = [];
    
    for (const [groupId, groupParticipants] of participantsByGroup) {
      const group = groupsById.get(groupId);
      const groupName = group?.name || groupId;
      const isHantei = group?.isHantei || false;
      
      // Compute standings for this group
      const stats = new Map<string, { wins: number; ties: number; losses: number; points: number; ippons: number; suddenDeathWins: number }>();
      
      for (const p of groupParticipants) {
        stats.set(p.memberId, { wins: 0, ties: 0, losses: 0, points: 0, ippons: 0, suddenDeathWins: 0 });
      }
      
      const groupMatches = matches.filter(m => m.groupId === groupId);
      
      for (const match of groupMatches) {
        const p1Stats = stats.get(match.player1Id);
        const p2Stats = stats.get(match.player2Id);
        if (!p1Stats || !p2Stats) continue;
        
        // Handle sudden death matches
        if (match.isSuddenDeath) {
          if (match.status === 'completed' && match.winner) {
            if (match.winner === match.player1Id) p1Stats.suddenDeathWins += 1;
            else if (match.winner === match.player2Id) p2Stats.suddenDeathWins += 1;
          }
          continue;
        }
        
        if (match.status !== 'completed') continue;
        
        // Count ippons
        const p1Ippons = match.player1Score?.length || 0;
        const p2Ippons = match.player2Score?.length || 0;
        p1Stats.ippons += p1Ippons;
        p2Stats.ippons += p2Ippons;
        
        // Count wins/losses/ties
        if (match.winner === match.player1Id) {
          p1Stats.wins += 1;
          p2Stats.losses += 1;
        } else if (match.winner === match.player2Id) {
          p2Stats.wins += 1;
          p1Stats.losses += 1;
        } else {
          p1Stats.ties += 1;
          p2Stats.ties += 1;
        }
      }
      
      // Calculate points and sort
      const standings = Array.from(stats.entries()).map(([memberId, s]) => ({
        memberId,
        ...s,
        points: (s.wins * 2) + s.ties
      }));
      
      standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.ippons !== a.ippons) return b.ippons - a.ippons;
        if (b.suddenDeathWins !== a.suddenDeathWins) return b.suddenDeathWins - a.suddenDeathWins;
        return 0;
      });
      
      if (standings.length > 0 && standings[0].points > 0) {
        winners.push({
          groupId,
          groupName,
          winnerId: standings[0].memberId,
          winnerName: getShortName(standings[0].memberId),
          isHantei
        });
      }
    }
    
    // Sort winners: regular groups first, then hantei
    winners.sort((a, b) => {
      if (a.isHantei !== b.isHantei) return a.isHantei ? 1 : -1;
      return a.groupName.localeCompare(b.groupName);
    });
    
    return winners;
  }

  // Get top winner (first division winner) for table display
  function getTopWinner(tournamentId: string): { name: string; initial: string } | null {
    const winners = getDivisionWinners(tournamentId);
    if (winners.length === 0) return null;
    const winner = winners[0];
    const member = membersById.get(winner.winnerId);
    if (!member) return null;
    return {
      name: `${member.lastName} ${member.firstName.charAt(0)}.`,
      initial: member.lastName.charAt(0).toUpperCase()
    };
  }

  // Format date
  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  // Get season icon
  function getSeasonIcon(dateStr: string): string {
    try {
      const month = new Date(dateStr).getMonth();
      if (month >= 2 && month <= 4) return '🌸'; // Spring
      if (month >= 5 && month <= 7) return '☀️'; // Summer
      if (month >= 8 && month <= 10) return '🍂'; // Fall
      return '❄️'; // Winter
    } catch {
      return '📅';
    }
  }

  // Clear filters
  function clearFilters() {
    searchQuery = '';
    yearFilter = 'all';
    sizeFilter = 'all';
  }

  // Check if any filters are active
  $: hasActiveFilters = searchQuery || yearFilter !== 'all' || sizeFilter !== 'all';

  // Toggle expanded row
  function toggleExpanded(tournamentId: string) {
    expandedTournamentId = expandedTournamentId === tournamentId ? null : tournamentId;
  }
</script>

<!-- Top Bar -->
<div class="top-bar">
  <div class="top-bar-left">
    <span class="top-bar-breadcrumb">Admin</span>
    <span class="top-bar-title">Tournament History</span>
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
    <button class="btn-sm ghost">
      <Download class="h-3.5 w-3.5" />
      Export
    </button>
  </div>
</div>

<!-- Toolbar -->
<div class="mb-4 flex flex-wrap items-center gap-3">
  <!-- Search -->
  <div class="relative flex-1 min-w-[200px] max-w-sm">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input 
      type="text" 
      bind:value={searchQuery}
      placeholder="Search tournaments..."
      class="pl-9"
    />
  </div>
  
  <!-- Year Filter -->
  <Select.Root type="single" bind:value={yearFilter}>
    <Select.Trigger class="w-[130px]">
      <Calendar class="h-4 w-4 mr-2 text-muted-foreground" />
      {yearFilter === 'all' ? 'All Years' : yearFilter}
    </Select.Trigger>
    <Select.Content>
      <Select.Item value="all">All Years</Select.Item>
      {#each availableYears as year}
        <Select.Item value={year?.toString() ?? ''}>{year}</Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>
  
  <!-- Size Filter -->
  <Select.Root type="single" bind:value={sizeFilter}>
    <Select.Trigger class="w-[140px]">
      <Users class="h-4 w-4 mr-2 text-muted-foreground" />
      {sizeFilter === 'all' ? 'All Sizes' : sizeFilter === 'small' ? '< 20' : sizeFilter === 'medium' ? '20-30' : '> 30'}
    </Select.Trigger>
    <Select.Content>
      <Select.Item value="all">All Sizes</Select.Item>
      <Select.Item value="small">Small (&lt; 20)</Select.Item>
      <Select.Item value="medium">Medium (20-30)</Select.Item>
      <Select.Item value="large">Large (&gt; 30)</Select.Item>
    </Select.Content>
  </Select.Root>
  
  <!-- Clear Filters -->
  {#if hasActiveFilters}
    <Button variant="ghost" size="sm" onclick={clearFilters} class="text-muted-foreground">
      <X class="h-4 w-4 mr-1" />
      Clear
    </Button>
  {/if}
</div>

{#if filteredTournaments.length === 0}
  <Card.Root class="border-dashed">
    <Card.Content class="flex flex-col items-center justify-center py-12">
      <History class="mb-4 h-12 w-12 text-muted-foreground/50" />
      <p class="text-muted-foreground">
        {#if hasActiveFilters}
          No tournaments match your filters
        {:else}
          No completed tournaments yet
        {/if}
      </p>
      {#if hasActiveFilters}
        <Button variant="ghost" size="sm" onclick={clearFilters} class="mt-2">
          Clear Filters
        </Button>
      {/if}
    </Card.Content>
  </Card.Root>
{:else}
  <Card.Root>
    <div class="rounded-lg border border-border overflow-hidden" bind:this={listEl}>
      <Table.Root>
        <Table.Header>
          <Table.Row class="bg-muted/30 hover:bg-muted/30">
            <Table.Head class="w-[40px]"></Table.Head>
            <Table.Head>Tournament</Table.Head>
            <Table.Head class="hidden sm:table-cell">Date</Table.Head>
            <Table.Head class="text-center hidden md:table-cell">
              <span class="flex items-center justify-center gap-1">
                <Users class="h-3.5 w-3.5" />
              </span>
            </Table.Head>
            <Table.Head class="text-center hidden md:table-cell">
              <span class="flex items-center justify-center gap-1">
                <FolderOpen class="h-3.5 w-3.5" />
              </span>
            </Table.Head>
            <Table.Head class="text-center hidden lg:table-cell">
              <span class="flex items-center justify-center gap-1">
                <Swords class="h-3.5 w-3.5" />
              </span>
            </Table.Head>
            <Table.Head class="hidden lg:table-cell">Top Winner</Table.Head>
            <Table.Head class="text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each filteredTournaments as tournament (tournament._id)}
            {@const stats = getTournamentStats(tournament._id)}
            {@const topWinner = getTopWinner(tournament._id)}
            {@const isExpanded = expandedTournamentId === tournament._id}
            {@const divisionWinners = getDivisionWinners(tournament._id)}
            {@const isRecent = filteredTournaments[0]?._id === tournament._id}
            
            <Table.Row class={cn("cursor-pointer transition-colors", isExpanded && "bg-muted/20")} onclick={() => toggleExpanded(tournament._id)}>
              <Table.Cell class="w-[40px]">
                <button class="p-1 rounded hover:bg-muted/50 transition-colors">
                  {#if isExpanded}
                    <ChevronUp class="h-4 w-4 text-muted-foreground" />
                  {:else}
                    <ChevronDown class="h-4 w-4 text-muted-foreground" />
                  {/if}
                </button>
              </Table.Cell>
              <Table.Cell>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                       style="background: linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 70%, var(--background)) 100%);">
                    {getSeasonIcon(tournament.date)}
                  </div>
                  <div class="min-w-0">
                    <div class="font-medium truncate">{tournament.name}</div>
                    {#if isRecent}
                      <Badge variant="outline" class="text-[10px] border-emerald-500/50 text-emerald-400 mt-0.5">Most Recent</Badge>
                    {/if}
                    <div class="text-xs text-muted-foreground sm:hidden">{formatDate(tournament.date)}</div>
                  </div>
                </div>
              </Table.Cell>
              <Table.Cell class="hidden sm:table-cell text-muted-foreground text-sm">
                {formatDate(tournament.date)}
              </Table.Cell>
              <Table.Cell class="text-center hidden md:table-cell">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium"
                      style="background: color-mix(in srgb, var(--primary) 20%, transparent); color: var(--primary);">
                  {stats.participantCount}
                </span>
              </Table.Cell>
              <Table.Cell class="text-center hidden md:table-cell text-sm">
                {stats.groupCount}
              </Table.Cell>
              <Table.Cell class="text-center hidden lg:table-cell text-sm">
                {stats.matchCount}
              </Table.Cell>
              <Table.Cell class="hidden lg:table-cell">
                {#if topWinner}
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                         style="background: color-mix(in srgb, var(--warning) 20%, transparent); color: var(--warning);">
                      {topWinner.initial}
                    </div>
                    <span class="text-sm">{topWinner.name}</span>
                  </div>
                {:else}
                  <span class="text-muted-foreground text-sm">—</span>
                {/if}
              </Table.Cell>
              <Table.Cell class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" class="h-8 w-8" title="View Results" onclick={(e: MouseEvent) => { e.stopPropagation(); toggleExpanded(tournament._id); }}>
                    <Eye class="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" class="h-8 w-8" title="Export" onclick={(e: MouseEvent) => e.stopPropagation()}>
                    <Download class="h-4 w-4" />
                  </Button>
                </div>
              </Table.Cell>
            </Table.Row>
            
            <!-- Expanded Row: Division Winners -->
            {#if isExpanded}
              <Table.Row class="bg-muted/10 hover:bg-muted/10">
                <Table.Cell colspan={8} class="py-4">
                  <div class="px-4">
                    {#if divisionWinners.length > 0}
                      <div class="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                        <Trophy class="h-3.5 w-3.5 text-warning" />
                        Division Winners
                      </div>
                      <div class="flex flex-wrap gap-2">
                        {#each divisionWinners as winner}
                          <Badge 
                            variant="outline" 
                            class={cn(
                              "text-xs py-1 px-2",
                              winner.isHantei 
                                ? "border-orange-500/50 text-orange-400 bg-orange-500/10" 
                                : "border-amber-500/50 text-amber-400 bg-amber-500/10"
                            )}
                          >
                            <Trophy class="h-3 w-3 mr-1" />
                            {winner.groupName}: {winner.winnerName}
                          </Badge>
                        {/each}
                      </div>
                    {:else}
                      <p class="text-sm text-muted-foreground">No match results available for this tournament.</p>
                    {/if}
                    
                    <!-- Quick Stats for Mobile -->
                    <div class="mt-4 pt-4 border-t border-border md:hidden">
                      <div class="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div class="text-lg font-bold" style="color: var(--primary);">{stats.participantCount}</div>
                          <div class="text-[10px] uppercase text-muted-foreground">Participants</div>
                        </div>
                        <div>
                          <div class="text-lg font-bold">{stats.groupCount}</div>
                          <div class="text-[10px] uppercase text-muted-foreground">Groups</div>
                        </div>
                        <div>
                          <div class="text-lg font-bold">{stats.matchCount}</div>
                          <div class="text-[10px] uppercase text-muted-foreground">Matches</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Table.Cell>
              </Table.Row>
            {/if}
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
    
    <!-- Footer -->
    <div class="px-4 py-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
      <span>Showing {filteredTournaments.length} of {completedTournaments.length} tournaments</span>
    </div>
  </Card.Root>
{/if}

<style>
  /* Ensure table rows are hoverable */
  :global(.history-table-row) {
    transition: background-color 0.15s ease;
  }
</style>
