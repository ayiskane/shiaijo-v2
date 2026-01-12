<script lang="ts">
  import { useConvexClient } from 'convex-svelte';
  import { api } from '../../../convex/_generated/api';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Dialog from '$lib/components/ui/dialog';
  
  const client = useConvexClient();

  // Form state
  let adminPassword = $state('');
  let courtkeeperPassword = $state('');
  let saving = $state<string | null>(null);

  // Confirm modals
  let showClearTournaments = $state(false);
  let showClearMembers = $state(false);

  async function saveAdminPassword() {
    if (!adminPassword.trim()) return;
    saving = 'admin';
    try {
      await client.mutation(api.settings.set, { key: 'adminPassword', value: adminPassword });
      adminPassword = '';
    } catch (e) {
      console.error('Failed to save admin password:', e);
    }
    saving = null;
  }

  async function saveCourtkeeperPassword() {
    if (!courtkeeperPassword.trim()) return;
    saving = 'courtkeeper';
    try {
      await client.mutation(api.settings.set, { key: 'courtkeeperPassword', value: courtkeeperPassword });
      courtkeeperPassword = '';
    } catch (e) {
      console.error('Failed to save courtkeeper password:', e);
    }
    saving = null;
  }

  async function handleClearTournaments() {
    try {
      await client.mutation(api.tournaments.clearAll, {});
    } catch (e) {
      console.error('Failed to clear tournaments:', e);
    } finally {
      showClearTournaments = false;
    }
  }

  async function handleClearMembers() {
    try {
      await client.mutation(api.members.clearAll, {});
    } catch (e) {
      console.error('Failed to clear members:', e);
    } finally {
      showClearMembers = false;
    }
  }
</script>

<svelte:head>
  <title>Settings - Admin Portal</title>
</svelte:head>

<div class="max-w-3xl space-y-8">
  <div class="space-y-2">
    <h1 class="text-2xl font-bold tracking-tight">Settings</h1>
    <p class="text-muted-foreground">Manage portal credentials and maintenance tasks.</p>
  </div>

  <!-- Passwords -->
  <section class="rounded-xl border border-border/60 bg-card/60 shadow-sm">
    <div class="border-b border-border/60 px-6 py-4">
      <h2 class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Passwords</h2>
    </div>

    <div class="divide-y divide-border/60">
      <div class="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-1">
          <div class="text-sm font-semibold">Admin Password</div>
          <div class="text-xs text-muted-foreground">Used for admin portal access.</div>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div class="flex flex-col gap-1">
            <Label for="admin-pass" class="text-xs text-muted-foreground">New password</Label>
            <Input id="admin-pass" type="password" class="w-64" bind:value={adminPassword} disabled={saving === 'admin'} />
          </div>
          <Button onclick={saveAdminPassword} disabled={!adminPassword.trim() || saving === 'admin'}>
            {saving === 'admin' ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div class="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-1">
          <div class="text-sm font-semibold">Courtkeeper Password</div>
          <div class="text-xs text-muted-foreground">Used for courtkeeper portal access.</div>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div class="flex flex-col gap-1">
            <Label for="ck-pass" class="text-xs text-muted-foreground">New password</Label>
            <Input id="ck-pass" type="password" class="w-64" bind:value={courtkeeperPassword} disabled={saving === 'courtkeeper'} />
          </div>
          <Button onclick={saveCourtkeeperPassword} disabled={!courtkeeperPassword.trim() || saving === 'courtkeeper'}>
            {saving === 'courtkeeper' ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  </section>

  <!-- Danger zone -->
  <section class="rounded-xl border border-destructive/30 bg-destructive/5 shadow-sm">
    <div class="border-b border-destructive/30 px-6 py-4 flex items-center justify-between">
      <div>
        <h2 class="text-xs font-semibold uppercase tracking-[0.2em] text-destructive">Danger Zone</h2>
        <p class="text-xs text-muted-foreground mt-1">Destructive actions cannot be undone.</p>
      </div>
    </div>

    <div class="divide-y divide-destructive/20">
      <div class="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-1">
          <div class="text-sm font-semibold">Clear All Tournaments</div>
          <div class="text-xs text-muted-foreground">Deletes tournaments, matches, and results.</div>
        </div>
        <Dialog.Root bind:open={showClearTournaments}>
          <Dialog.Trigger>
            <Button variant="destructive">Clear</Button>
          </Dialog.Trigger>
          <Dialog.Content class="sm:max-w-[420px]">
            <Dialog.Header>
              <Dialog.Title>Confirm clearing tournaments</Dialog.Title>
              <Dialog.Description>
                This will remove all tournaments, matches, and results. This action cannot be undone.
              </Dialog.Description>
            </Dialog.Header>
            <div class="flex justify-end gap-2">
              <Button variant="outline" onclick={() => showClearTournaments = false}>Cancel</Button>
              <Button variant="destructive" onclick={handleClearTournaments}>Confirm</Button>
            </div>
          </Dialog.Content>
        </Dialog.Root>
      </div>

      <div class="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="space-y-1">
          <div class="text-sm font-semibold">Clear All Members</div>
          <div class="text-xs text-muted-foreground">Deletes all member records from roster.</div>
        </div>
        <Dialog.Root bind:open={showClearMembers}>
          <Dialog.Trigger>
            <Button variant="destructive">Clear</Button>
          </Dialog.Trigger>
          <Dialog.Content class="sm:max-w-[420px]">
            <Dialog.Header>
              <Dialog.Title>Confirm clearing members</Dialog.Title>
              <Dialog.Description>
                This will remove all members from the roster. This action cannot be undone.
              </Dialog.Description>
            </Dialog.Header>
            <div class="flex justify-end gap-2">
              <Button variant="outline" onclick={() => showClearMembers = false}>Cancel</Button>
              <Button variant="destructive" onclick={handleClearMembers}>Confirm</Button>
            </div>
          </Dialog.Content>
        </Dialog.Root>
      </div>
    </div>
  </section>
</div>

