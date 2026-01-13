<script lang="ts">
  import { useConvexClient } from 'convex-svelte';
  import { api } from '../../../convex/_generated/api';
  import type { Doc } from '../../../convex/_generated/dataModel';
  
  import * as Dialog from '$lib/components/ui/dialog';
  import * as Tabs from '$lib/components/ui/tabs';
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';
  import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
  import ClipboardPaste from '@lucide/svelte/icons/clipboard-paste';

  let { 
    open = $bindable(false), 
    groups 
  }: { 
    open: boolean; 
    groups: Doc<'groups'>[];
  } = $props();

  const client = useConvexClient();

  let importTab = $state('upload');
  let isDragging = $state(false);
  let csvText = $state('');
  let parsedData = $state<Array<{firstName: string; lastName: string; groupId: string; isGuest: boolean}>>([]);
  let parseError = $state('');
  let isImporting = $state(false);
  let importSuccess = $state(false);

  function parseCSV(text: string) {
    parseError = ''; parsedData = [];
    if (!text.trim()) { parseError = 'No data provided'; return; }
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) { parseError = 'CSV must have a header row and at least one data row'; return; }
    const header = lines[0].split(',').map(h => h.toLowerCase().trim().replace(/"/g, ''));
    const firstNameIdx = header.findIndex(h => h.includes('first') || h === 'firstname');
    const lastNameIdx = header.findIndex(h => h.includes('last') || h === 'lastname');
    const groupIdx = header.findIndex(h => h.includes('group') || h === 'groupid');
    if (firstNameIdx === -1 || lastNameIdx === -1) { parseError = 'CSV must have "First Name" and "Last Name" columns'; return; }
    const results: typeof parsedData = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
      const firstName = row[firstNameIdx] || '';
      const lastName = row[lastNameIdx] || '';
      if (!firstName || !lastName) continue;
      let groupId = groupIdx !== -1 ? row[groupIdx] || '' : '';
      if (!groups.some(g => g.groupId === groupId)) groupId = groups[0]?.groupId || '';
      results.push({ firstName, lastName, groupId, isGuest: false });
    }
    if (results.length === 0) { parseError = 'No valid data rows found'; return; }
    parsedData = results;
  }

  function handleFileDrop(e: DragEvent) { e.preventDefault(); isDragging = false; const file = e.dataTransfer?.files[0]; if (file) readFile(file); }
  function handleFileSelect(e: Event) { const file = (e.target as HTMLInputElement).files?.[0]; if (file) readFile(file); }
  function readFile(file: File) {
    if (!file.name.endsWith('.csv')) { parseError = 'Please upload a CSV file'; return; }
    const reader = new FileReader();
    reader.onload = (e) => { csvText = e.target?.result as string; parseCSV(csvText); };
    reader.readAsText(file);
  }

  async function importMembers() {
    if (parsedData.length === 0) return;
    isImporting = true;
    try {
      await client.mutation(api.members.bulkCreate, { members: parsedData });
      importSuccess = true;
      setTimeout(() => { open = false; }, 1500);
    } catch { parseError = 'Error importing members'; }
    isImporting = false;
  }

  // Reset state when modal opens
  $effect(() => {
    if (open) {
      importTab = 'upload';
      csvText = '';
      parsedData = [];
      parseError = '';
      isImporting = false;
      importSuccess = false;
    }
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-[520px]">
    <Dialog.Header>
      <Dialog.Title>Import Members</Dialog.Title>
      <Dialog.Description>Upload CSV or paste data. Required: First Name, Last Name. Optional: Group.</Dialog.Description>
    </Dialog.Header>
    <Tabs.Root bind:value={importTab}>
      <Tabs.List>
        <Tabs.Trigger value="upload"><FileSpreadsheet size={16} />Upload</Tabs.Trigger>
        <Tabs.Trigger value="paste"><ClipboardPaste size={16} />Paste</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="upload">
        <div 
          class="dropzone" 
          class:dragging={isDragging} 
          role="group" 
          ondragover={(e) => { e.preventDefault(); isDragging = true; }} 
          ondragleave={() => isDragging = false} 
          ondrop={handleFileDrop}
        >
          <input type="file" accept=".csv" class="file-input" onchange={handleFileSelect} />
          <FileSpreadsheet size={32} />
          <p>Drop CSV here or click to browse</p>
        </div>
      </Tabs.Content>
      <Tabs.Content value="paste">
        <Textarea placeholder="Paste CSV data here..." bind:value={csvText} oninput={() => csvText && parseCSV(csvText)} rows={6} />
      </Tabs.Content>
    </Tabs.Root>
    {#if parseError}<p class="error">{parseError}</p>{/if}
    {#if parsedData.length > 0}<p class="success">{parsedData.length} members ready to import</p>{/if}
    {#if importSuccess}<p class="success">✓ Import successful!</p>{/if}
    <Dialog.Footer>
      <Button variant="ghost" onclick={() => open = false}>Cancel</Button>
      <Button onclick={importMembers} disabled={parsedData.length === 0 || isImporting}>
        {isImporting ? 'Importing...' : 'Import'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  .dropzone { 
    border: 2px dashed rgba(82, 82, 91, 0.4); 
    border-radius: 12px; 
    padding: 32px; 
    text-align: center; 
    cursor: pointer; 
    position: relative; 
    color: #71717a; 
    transition: all 0.2s; 
  }
  .dropzone:hover, .dropzone.dragging { 
    border-color: #818cf8; 
    background: rgba(129, 140, 248, 0.05); 
  }
  .dropzone .file-input { 
    position: absolute; 
    inset: 0; 
    opacity: 0; 
    cursor: pointer; 
  }
  .dropzone p { margin-top: 8px; font-size: 14px; }
  .error { color: #f87171; font-size: 13px; margin-top: 8px; }
  .success { color: #34d399; font-size: 13px; margin-top: 8px; }
</style>
