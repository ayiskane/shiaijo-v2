<script lang="ts">
  import { useQuery, useConvexClient } from 'convex-svelte';
  import { api } from '../../../convex/_generated/api';
  import type { Doc, Id } from '../../../convex/_generated/dataModel';
  
  // shadcn components
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Select from '$lib/components/ui/select';
  import * as ToggleGroup from '$lib/components/ui/toggle-group';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Checkbox } from '$lib/components/ui/checkbox';
  
  // Icons
  import Search from '@lucide/svelte/icons/search';
  import Plus from '@lucide/svelte/icons/plus';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import UserPlus from '@lucide/svelte/icons/user-plus';

  const client = useConvexClient();

  // Data queries
  const guestsQuery = useQuery(api.members.listGuests, () => ({}));
  const dojosQuery = useQuery(api.dojos.list, () => ({}));
  const groupsQuery = useQuery(api.groups.list, () => ({}));
  const tournamentsQuery = useQuery(api.tournaments.list, () => ({}));
  const participantsQuery = useQuery(api.participants.listAll, () => ({}));

  // Derived data
  let guests = $derived(guestsQuery.data ?? []);
  let dojos = $derived(dojosQuery.data ?? []);
  let groups = $derived(groupsQuery.data ?? []);
  let tournaments = $derived(tournamentsQuery.data ?? []);
  let participants = $derived(participantsQuery.data ?? []);
  
  let activeTournament = $derived(tournaments.find(t => t.status === 'in_progress' || t.status === 'setup'));
  
  function isRegistered(memberId: Id<'members'>) {
    if (!activeTournament) return false;
    return participants.some(p => p.memberId === memberId && p.tournamentId === activeTournament._id);
  }
  
  function getRegisteredGroup(memberId: Id<'members'>) {
    if (!activeTournament) return null;
    const participant = participants.find(p => p.memberId === memberId && p.tournamentId === activeTournament._id);
    if (!participant) return null;
    return groups.find(g => g.groupId === participant.groupId);
  }
  
  let registeredCount = $derived(() => {
    if (!activeTournament) return 0;
    return guests.filter(g => !g.archived && isRegistered(g._id)).length;
  });

  // UI State
  let selectedDojoId = $state<Id<'dojos'> | null>(null);
  let searchQuery = $state('');
  let filterStatus = $state<'all' | 'registered' | 'unregistered'>('all');
  let currentPage = $state(1);
  let rowsPerPage = $state(10);
  let dojosEditMode = $state(false);
  
  // Modal state
  let showAddGuestModal = $state(false);
  let editingGuest = $state<Doc<'members'> | null>(null);
  let showDeleteGuestConfirm = $state<Id<'members'> | null>(null);
  
  // Dojo modal state
  let showDojoModal = $state(false);
  let editingDojo = $state<Doc<'dojos'> | null>(null);
  let dojoFormName = $state('');
  let dojoFormLocation = $state('');
  let showDeleteDojoConfirm = $state<Id<'dojos'> | null>(null);
  
  // Guest form state
  let formFirstName = $state('');
  let formLastName = $state('');
  let formDojoId = $state<Id<'dojos'> | undefined>(undefined);
  
  // Registration modal state
  let showRegisterModal = $state(false);
  let registeringGuest = $state<Doc<'members'> | null>(null);
  let selectedGroupId = $state<string>('');

  function getGuestCount(dojoId: Id<'dojos'> | null) {
    if (dojoId === null) return guests.filter(g => !g.archived).length;
    return guests.filter(g => g.dojoId === dojoId && !g.archived).length;
  }

  function getDojo(dojoId: Id<'dojos'> | undefined) {
    if (!dojoId) return null;
    return dojos.find(d => d._id === dojoId);
  }

  let filteredGuests = $derived(() => {
    let result = guests.filter(g => !g.archived);
    if (selectedDojoId) result = result.filter(g => g.dojoId === selectedDojoId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g => g.firstName.toLowerCase().includes(q) || g.lastName.toLowerCase().includes(q));
    }
    if (filterStatus === 'registered') result = result.filter(g => isRegistered(g._id));
    else if (filterStatus === 'unregistered') result = result.filter(g => !isRegistered(g._id));
    return result;
  });

  let totalPages = $derived(Math.ceil(filteredGuests().length / rowsPerPage));
  let paginatedGuests = $derived(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredGuests().slice(start, start + rowsPerPage);
  });

  $effect(() => { selectedDojoId; searchQuery; filterStatus; currentPage = 1; });

  function getDojoIcon(dojo: Doc<'dojos'>) {
    const name = dojo.name.toLowerCase();
    if (name.includes('seattle')) return '⚔️';
    if (name.includes('bellevue')) return '🎋';
    if (name.includes('portland')) return '🗻';
    if (name.includes('vancouver')) return '🍁';
    return '🏠';
  }

  function openAddGuestModal() {
    formFirstName = ''; formLastName = ''; formDojoId = dojos[0]?._id; editingGuest = null; showAddGuestModal = true;
  }

  function openEditGuestModal(guest: Doc<'members'>) {
    formFirstName = guest.firstName; formLastName = guest.lastName; formDojoId = guest.dojoId; editingGuest = guest; showAddGuestModal = true;
  }

  function openAddDojoModal() {
    dojoFormName = ''; dojoFormLocation = ''; editingDojo = null; showDojoModal = true;
  }

  function openEditDojoModal(dojo: Doc<'dojos'>) {
    dojoFormName = dojo.name; dojoFormLocation = dojo.location || ''; editingDojo = dojo; showDojoModal = true;
  }

  function openRegisterModal(guest: Doc<'members'>) {
    registeringGuest = guest; selectedGroupId = groups[0]?.groupId || ''; showRegisterModal = true;
  }

  async function saveGuest() {
    if (!formFirstName.trim() || !formLastName.trim()) return;
    if (editingGuest) {
      await client.mutation(api.members.update, { id: editingGuest._id, firstName: formFirstName.trim(), lastName: formLastName.trim(), dojoId: formDojoId });
    } else {
      await client.mutation(api.members.create, { firstName: formFirstName.trim(), lastName: formLastName.trim(), groupId: 'GUEST', isGuest: true, dojoId: formDojoId });
    }
    showAddGuestModal = false;
  }

  async function deleteGuest(id: Id<'members'>) {
    await client.mutation(api.members.remove, { id });
    showDeleteGuestConfirm = null;
  }

  async function saveDojo() {
    if (!dojoFormName.trim()) return;
    if (editingDojo) {
      await client.mutation(api.dojos.update, { id: editingDojo._id, name: dojoFormName.trim(), location: dojoFormLocation.trim() || undefined });
    } else {
      await client.mutation(api.dojos.create, { name: dojoFormName.trim(), location: dojoFormLocation.trim() || undefined });
    }
    showDojoModal = false;
  }

  async function deleteDojo(id: Id<'dojos'>) {
    await client.mutation(api.dojos.remove, { id });
    showDeleteDojoConfirm = null;
    if (selectedDojoId === id) selectedDojoId = null;
  }

  async function registerGuest() {
    if (!registeringGuest || !activeTournament || !selectedGroupId) return;
    await client.mutation(api.participants.register, { tournamentId: activeTournament._id, memberId: registeringGuest._id, groupId: selectedGroupId });
    showRegisterModal = false; registeringGuest = null;
  }

  let selectedDojoName = $derived(() => {
    if (!selectedDojoId) return 'All Guests';
    return dojos.find(d => d._id === selectedDojoId)?.name || 'All Guests';
  });
</script>

<div class="guests-page">
  <aside class="dojo-panel" class:editing={dojosEditMode}>
    <div class="dojo-panel-header">
      <div class="dojo-header-top">
        {#if dojosEditMode}<span class="dojo-title editing">✎ Editing</span>{:else}<span class="dojo-title">Dojos</span>{/if}
        <div class="dojo-header-actions">
          {#if dojosEditMode}
            <Button variant="default" size="sm" onclick={() => dojosEditMode = false}>Done</Button>
          {:else}
            <Button variant="ghost" size="sm" onclick={() => dojosEditMode = true}>Edit</Button>
            <Button variant="ghost" size="sm" onclick={openAddDojoModal}><Plus size={14} /></Button>
          {/if}
        </div>
      </div>
    </div>
    <div class="dojo-list">
      <button class="dojo-card" class:selected={selectedDojoId === null} onclick={() => { if (!dojosEditMode) selectedDojoId = null; }} disabled={dojosEditMode}>
        <div class="dojo-icon"><span class="dojo-emoji">🏠</span></div>
        <div class="dojo-info"><span class="dojo-name">All Guests</span></div>
        <span class="dojo-count">{guests.filter(g => !g.archived).length}</span>
      </button>
      {#each dojos as dojo}
        <div class="dojo-card" class:selected={selectedDojoId === dojo._id} class:editing={dojosEditMode} onclick={() => { if (!dojosEditMode) selectedDojoId = dojo._id; }} role="button" tabindex="0">
          <div class="dojo-icon"><span class="dojo-emoji">{getDojoIcon(dojo)}</span></div>
          <div class="dojo-info">
            <span class="dojo-name">{dojo.name}</span>
            {#if dojo.location}<span class="dojo-location">{dojo.location}</span>{/if}
          </div>
          {#if dojosEditMode}
            <div class="dojo-actions">
              <button class="dojo-action-btn" onclick={(e) => { e.stopPropagation(); openEditDojoModal(dojo); }}><Pencil size={12} /></button>
              <button class="dojo-action-btn danger" onclick={(e) => { e.stopPropagation(); showDeleteDojoConfirm = dojo._id; }}><Trash2 size={12} /></button>
            </div>
          {:else}
            <span class="dojo-count">{getGuestCount(dojo._id)}</span>
          {/if}
        </div>
      {/each}
    </div>
  </aside>

  <main class="guests-content">
    <div class="top-bar">
      <div class="top-bar-left">
        <div class="page-title-row">
          <h1 class="page-title">{selectedDojoName()}</h1>
          {#if selectedDojoId}{@const dojo = dojos.find(d => d._id === selectedDojoId)}{#if dojo?.location}<span class="page-location"><MapPin size={12} />{dojo.location}</span>{/if}{/if}
        </div>
      </div>
      <div class="top-bar-stats">
        <div class="stat"><span class="stat-value">{filteredGuests().length}</span><span class="stat-label">Guests</span></div>
        <div class="stat-divider"></div>
        <div class="stat"><span class="stat-value registered">{registeredCount()}</span><span class="stat-label">Registered</span></div>
        <div class="stat-divider"></div>
        <div class="stat"><span class="stat-value muted">{filteredGuests().length - registeredCount()}</span><span class="stat-label">Not Reg.</span></div>
      </div>
      <div class="top-bar-actions"><Button variant="default" onclick={openAddGuestModal}><UserPlus size={16} />Add Guest</Button></div>
    </div>

    <div class="toolbar">
      <div class="search-box"><Search size={16} class="search-icon" /><input type="text" class="search-input" placeholder="Search guests..." bind:value={searchQuery} /></div>
      <ToggleGroup.Root type="single" value={filterStatus} onValueChange={(v) => { if (v) filterStatus = v as typeof filterStatus; }}>
        <ToggleGroup.Item value="all">All</ToggleGroup.Item>
        <ToggleGroup.Item value="registered">Registered</ToggleGroup.Item>
        <ToggleGroup.Item value="unregistered">Not Reg.</ToggleGroup.Item>
      </ToggleGroup.Root>
      <div class="toolbar-spacer"></div>
    </div>

    <div class="table-wrapper">
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th style="width: 44px;"><Checkbox /></th><th style="width: 200px;">Guest</th><th style="width: 180px;">Dojo</th><th style="width: 140px;">Group</th><th style="width: 120px;">Status</th><th style="width: 80px;">Actions</th></tr></thead>
          <tbody>
            {#each paginatedGuests() as guest}
              {@const registeredGroup = getRegisteredGroup(guest._id)}
              {@const guestDojo = getDojo(guest.dojoId)}
              <tr>
                <td><Checkbox /></td>
                <td><span class="guest-name">{guest.firstName} {guest.lastName}</span></td>
                <td>{#if guestDojo}<span class="badge badge-dojo"><span class="dojo-dot"></span>{guestDojo.name}</span>{:else}<span class="text-muted">—</span>{/if}</td>
                <td>{#if registeredGroup}<span class="badge" class:badge-group={!registeredGroup.isHantei} class:badge-hantei={registeredGroup.isHantei}>{registeredGroup.name}</span>{:else}<span class="text-muted">—</span>{/if}</td>
                <td>{#if !activeTournament}<span class="status-no-shiai">No Shiai</span>{:else if isRegistered(guest._id)}<span class="badge badge-registered">✓ Registered</span>{:else}<button class="status-unregistered" onclick={() => openRegisterModal(guest)}>+ Register</button>{/if}</td>
                <td><div class="action-buttons"><button class="action-btn" onclick={() => openEditGuestModal(guest)}><Pencil size={14} /></button><button class="action-btn danger" onclick={() => showDeleteGuestConfirm = guest._id}><Trash2 size={14} /></button></div></td>
              </tr>
            {:else}<tr><td colspan="6" class="empty-state">No guests found</td></tr>{/each}
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <div class="pagination-info"><span>Rows:</span><select class="rows-select" bind:value={rowsPerPage}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={9999}>Show All</option></select><span class="showing">Showing {Math.min((currentPage - 1) * rowsPerPage + 1, filteredGuests().length)} - {Math.min(currentPage * rowsPerPage, filteredGuests().length)} of {filteredGuests().length}</span></div>
        <div class="pagination"><button class="pagination-btn" onclick={() => currentPage = Math.max(1, currentPage - 1)} disabled={currentPage === 1}><ChevronLeft size={16} /></button>{#each Array(Math.min(5, totalPages)) as _, i}{@const pageNum = i + 1}<button class="pagination-btn" class:active={currentPage === pageNum} onclick={() => currentPage = pageNum}>{pageNum}</button>{/each}<button class="pagination-btn" onclick={() => currentPage = Math.min(totalPages, currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight size={16} /></button></div>
      </div>
    </div>
  </main>
</div>

<Dialog.Root bind:open={showAddGuestModal}><Dialog.Content><Dialog.Header><Dialog.Title>{editingGuest ? 'Edit Guest' : 'Add Guest'}</Dialog.Title><Dialog.Description>{editingGuest ? 'Update guest information' : 'Add a new guest from another dojo'}</Dialog.Description></Dialog.Header><div class="form-grid"><div class="form-group"><Label for="firstName">First Name</Label><Input id="firstName" bind:value={formFirstName} placeholder="First name" /></div><div class="form-group"><Label for="lastName">Last Name</Label><Input id="lastName" bind:value={formLastName} placeholder="Last name" /></div><div class="form-group full-width"><Label for="dojo">Dojo</Label><Select.Root type="single" value={formDojoId} onValueChange={(v) => formDojoId = v as Id<'dojos'>}><Select.Trigger>{#if formDojoId}{dojos.find(d => d._id === formDojoId)?.name || 'Select dojo...'}{:else}Select dojo...{/if}</Select.Trigger><Select.Content>{#each dojos as dojo}<Select.Item value={dojo._id}>{dojo.name}</Select.Item>{/each}</Select.Content></Select.Root></div></div><Dialog.Footer><Button variant="ghost" onclick={() => showAddGuestModal = false}>Cancel</Button><Button onclick={saveGuest} disabled={!formFirstName.trim() || !formLastName.trim()}>{editingGuest ? 'Save Changes' : 'Add Guest'}</Button></Dialog.Footer></Dialog.Content></Dialog.Root>

<Dialog.Root bind:open={showDojoModal}><Dialog.Content><Dialog.Header><Dialog.Title>{editingDojo ? 'Edit Dojo' : 'Add Dojo'}</Dialog.Title><Dialog.Description>{editingDojo ? 'Update dojo information' : 'Add a new dojo/club for guests'}</Dialog.Description></Dialog.Header><div class="form-stack"><div class="form-group"><Label for="dojoName">Dojo Name</Label><Input id="dojoName" bind:value={dojoFormName} placeholder="e.g. Seattle Kendo Kai" /></div><div class="form-group"><Label for="dojoLocation">Location (optional)</Label><Input id="dojoLocation" bind:value={dojoFormLocation} placeholder="e.g. Seattle, WA" /></div></div><Dialog.Footer><Button variant="ghost" onclick={() => showDojoModal = false}>Cancel</Button><Button onclick={saveDojo} disabled={!dojoFormName.trim()}>{editingDojo ? 'Save Changes' : 'Add Dojo'}</Button></Dialog.Footer></Dialog.Content></Dialog.Root>

<Dialog.Root bind:open={showRegisterModal}><Dialog.Content><Dialog.Header><Dialog.Title>Register Guest</Dialog.Title><Dialog.Description>{#if registeringGuest}{registeringGuest.firstName} {registeringGuest.lastName}{#if registeringGuest.dojoId}{@const dojo = getDojo(registeringGuest.dojoId)}{#if dojo} · {dojo.name}{/if}{/if}{/if}</Dialog.Description></Dialog.Header><div class="form-group"><Label>Select Competition Group</Label><div class="group-options">{#each groups as group}<button class="group-option" class:selected={selectedGroupId === group.groupId} onclick={() => selectedGroupId = group.groupId}><div class="group-option-radio"></div><div class="group-option-info"><span class="group-option-name">{group.name}</span></div>{#if group.isHantei}<span class="badge badge-hantei-small">H</span>{/if}</button>{/each}</div></div><Dialog.Footer><Button variant="ghost" onclick={() => showRegisterModal = false}>Cancel</Button><Button variant="default" onclick={registerGuest} disabled={!selectedGroupId}>Register</Button></Dialog.Footer></Dialog.Content></Dialog.Root>

<Dialog.Root open={showDeleteGuestConfirm !== null} onOpenChange={(open) => { if (!open) showDeleteGuestConfirm = null; }}><Dialog.Content><Dialog.Header><Dialog.Title>Delete Guest</Dialog.Title><Dialog.Description>Are you sure you want to delete this guest? This action cannot be undone.</Dialog.Description></Dialog.Header><Dialog.Footer><Button variant="ghost" onclick={() => showDeleteGuestConfirm = null}>Cancel</Button><Button variant="destructive" onclick={() => showDeleteGuestConfirm && deleteGuest(showDeleteGuestConfirm)}>Delete</Button></Dialog.Footer></Dialog.Content></Dialog.Root>

<Dialog.Root open={showDeleteDojoConfirm !== null} onOpenChange={(open) => { if (!open) showDeleteDojoConfirm = null; }}><Dialog.Content><Dialog.Header><Dialog.Title>Delete Dojo</Dialog.Title><Dialog.Description>Are you sure you want to delete this dojo? Guests from this dojo will have their dojo cleared.</Dialog.Description></Dialog.Header><Dialog.Footer><Button variant="ghost" onclick={() => showDeleteDojoConfirm = null}>Cancel</Button><Button variant="destructive" onclick={() => showDeleteDojoConfirm && deleteDojo(showDeleteDojoConfirm)}>Delete</Button></Dialog.Footer></Dialog.Content></Dialog.Root>

<style>
.guests-page{display:flex;height:calc(100vh - 64px);margin:-24px;overflow:hidden}
.dojo-panel{width:260px;background:#0a0a0c;border-right:1px solid rgba(82,82,91,0.4);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}
.dojo-panel.editing{background:#0c0c0e}
.dojo-panel-header{padding:12px;border-bottom:1px solid rgba(82,82,91,0.4);flex-shrink:0}
.dojo-header-top{display:flex;align-items:center;justify-content:space-between}
.dojo-title{font-size:13px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.05em}
.dojo-title.editing{color:#818cf8}
.dojo-header-actions{display:flex;align-items:center;gap:4px}
.dojo-list{flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:2px}
.dojo-card{display:flex;align-items:center;gap:10px;padding:10px 12px;background:transparent;border:1px solid transparent;border-radius:8px;cursor:pointer;transition:all 0.15s;text-align:left;width:100%;font:inherit;color:inherit}
.dojo-card:hover:not(:disabled){background:#18181b}
.dojo-card.selected{background:rgba(129,140,248,0.15);border-color:rgba(129,140,248,0.4)}
.dojo-card.editing{border:1px dashed rgba(129,140,248,0.4);cursor:default}
.dojo-card:disabled{opacity:0.5;cursor:not-allowed}
.dojo-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:rgba(129,140,248,0.15)}
.dojo-emoji{font-size:16px}
.dojo-info{flex:1;min-width:0}
.dojo-name{font-size:14px;font-weight:600;color:#fafafa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.dojo-location{font-size:11px;color:#71717a;display:block}
.dojo-count{min-width:28px;height:24px;padding:0 8px;background:rgba(129,140,248,0.15);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#a78bfa;flex-shrink:0}
.dojo-actions{display:flex;align-items:center;gap:4px}
.dojo-action-btn{width:26px;height:26px;border-radius:6px;background:rgba(82,82,91,0.2);border:none;color:#a1a1aa;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
.dojo-action-btn:hover{background:rgba(82,82,91,0.3);color:#fafafa}
.dojo-action-btn.danger:hover{background:rgba(248,113,113,0.15);color:#f87171}
.guests-content{flex:1;display:flex;flex-direction:column;min-width:0;background:#09090b;overflow:hidden}
.top-bar{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;background:#0a0a0c;border-bottom:1px solid rgba(82,82,91,0.4);min-height:64px;flex-shrink:0}
.top-bar-left{display:flex;flex-direction:column;gap:4px}
.page-title-row{display:flex;align-items:center;gap:12px}
.page-title{font-size:18px;font-weight:700;color:#fafafa;margin:0}
.page-location{display:flex;align-items:center;gap:4px;font-size:13px;color:#71717a}
.top-bar-stats{display:flex;align-items:center;gap:20px}
.stat{text-align:center}
.stat-value{font-size:18px;font-weight:700;color:#fafafa}
.stat-value.registered{color:#34d399}
.stat-value.muted{color:#71717a}
.stat-label{font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#71717a}
.stat-divider{width:1px;height:32px;background:rgba(82,82,91,0.4)}
.top-bar-actions{display:flex;gap:8px}
.toolbar{display:flex;align-items:center;gap:16px;padding:12px 24px;background:#0a0a0c;border-bottom:1px solid rgba(82,82,91,0.4);flex-shrink:0}
.search-box{position:relative;flex:1;max-width:300px}
.search-box :global(.search-icon){position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#52525b;pointer-events:none}
.search-input{width:100%;background:#09090b;border:1px solid rgba(82,82,91,0.4);border-radius:8px;padding:10px 14px 10px 40px;font-size:14px;color:#fafafa;font-family:inherit;transition:border-color 0.15s}
.search-input:focus{outline:none;border-color:#818cf8}
.search-input::placeholder{color:#52525b}
.toolbar-spacer{flex:1}
.table-wrapper{flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.table-container{flex:1;overflow:auto}
.data-table{width:100%;border-collapse:collapse;table-layout:fixed}
.data-table th{text-align:left;padding:12px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#71717a;border-bottom:1px solid rgba(82,82,91,0.4);background:#0a0a0c;position:sticky;top:0;z-index:10}
.data-table td{padding:14px 16px;font-size:14px;color:#fafafa;border-bottom:1px solid rgba(82,82,91,0.4);vertical-align:middle}
.data-table tbody tr:hover{background:#18181b}
.guest-name{font-weight:500}
.empty-state{text-align:center;color:#71717a;padding:48px 16px !important}
.badge{display:inline-flex;align-items:center;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600}
.badge-dojo{background:#27272a;color:#a1a1aa;gap:6px}
.dojo-dot{width:8px;height:8px;border-radius:50%;background:#818cf8}
.badge-group{background:rgba(129,140,248,0.15);color:#a78bfa}
.badge-hantei{background:rgba(251,191,36,0.15);color:#fbbf24}
.badge-registered{background:rgba(52,211,153,0.15);color:#34d399}
.badge-hantei-small{font-size:9px;font-weight:700;color:#fbbf24;background:rgba(251,191,36,0.2);padding:2px 6px;border-radius:4px}
.status-no-shiai{color:#71717a;font-size:13px;font-style:italic}
.status-unregistered{background:none;border:none;color:#818cf8;font-size:13px;cursor:pointer;font-family:inherit;padding:0;transition:color 0.15s}
.status-unregistered:hover{color:#a78bfa}
.text-muted{color:#52525b}
.action-buttons{display:flex;gap:4px}
.action-btn{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#71717a;background:transparent;border:none;cursor:pointer;transition:all 0.15s}
.action-btn:hover{background:#27272a;color:#fafafa}
.action-btn.danger:hover{background:rgba(248,113,113,0.15);color:#f87171}
.table-footer{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#0a0a0c;border-top:1px solid rgba(82,82,91,0.4);flex-shrink:0}
.pagination-info{display:flex;align-items:center;gap:8px;font-size:13px;color:#a1a1aa}
.rows-select{background:#18181b;border:1px solid rgba(82,82,91,0.4);border-radius:6px;padding:4px 8px;color:#fafafa;font-size:13px;font-family:inherit}
.showing{margin-left:8px}
.pagination{display:flex;align-items:center;gap:4px}
.pagination-btn{min-width:32px;height:32px;padding:0 8px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#a1a1aa;background:transparent;border:none;cursor:pointer;transition:all 0.15s;font-family:inherit}
.pagination-btn:hover:not(:disabled){background:#27272a;color:#fafafa}
.pagination-btn.active{background:rgba(129,140,248,0.15);color:#a78bfa}
.pagination-btn:disabled{opacity:0.3;cursor:not-allowed}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.form-grid .full-width{grid-column:1/-1}
.form-stack{display:flex;flex-direction:column;gap:16px}
.form-group{display:flex;flex-direction:column;gap:8px}
.group-options{display:flex;flex-direction:column;gap:8px;margin-top:8px}
.group-option{display:flex;align-items:center;gap:12px;padding:14px 16px;background:#18181b;border:1px solid rgba(82,82,91,0.4);border-radius:10px;cursor:pointer;transition:all 0.15s;text-align:left;width:100%;font:inherit;color:#fafafa}
.group-option:hover{border-color:rgba(129,140,248,0.5)}
.group-option.selected{background:rgba(129,140,248,0.1);border-color:#818cf8}
.group-option-radio{width:18px;height:18px;border:2px solid #52525b;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.group-option.selected .group-option-radio{border-color:#818cf8}
.group-option.selected .group-option-radio::after{content:'';width:10px;height:10px;background:#818cf8;border-radius:50%}
.group-option-info{flex:1}
.group-option-name{font-weight:600;font-size:14px}
@media(max-width:768px){.dojo-panel{display:none}}
</style>
