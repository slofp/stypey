<script lang="ts">
  import '../lib/styles/global.css';
  import '../lib/styles/animations.css';
  import { themeStore } from '$stores/theme.svelte';
  import type { Snippet } from 'svelte';
  
  interface Props {
    children: Snippet;
  }
  
  let { children }: Props = $props();
  
  // テーマの初期化と監視
  const theme = $derived(themeStore.current);
  
  $effect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  });
</script>

<div class="app">
  {@render children()}
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    transition: background-color 0.3s ease, color 0.3s ease;
  }
</style>