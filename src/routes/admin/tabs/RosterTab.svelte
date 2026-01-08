<script lang="ts">
  import { onMount } from 'svelte';
  import autoAnimate from '@formkit/auto-animate';
  import { cn } from '$lib/utils';
  import { IsMobile } from '$lib/hooks/is-mobile.svelte';
  
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import * as Select from '$lib/components/ui/select';
  import * as Card from '$lib/components/ui/card';
  import * as ScrollArea from '$lib/components/ui/scroll-area';
  import { Separator } from '$lib/components/ui/separator';
  
  import { 
    Users, FolderOpen, Search, Plus, Pencil, Trash2, 
    Check, X, ChevronDown, ChevronLeft, ChevronRight, UserPlus
  } from '@lucide/svelte';
  
  export let members: any[] = [];
  export let groups: any[] = [];
  export let participants: any[] = [];
  export let selectedTournament: any = null;
  export let filteredMembers: any[] = [];
  export let searchQuery = '';
  export let filterGroup = 'all';
  export let registrationFilter: 'all' | 'registered' | 'unregistered' = 'all';
  export let registeredMemberIds: Set<string> = new Set();
  export let selectedMemberIds: Set<string> = new Set();
  export let allFilteredSelected = false;
  export let membersByGroupId: Map<string, any[]> = new Map();
  
  export let onSearchChange: (v: string) => void;
  export let onFilterGroupChange: (v: string) => void;
  export let onRegistrationFilterChange: (v: 'all' | 'registered' | 'unregistered') => void;
  export let onResetFilters: () => void;
  export let onOpenAddMember: () => void;
  export let onOpenImportCSV: () => void;
  export let onOpenMassAdd: () => void;
  export let onOpenMassEdit: () => void;
  export let onAddAllParticipants: () => void;
  export let onClearAllParticipants: () => void;
  export let onRegisterSelectedMembers: () => void;
  export let onRegisterGroupMembers: (groupId: string) => void;
  export let onToggleMemberSelection: (id: string) => void;
  export let onClearSelection: () => void;
  export let onToggleMemberRegistration: (id: string) => void;
  export let onOpenEditMember: (member: any) => void;
  export let onDeleteMember: (id: string) => void;
  export let getGroupName: (groupId: string) => string;
  export let resetMassMembers: () => void;
  
  export let onOpenAddGroup: () => void;
  export let onEditGroup: (group: any) => void;
  export let onDeleteGroup: (id: string) => void;
  export let onAddMemberToGroup: (groupId: string) => void;
  
  const isMobile = new IsMobile();
  
  let listContainer: HTMLElement;
  let addMenuOpen = $state(false);
  let mobileSubTab = $state<'members' | 'groups'>('members');
  let selectedGroupIdForFilter = $state<string | null>(null);
  
  $effect(() => {
    if (listContainer) autoAnimate(listContainer);
  });
  
  let currentPage = $state(1);
  let itemsPerPage = $state(10);
  
  $effect(() => {
    if (filteredMembers) currentPage = 1;
  });
  
  let displayedMembers = $derived.by(() => {
    if (selectedGroupIdForFilter && selectedGroupIdForFilter !== 'all') {
      return filteredMembers.filter(m => m.groupId === selectedGroupIdForFilter);
    }
    return filteredMembers;
  });
  
  let totalPages = $derived(Math.ceil(displayedMembers.length / itemsPerPage));
  let startIndex = $derived((currentPage - 1) * itemsPerPage);
  let endIndex = $derived(Math.min(startIndex + itemsPerPage, displayedMembers.length));
  let paginatedMembers = $derived(displayedMembers.slice(startIndex, endIndex));
  
  let pageNumbers = $derived.by(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  });
  
  let boguGroups = $derived(groups.filter(g => !g.isHantei));
  let hanteiGroups = $derived(groups.filter(g => g.isHantei));
  let totalRegistered = $derived(participants.length);
  let pageSelected = $derived(paginatedMembers.length > 0 && paginatedMembers.every((m) => selectedMemberIds.has(m._id)));
  
  function getInitials(firstName: string, lastName: string): string {
    return \`\${firstName?.[0] || ''}\${lastName?.[0] || ''}\`.toUpperCase();
  }
  
  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) currentPage = page;
  }
  
  function selectGroup(groupId: string | null) {
    selectedGroupIdForFilter = groupId;
    currentPage = 1;
  }
  
  onMount(() => {
    console.debug('[admin] RosterTab mounted', { membersCount: members.length, groupsCount: groups.length, isMobile: isMobile.current });
  });
</script>

{#if !isMobile.current}
<!-- Desktop: Master-Detail Split View -->
<div class="h-full flex flex-col">
  <div class="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
    <div class="px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="text-[0.7rem] text-muted-foreground">Admin / <span class="text-foreground font-medium">Roster</span></div>
        <Separator orientation="vertical" class="h-4" />
        <div class="flex items-center gap-3 text-xs">
          <span class="flex items-center gap-1.5"><Users class="h-3.5 w-3.5 text-muted-foreground" /><span class="font-medium">{members.length}</span><span class="text-muted-foreground">members</span></span>
          <span class="flex items-center gap-1.5"><FolderOpen class="h-3.5 w-3.5 text-muted-foreground" /><span class="font-medium">{groups.length}</span><span class="text-muted-foreground">groups</span></span>
          {#if selectedTournament}<Badge variant="secondary" class="text-[0.65rem]"><Check class="h-3 w-3 mr-1" /> {totalRegistered} registered</Badge>{/if}
        </div>
      </div>
      <Button size="sm" variant="outline" onclick={onOpenAddGroup} class="h-8 text-xs"><Plus class="h-3.5 w-3.5 mr-1" /> Group</Button>
    </div>
  </div>
  
  <div class="flex-1 flex min-h-0">
    <!-- Left Panel: Groups -->
    <div class="w-[280px] flex-shrink-0 border-r border-border/50 flex flex-col bg-surface/30">
      <div class="px-4 py-3 border-b border-border/30">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Groups</span>
          <div class="flex items-center gap-1 text-[0.65rem]">
            <span class="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">{boguGroups.length} Bogu</span>
            <span class="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400">{hanteiGroups.length} Hantei</span>
          </div>
        </div>
      </div>
      
      <ScrollArea.Root class="flex-1">
        <div class="p-2 space-y-1">
          <button onclick={() => selectGroup(null)} class={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all", !selectedGroupIdForFilter ? "bg-primary/10 border border-primary/30 text-primary" : "hover:bg-accent/50 text-foreground")}>
            <div class={cn("w-8 h-8 rounded-lg flex items-center justify-center", !selectedGroupIdForFilter ? "bg-primary/20" : "bg-muted")}><Users class="h-4 w-4" /></div>
            <div class="flex-1 min-w-0"><div class="text-sm font-medium truncate">All Members</div><div class="text-[0.65rem] text-muted-foreground">{members.length} total</div></div>
            {#if !selectedGroupIdForFilter}<Check class="h-4 w-4 text-primary" />{/if}
          </button>
          
          <Separator class="my-2" />
          
          {#each groups as group (group._id)}
            {@const groupMembers = membersByGroupId.get(group.groupId) ?? []}
            {@const isSelected = selectedGroupIdForFilter === group.groupId}
            <div class={cn("group relative rounded-lg transition-all", isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-accent/50 border border-transparent")}>
              <button onclick={() => selectGroup(group.groupId)} class="w-full flex items-center gap-3 px-3 py-2.5 text-left">
                <div class={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold", group.isHantei ? "bg-orange-500/20 text-orange-400" : "bg-indigo-500/20 text-indigo-400")}>{group.groupId.slice(0, 2)}</div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2"><span class="text-sm font-medium truncate">{group.name}</span>{#if group.isHantei}<Badge variant="outline" class="text-[0.5rem] px-1 py-0 border-orange-500/50 text-orange-400">H</Badge>{/if}</div>
                  <div class="text-[0.65rem] text-muted-foreground">{groupMembers.length} members</div>
                </div>
                {#if isSelected}<Check class="h-4 w-4 text-primary" />{/if}
              </button>
              <div class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button onclick={(e) => { e.stopPropagation(); onEditGroup({ ...group }); }} class="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil class="h-3 w-3" /></button>
                <button onclick={(e) => { e.stopPropagation(); onDeleteGroup(group._id); }} class="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 class="h-3 w-3" /></button>
              </div>
            </div>
          {/each}
        </div>
      </ScrollArea.Root>
    </div>
    
    <!-- Right Panel: Members Table -->
    <div class="flex-1 flex flex-col min-w-0">
      <div class="px-4 py-2.5 border-b border-border/30 bg-surface/20">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-sm">
            <span class="text-muted-foreground">Showing:</span>
            <span class="font-medium">{selectedGroupIdForFilter ? groups.find(g => g.groupId === selectedGroupIdForFilter)?.name || 'Unknown' : 'All Members'}</span>
            <Badge variant="secondary" class="text-[0.65rem]">{displayedMembers.length}</Badge>
          </div>
          <div class="flex-1"></div>
          
          <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border/50 w-48">
            <Search class="h-3.5 w-3.5 text-muted-foreground/60" />
            <input type="text" placeholder="Search..." value={searchQuery} oninput={(e) => onSearchChange((e.target as HTMLInputElement).value)} class="bg-transparent border-none outline-none text-xs text-foreground w-full placeholder:text-muted-foreground/50" />
            {#if searchQuery}<button onclick={() => onSearchChange('')} class="text-muted-foreground hover:text-foreground"><X class="h-3 w-3" /></button>{/if}
          </div>
          
          {#if selectedTournament}
            <div class="flex items-center gap-1 p-0.5 rounded-lg bg-muted/50">
              {#each [{value:'all',label:'All'},{value:'registered',label:'Registered'},{value:'unregistered',label:'Unregistered'}] as filter}
                <button onclick={() => onRegistrationFilterChange(filter.value as any)} class={cn("px-2.5 py-1 rounded text-[0.65rem] font-medium transition-colors", registrationFilter === filter.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>{filter.label}</button>
              {/each}
            </div>
            <Separator orientation="vertical" class="h-5" />
            <div class="flex items-center gap-1.5">
              <Button size="sm" variant="outline" class="h-7 px-2 text-[0.65rem]" onclick={onAddAllParticipants}><UserPlus class="h-3 w-3 mr-1" /> Register All</Button>
              {#if selectedMemberIds.size > 0}<Button size="sm" class="h-7 px-2 text-[0.65rem]" onclick={onRegisterSelectedMembers}><Check class="h-3 w-3 mr-1" /> Register ({selectedMemberIds.size})</Button>{/if}
            </div>
          {/if}
          
          <div class="relative" role="group" onmouseleave={() => addMenuOpen = false}>
            <div class="flex rounded-md overflow-hidden border border-border/60">
              <Button size="sm" class="h-7 px-2 text-[0.65rem] rounded-none" onclick={onOpenAddMember}><Plus class="h-3 w-3 mr-1" /> Add</Button>
              <button class="px-1.5 h-7 bg-primary/90 hover:bg-primary border-l border-primary-foreground/20 text-primary-foreground" onclick={() => addMenuOpen = !addMenuOpen}><ChevronDown class="h-3 w-3" /></button>
            </div>
            {#if addMenuOpen}
              <div class="absolute right-0 mt-1 w-36 rounded-lg border border-border/60 bg-popover shadow-xl p-1 z-20">
                <button class="w-full text-left px-2.5 py-1.5 rounded hover:bg-accent/20 text-xs" onclick={() => { addMenuOpen = false; onOpenAddMember(); }}>Add single</button>
                <button class="w-full text-left px-2.5 py-1.5 rounded hover:bg-accent/20 text-xs" onclick={() => { addMenuOpen = false; resetMassMembers(); onOpenMassAdd(); }}>Bulk add</button>
                <button class="w-full text-left px-2.5 py-1.5 rounded hover:bg-accent/20 text-xs" onclick={() => { addMenuOpen = false; onOpenImportCSV(); }}>Import CSV</button>
              </div>
            {/if}
          </div>
        </div>
      </div>
      
      <div class="flex-1 overflow-auto">
        <table class="data-table w-full">
          <thead class="sticky top-0 bg-background z-5">
            <tr>
              {#if selectedTournament}<th class="w-10"><input type="checkbox" checked={pageSelected} onchange={() => { if (pageSelected) { paginatedMembers.forEach((m) => { if (selectedMemberIds.has(m._id)) onToggleMemberSelection(m._id); }); } else { paginatedMembers.forEach((m) => { if (!selectedMemberIds.has(m._id)) onToggleMemberSelection(m._id); }); } }} class="h-4 w-4 rounded" style="accent-color: var(--indigo-primary);" /></th>{/if}
              <th>Member</th>
              <th>Group</th>
              {#if selectedTournament}<th>Status</th>{/if}
              <th class="w-20"></th>
            </tr>
          </thead>
          <tbody bind:this={listContainer}>
            {#if displayedMembers.length === 0}
              <tr><td colspan={selectedTournament ? 5 : 3} class="py-16 text-center text-muted-foreground"><Users class="h-12 w-12 mx-auto mb-4 opacity-40" /><p class="text-base mb-3">No members found</p>{#if searchQuery || selectedGroupIdForFilter}<button onclick={() => { onSearchChange(''); selectGroup(null); }} class="text-sm text-primary hover:underline">Clear filters</button>{:else}<Button size="sm" onclick={onOpenAddMember}>Add your first member</Button>{/if}</td></tr>
            {:else}
              {#each paginatedMembers as member (member._id)}
                {@const isRegistered = registeredMemberIds.has(member._id)}
                {@const isSelected = selectedMemberIds.has(member._id)}
                <tr class={cn(isRegistered && "bg-emerald-950/10")}>
                  {#if selectedTournament}<td><input type="checkbox" checked={isSelected} onchange={() => onToggleMemberSelection(member._id)} class="h-4 w-4 rounded" style="accent-color: var(--indigo-primary);" /></td>{/if}
                  <td><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">{getInitials(member.firstName, member.lastName)}</div><span class="font-medium">{member.lastName}, {member.firstName}</span></div></td>
                  <td><Badge variant="outline" class={cn("text-[0.65rem]", getGroupName(member.groupId).includes('Dan') && "border-indigo-500/50 text-indigo-400", getGroupName(member.groupId).includes('Kyu') && "border-blue-500/50 text-blue-400")}>{getGroupName(member.groupId)}</Badge></td>
                  {#if selectedTournament}<td><button onclick={() => onToggleMemberRegistration(member._id)} class={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[0.65rem] font-semibold uppercase tracking-wide transition-all", isRegistered ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40" : "bg-muted text-muted-foreground border border-border/50")}>{#if isRegistered}<Check class="h-3 w-3" /> Registered{:else}<Plus class="h-3 w-3" /> Register{/if}</button></td>{/if}
                  <td><div class="flex items-center gap-1 justify-end"><button onclick={() => onOpenEditMember(member)} class="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil class="h-3.5 w-3.5" /></button><button onclick={() => onDeleteMember(member._id)} class="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"><Trash2 class="h-3.5 w-3.5" /></button></div></td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
      
      {#if displayedMembers.length > 0}
        <div class="px-4 py-2.5 border-t border-border/30 bg-surface/20 flex items-center justify-between text-xs">
          <span class="text-muted-foreground">Showing {startIndex + 1}–{endIndex} of {displayedMembers.length}</span>
          {#if totalPages > 1}
            <div class="flex items-center gap-2">
              <span class="text-muted-foreground">Rows:</span>
              <select bind:value={itemsPerPage} class="px-2 py-1 rounded border border-border/50 bg-background text-xs"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select>
              <div class="flex items-center gap-1 ml-4">
                <button onclick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} class="p-1 rounded hover:bg-muted disabled:opacity-50"><ChevronLeft class="h-4 w-4" /></button>
                {#each pageNumbers as page}{#if page === '...'}<span class="px-2">...</span>{:else}<button onclick={() => goToPage(page as number)} class={cn("w-7 h-7 rounded text-xs font-medium", currentPage === page ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{page}</button>{/if}{/each}
                <button onclick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} class="p-1 rounded hover:bg-muted disabled:opacity-50"><ChevronRight class="h-4 w-4" /></button>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

{:else}
<!-- Mobile: Tabbed Interface -->
<div class="flex flex-col h-full">
  <div class="px-4 py-3 bg-background/95 border-b border-border/50">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold">Roster</h2>
      <div class="flex items-center gap-2">
        <Badge variant="secondary" class="text-[0.65rem]"><Users class="h-3 w-3 mr-1" /> {members.length}</Badge>
        <Badge variant="secondary" class="text-[0.65rem]"><FolderOpen class="h-3 w-3 mr-1" /> {groups.length}</Badge>
      </div>
    </div>
    <div class="flex gap-1 p-1 bg-muted/50 rounded-lg">
      <button onclick={() => mobileSubTab = 'members'} class={cn("flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all", mobileSubTab === 'members' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}><Users class="h-4 w-4" />Members<Badge variant="outline" class="text-[0.6rem] px-1.5">{members.length}</Badge></button>
      <button onclick={() => mobileSubTab = 'groups'} class={cn("flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all", mobileSubTab === 'groups' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}><FolderOpen class="h-4 w-4" />Groups<Badge variant="outline" class="text-[0.6rem] px-1.5">{groups.length}</Badge></button>
    </div>
  </div>
  
  {#if mobileSubTab === 'members'}
    <div class="flex-1 flex flex-col min-h-0">
      <div class="px-4 py-2.5 border-b border-border/30 space-y-2">
        <div class="flex items-center gap-2">
          <div class="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/30">
            <Search class="h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search members..." value={searchQuery} oninput={(e) => onSearchChange((e.target as HTMLInputElement).value)} class="flex-1 bg-transparent border-none outline-none text-sm" />
            {#if searchQuery}<button onclick={() => onSearchChange('')}><X class="h-4 w-4 text-muted-foreground" /></button>{/if}
          </div>
          <Button size="icon" variant="outline" class="h-10 w-10" onclick={onOpenAddMember}><Plus class="h-4 w-4" /></Button>
        </div>
        <div class="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <Select.Root onSelectedChange={(v) => v && onFilterGroupChange(v.value as string)}>
            <Select.Trigger class="h-8 text-xs min-w-[100px]"><Select.Value placeholder="All Groups" /></Select.Trigger>
            <Select.Content><Select.Item value="all">All Groups</Select.Item>{#each groups as group}<Select.Item value={group.groupId}>{group.name}</Select.Item>{/each}</Select.Content>
          </Select.Root>
          {#if selectedTournament}{#each [{value:'all',label:'All'},{value:'registered',label:'✓ Reg'},{value:'unregistered',label:'○ Unreg'}] as filter}<button onclick={() => onRegistrationFilterChange(filter.value as any)} class={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all", registrationFilter === filter.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{filter.label}</button>{/each}{/if}
        </div>
      </div>
      <div class="flex-1 overflow-auto">
        <div class="p-4 space-y-2">
          {#if displayedMembers.length === 0}
            <div class="text-center py-12"><Users class="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" /><p class="text-muted-foreground mb-4">No members found</p><Button size="sm" onclick={onOpenAddMember}>Add Member</Button></div>
          {:else}
            {#each paginatedMembers as member (member._id)}
              {@const isRegistered = registeredMemberIds.has(member._id)}
              <div class={cn("p-3 rounded-xl border transition-all", isRegistered ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card border-border/50")}>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">{getInitials(member.firstName, member.lastName)}</div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium truncate">{member.lastName}, {member.firstName}</div>
                    <div class="flex items-center gap-2 mt-0.5"><Badge variant="outline" class="text-[0.6rem]">{getGroupName(member.groupId)}</Badge>{#if isRegistered}<span class="flex items-center gap-1 text-[0.6rem] text-emerald-500"><Check class="h-3 w-3" /> Registered</span>{/if}</div>
                  </div>
                  <div class="flex items-center gap-1">
                    {#if selectedTournament}<button onclick={() => onToggleMemberRegistration(member._id)} class={cn("p-2 rounded-lg transition-all", isRegistered ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground")}>{#if isRegistered}<Check class="h-4 w-4" />{:else}<Plus class="h-4 w-4" />{/if}</button>{/if}
                    <button onclick={() => onOpenEditMember(member)} class="p-2 rounded-lg hover:bg-muted text-muted-foreground"><Pencil class="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
      {#if totalPages > 1}<div class="px-4 py-3 border-t border-border/30 flex items-center justify-between"><span class="text-xs text-muted-foreground">{startIndex + 1}–{endIndex} of {displayedMembers.length}</span><div class="flex items-center gap-2"><Button size="sm" variant="outline" onclick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft class="h-4 w-4" /></Button><span class="text-sm font-medium">{currentPage} / {totalPages}</span><Button size="sm" variant="outline" onclick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRight class="h-4 w-4" /></Button></div></div>{/if}
    </div>
  {:else}
    <div class="flex-1 overflow-auto">
      <div class="p-4 space-y-3">
        <Button class="w-full" variant="outline" onclick={onOpenAddGroup}><Plus class="h-4 w-4 mr-2" /> Add Group</Button>
        {#if groups.length === 0}<div class="text-center py-12"><FolderOpen class="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" /><p class="text-muted-foreground">No groups yet</p></div>
        {:else}
          {#each groups as group (group._id)}
            {@const groupMembers = membersByGroupId.get(group.groupId) ?? []}
            <Card.Root class={cn("overflow-hidden", group.isHantei ? "border-orange-500/30" : "border-border")}>
              <Card.Header class="py-3 px-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class={cn("w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold", group.isHantei ? "bg-orange-500/20 text-orange-400" : "bg-indigo-500/20 text-indigo-400")}>{group.groupId.slice(0, 2)}</div>
                    <div><div class="flex items-center gap-2"><span class="font-semibold">{group.name}</span>{#if group.isHantei}<Badge variant="outline" class="text-[0.55rem] border-orange-500/50 text-orange-400">HANTEI</Badge>{/if}</div><div class="text-xs text-muted-foreground">{groupMembers.length} members</div></div>
                  </div>
                  <div class="flex items-center gap-1">
                    <button onclick={() => onAddMemberToGroup(group.groupId)} class="p-2 rounded-lg hover:bg-muted text-muted-foreground"><UserPlus class="h-4 w-4" /></button>
                    <button onclick={() => onEditGroup({ ...group })} class="p-2 rounded-lg hover:bg-muted text-muted-foreground"><Pencil class="h-4 w-4" /></button>
                    <button onclick={() => onDeleteGroup(group._id)} class="p-2 rounded-lg hover:bg-destructive/20 text-destructive"><Trash2 class="h-4 w-4" /></button>
                  </div>
                </div>
              </Card.Header>
              {#if groupMembers.length > 0}
                <Card.Content class="py-2 px-4 border-t border-border/30">
                  <div class="space-y-1">
                    {#each groupMembers.slice(0, 5) as member}<div class="flex items-center gap-2 py-1.5 text-sm"><div class="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[0.6rem] font-medium">{getInitials(member.firstName, member.lastName)}</div><span class="flex-1 truncate">{member.lastName}, {member.firstName}</span></div>{/each}
                    {#if groupMembers.length > 5}<div class="text-xs text-muted-foreground py-1">+{groupMembers.length - 5} more members</div>{/if}
                  </div>
                </Card.Content>
              {/if}
            </Card.Root>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>
{/if}

<style>
  .data-table { border-collapse: separate; border-spacing: 0; }
  .data-table th { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted-foreground); padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border); }
  .data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
  .data-table tbody tr:hover { background: var(--accent); }
</style>
