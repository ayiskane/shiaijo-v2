<script lang="ts">
  import { onMount } from 'svelte';
  import autoAnimate from '@formkit/auto-animate';
  import { Button } from '$lib/components/ui/button';
  import * as Select from '$lib/components/ui/select';
  import { Input } from '$lib/components/ui/input';
  import { cn } from '$lib/utils';
  import { Check, Plus, UserPlus, X, ChevronDown, ChevronLeft, ChevronRight, Trash2, Pencil, Users, Search, Filter, RefreshCw } from '@lucide/svelte';

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

  let listContainer: HTMLElement;
  let addMenuOpen = false;
  $: listContainer && autoAnimate(listContainer);

  // Pagination state
  let currentPage = 1;
  let itemsPerPage = 10;
  
  // Reset to page 1 when filters change
  $: if (filteredMembers) currentPage = 1;
  
  // Calculate pagination
  $: totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  $: startIndex = (currentPage - 1) * itemsPerPage;
  $: endIndex = Math.min(startIndex + itemsPerPage, filteredMembers.length);
  $: paginatedMembers = filteredMembers.slice(startIndex, endIndex);
  
  // Generate page numbers to show
  $: pageNumbers = (() => {
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
  })();

  // Page-level selection helper (only current page rows)
  $: pageSelected = paginatedMembers.length > 0 && paginatedMembers.every((m) => selectedMemberIds.has(m._id));

  // Get initials from name
  function getInitials(firstName: string, lastName: string): string {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  }
  
  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
    }
  }

  onMount(() => {
    console.debug('[admin] MembersTab mounted', {
      membersCount: members.length,
      groupsCount: groups.length,
      filteredCount: filteredMembers.length,
      selectedTournament: selectedTournament?._id ?? null,
    });
  });
</script>

<!-- Breadcrumb Header -->
<div class="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-background/95 backdrop-blur-sm">
  <div class="border-b border-border/50 px-4 py-3">
    <div class="text-[0.7rem] text-muted-foreground">
      Admin / <span class="text-foreground">Member Management</span>
    </div>
  </div>

  <!-- Quick Actions - Compact Toolbar Style -->
  {#if selectedTournament}
  <div class="border-b border-border/50 bg-surface/40 px-4 py-2.5">
    <div class="flex items-center gap-4">
      <!-- Left section: Icon + Title + Badge -->
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-500/15">
          <RefreshCw class="h-4 w-4 text-indigo-400" />
        </div>
        <span class="text-[0.85rem] font-semibold text-foreground">Quick Actions</span>
        <span class="px-2 py-0.5 rounded text-[0.6rem] font-medium bg-surface-elevated text-muted-foreground">
          {participants.length} registered
        </span>
      </div>
      
      <!-- Divider -->
      <div class="w-px h-5 bg-border/60"></div>
      
      <!-- Action buttons -->
      <div class="flex items-center gap-2">
        <Button size="sm" variant="secondary" class="h-8 px-2.5 text-[0.7rem] rounded-md border border-border/60 bg-surface/50 hover:bg-accent/10" onclick={onAddAllParticipants}>
          <UserPlus class="mr-1.5 h-3.5 w-3.5" /> Register all
        </Button>
        <Button size="sm" variant="outline" class="h-8 px-2.5 text-[0.7rem] rounded-md border-border/60" onclick={onClearAllParticipants}>
          <X class="mr-1.5 h-3.5 w-3.5" /> Clear all
        </Button>

        <div class="relative" role="group" onmouseleave={() => addMenuOpen = false}>
          <div class="flex rounded-md overflow-hidden border border-border/60 bg-card/50">
            <Button size="sm" class="h-8 px-2.5 text-[0.7rem] rounded-none" onclick={onOpenAddMember}>
              <Plus class="mr-1.5 h-3.5 w-3.5" /> Add
            </Button>
            <button
              class="px-2 h-8 bg-card/40 hover:bg-accent/20 border-l border-border/60 text-muted-foreground"
              aria-label="More add options"
              aria-haspopup="menu"
              aria-expanded={addMenuOpen}
              aria-controls="add-menu-options"
              onclick={() => addMenuOpen = !addMenuOpen}
            >
              <ChevronDown class="h-3.5 w-3.5" />
            </button>
          </div>
          {#if addMenuOpen}
            <div id="add-menu-options" class="absolute mt-1 w-44 rounded-lg border border-border/60 bg-popover shadow-xl p-1.5 z-20" role="menu">
              <button class="w-full text-left px-2.5 py-1.5 rounded hover:bg-accent/20 text-[0.7rem]" role="menuitem" onclick={() => { addMenuOpen = false; onOpenAddMember(); }}>Add single</button>
              <button class="w-full text-left px-2.5 py-1.5 rounded hover:bg-accent/20 text-[0.7rem]" role="menuitem" onclick={() => { addMenuOpen = false; resetMassMembers(); onOpenMassAdd(); }}>Bulk add</button>
              <button class="w-full text-left px-2.5 py-1.5 rounded hover:bg-accent/20 text-[0.7rem]" role="menuitem" onclick={() => { addMenuOpen = false; onOpenImportCSV(); }}>Import CSV</button>
            </div>
          {/if}
        </div>

        <Button size="sm" variant="secondary" class="h-8 px-2.5 text-[0.7rem] rounded-md border border-border/60 bg-surface/50 hover:bg-accent/10" onclick={onOpenMassEdit}>
          <Pencil class="mr-1.5 h-3.5 w-3.5" /> Edit
        </Button>
        {#if selectedMemberIds.size > 0}
          <Button size="sm" variant="secondary" class="h-8 px-2.5 text-[0.7rem] rounded-md border border-border/60 bg-surface/50 hover:bg-accent/10" onclick={onRegisterSelectedMembers}>
            <Check class="mr-1.5 h-3.5 w-3.5" /> Register ({selectedMemberIds.size})
          </Button>
        {/if}
      </div>

      <!-- Spacer -->
      <div class="flex-1"></div>
      
      <!-- Search box -->
      <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border/50 w-48">
        <Search class="h-3.5 w-3.5 text-muted-foreground/60" />
        <input 
          type="text" 
          placeholder="Search..." 
          value={searchQuery}
          oninput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
          class="bg-transparent border-none outline-none text-[0.7rem] text-foreground w-full placeholder:text-muted-foreground/50"
        />
        {#if searchQuery}
          <button onclick={() => onSearchChange('')} class="text-muted-foreground hover:text-foreground">
            <X class="h-3 w-3" />
          </button>
        {/if}
      </div>
      
      <!-- Registration filter tabs -->
      <div class="flex items-center gap-1">
        <button 
          class={cn(
            "px-2.5 py-1 rounded text-[0.65rem] font-medium transition-colors",
            registrationFilter === 'all' 
              ? "bg-indigo-500/15 text-indigo-400" 
              : "bg-transparent text-muted-foreground hover:text-foreground"
          )}
          onclick={() => onRegistrationFilterChange('all')}
        >All</button>
        <button 
          class={cn(
            "px-2.5 py-1 rounded text-[0.65rem] font-medium transition-colors",
            registrationFilter === 'registered' 
              ? "bg-indigo-500/15 text-indigo-400" 
              : "bg-transparent text-muted-foreground hover:text-foreground"
          )}
          onclick={() => onRegistrationFilterChange('registered')}
        >Registered</button>
        <button 
          class={cn(
            "px-2.5 py-1 rounded text-[0.65rem] font-medium transition-colors",
            registrationFilter === 'unregistered' 
              ? "bg-indigo-500/15 text-indigo-400" 
              : "bg-transparent text-muted-foreground hover:text-foreground"
          )}
          onclick={() => onRegistrationFilterChange('unregistered')}
        >Unregistered</button>
      </div>
    </div>
  </div>
  {/if}
</div> <!-- end sticky header -->

  
<!-- Data Table Card -->
<div class="table-card mt-4" bind:this={listContainer}>
  <div class="table-hero flex flex-wrap items-center gap-3 px-4 sm:px-5 pt-4 pb-3 border-b border-border/70">
    <div class="flex items-center gap-3 mr-4">
      <div class="h-11 w-11 rounded-xl bg-indigo-900/60 border border-border/60 flex items-center justify-center">
        <Users class="h-5 w-5 text-accent-foreground" />
      </div>
      <div>
        <p class="text-[18px] font-semibold leading-tight">Member Directory</p>
        <p class="text-[13px] text-muted-foreground">Showing {startIndex + 1}–{endIndex} of {filteredMembers.length}</p>
      </div>
    </div>

    <div class="flex-1"></div>

    <div class="flex items-center gap-3">
      <Select.Root value={filterGroup} onValueChange={(v) => onFilterGroupChange(v)}>
        <Select.Trigger class="glass-input h-9 min-w-[140px] rounded-lg pl-3 pr-6 text-[13px] font-medium">
          <Select.Value placeholder="All groups" />
        </Select.Trigger>
        <Select.Content class="z-40 min-w-[180px]">
          <Select.Group>
            <Select.Label class="px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Groups</Select.Label>
            <Select.Item value="all">All groups</Select.Item>
            {#each groups as g (g.groupId)}
              {#if g.groupId}
                <Select.Item value={g.groupId}>{g.name}</Select.Item>
              {/if}
            {/each}
          </Select.Group>
        </Select.Content>
      </Select.Root>

      {#if filterGroup !== 'all' || registrationFilter !== 'all' || searchQuery}
        <button
          onclick={onResetFilters}
          class="px-2.5 py-1.5 rounded-md text-[12px] font-semibold text-primary hover:text-primary/80 hover:bg-primary/5"
        >
          Clear filters
        </button>
      {/if}

      <span class="hidden sm:inline-flex pill-soft px-2.5 py-1 text-[12px] text-muted-foreground">
        {selectedMemberIds.size} selected
      </span>
    </div>
  </div>
  <!-- Table -->
  <div class="overflow-x-auto">
    <table class="data-table">
      <thead>
        <tr>
          {#if selectedTournament}
            <th style="width: 40px;">
              <input
                type="checkbox"
                checked={pageSelected}
                onchange={() => {
                  if (pageSelected) {
                    paginatedMembers.forEach((m) => {
                      if (selectedMemberIds.has(m._id)) onToggleMemberSelection(m._id);
                    });
                  } else {
                    paginatedMembers.forEach((m) => {
                      if (!selectedMemberIds.has(m._id)) onToggleMemberSelection(m._id);
                    });
                  }
                }}
                class="h-4 w-4 rounded"
                style="accent-color: var(--indigo-primary);"
              />
            </th>
          {/if}
          <th>Member</th>
          <th>Group</th>
          {#if selectedTournament}
            <th>Status</th>
          {/if}
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#if filteredMembers.length === 0}
          <tr>
            <td colspan={selectedTournament ? 5 : 3} class="py-16 text-center" style="color: var(--text-muted);">
              <Users class="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p class="text-base mb-3">No members found</p>
              {#if searchQuery || filterGroup !== 'all'}
                <button onclick={onResetFilters} class="text-sm hover:underline" style="color: var(--indigo-light);">Clear filters</button>
              {:else}
                <button onclick={onOpenAddMember} class="btn-sm primary mx-auto">Add your first member</button>
              {/if}
            </td>
          </tr>
        {:else}
          {#each paginatedMembers as member (member._id)}
            {@const isRegistered = registeredMemberIds.has(member._id)}
            {@const isSelected = selectedMemberIds.has(member._id)}
            <tr class={cn(isRegistered && "bg-emerald-950/10")}>
              {#if selectedTournament}
                <td>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onchange={() => onToggleMemberSelection(member._id)}
                    class="h-4 w-4 rounded"
                    style="accent-color: var(--indigo-primary);"
                  />
                </td>
              {/if}
              <td>
                <div class="cell-member">
                  <div class="cell-avatar">{getInitials(member.firstName, member.lastName)}</div>
                  <div>
                    <div class="cell-name">{member.lastName}, {member.firstName}</div>
                  </div>
                </div>
              </td>
              <td>
                <span class="cell-badge" class:dan={getGroupName(member.groupId).includes('Dan')} class:kyu={getGroupName(member.groupId).includes('Kyu')}>
                  {getGroupName(member.groupId)}
                </span>
              </td>
              {#if selectedTournament}
                <td>
                  <button
                    onclick={() => onToggleMemberRegistration(member._id)}
                    class={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold uppercase tracking-wide transition-all",
                    )}
                    style={isRegistered 
                      ? "background: rgba(74, 222, 128, 0.12); color: var(--success); border: 1px solid rgba(74, 222, 128, 0.4);" 
                      : "background: var(--muted); color: var(--text-muted); border: 1px solid var(--border-subtle);"}
                    title={isRegistered ? "Unregister from tournament" : "Register for tournament"}
                  >
                    {#if isRegistered}
                      <Check class="h-3 w-3" /> Registered
                    {:else}
                      <Plus class="h-3 w-3" /> Register
                    {/if}
                  </button>
                </td>
              {/if}
              <td>
                <div class="cell-actions">
                  <button
                    onclick={() => onOpenEditMember(member)}
                    class="action-btn"
                    aria-label="Edit member"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </button>
                  <button
                    onclick={() => onDeleteMember(member._id)}
                    class="action-btn"
                    style="color: var(--error);"
                    aria-label="Delete member"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
  
  <!-- Table Footer with Pagination -->
  <div class="table-footer">
    <div class="table-info">
      Showing {startIndex + 1}–{endIndex} of {filteredMembers.length} members
    </div>
    
    {#if totalPages > 1}
      <div class="pagination">
        <!-- Items per page selector -->
        <div class="pagination-per-page">
          <span>Rows:</span>
          <select bind:value={itemsPerPage} class="pagination-select">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        
        <!-- Page navigation -->
        <div class="pagination-nav">
          <button 
            class="pagination-btn"
            onclick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          
          {#each pageNumbers as page}
            {#if page === '...'}
              <span class="pagination-ellipsis">...</span>
            {:else}
              <button
                class={cn("pagination-btn", currentPage === page && "active")}
                onclick={() => goToPage(page as number)}
              >
                {page}
              </button>
            {/if}
          {/each}
          
          <button 
            class="pagination-btn"
            onclick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
