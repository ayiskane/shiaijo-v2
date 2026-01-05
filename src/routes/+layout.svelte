<script lang="ts">
	import './layout.css';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="stylesheet" href="/FA/css/all.css" />
	<link
		rel="preload"
		href="/fonts/shiaijo-jp.ttf"
		as="font"
		type="font/ttf"
		crossorigin
	/>
</svelte:head>
{@render children()}
