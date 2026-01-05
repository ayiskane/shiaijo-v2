<script lang="ts">
  let { name, class: className = '' } = $props<{ name: string; class?: string }>();
  
  // Simple Unicode icon map
  const icons: Record<string, string> = {
    // Navigation
    'bars': '☰',
    'xmark': '✕',
    'arrow-left': '←',
    'arrow-right': '→',
    'chevron-down': '▼',
    'chevron-up': '▲',
    
    // Actions
    'plus': '+',
    'minus': '−',
    'pen': '✎',
    'trash': '🗑',
    'check': '✓',
    'search': '🔍',
    'gear': '⚙',
    'hammer': '🔨',
    
    // Objects
    'house': '🏠',
    'users': '👥',
    'user': '👤',
    'layer-group': '☰',
    'trophy': '🏆',
    'table': '📊',
    'eye': '👁',
    'gavel': '⚖',
    'hand-holding-heart': '💝',
    'shield-halved': '🛡',
    'clock': '⏱',
    'play': '▶',
    'pause': '⏸',
    'stop': '⏹',
    'flag': '🚩',
    
    // Scores
    'circle': '●',
    'triangle': '▲',
    'x': '✕',
  };
</script>

<span class="icon {className}" aria-hidden="true">{icons[name] || '?'}</span>

<style>
  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-style: normal;
    line-height: 1;
  }
</style>
