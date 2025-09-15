<script lang="ts">
  import { page } from '$app/stores';
  import { themeStore } from '$stores/theme.svelte';
  import EditorSettings from '$components/Editor/EditorSettings.svelte';
  
  // アイコンを絵文字で代替
  const IconSun = '☀️';
  const IconMoon = '🌙';
  const IconCode = '💻';
  const IconSettings = '⚙️';
  
  let settingsOpen = $state(false);
  const theme = $derived(themeStore.current);
  
  function toggleTheme(): void {
    themeStore.toggle();
  }
  
  // 現在のパスを取得
  const currentPath = $derived($page.url.pathname);
</script>

<header class="header">
  <div class="header-container">
    <div class="header-left">
      <a href="/" class="logo">
        <span class="logo-icon">{IconCode}</span>
        <span class="logo-text">TypeMaster</span>
      </a>
      <nav class="nav">
        <a href="/" class="nav-link" class:active={currentPath === '/'}>
          ホーム
        </a>
        <a href="/problems" class="nav-link" class:active={currentPath.startsWith('/problems')}>
          問題一覧
        </a>
        <a href="/progress" class="nav-link" class:active={currentPath === '/progress'}>
          進捗
        </a>
      </nav>
    </div>
    <div class="header-right">
      <EditorSettings bind:isOpen={settingsOpen} />
      <button
        class="theme-toggle"
        onclick={toggleTheme}
        aria-label="テーマ切り替え"
        title={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
      >
        {#if theme === 'light'}
          <span class="icon">{IconMoon}</span>
        {:else}
          <span class="icon">{IconSun}</span>
        {/if}
      </button>
    </div>
  </div>
</header>

<style>
  .header {
    position: sticky;
    top: 0;
    z-index: 50;
    width: 100%;
    height: 64px;
    background-color: var(--bg-primary);
    border-bottom: 1px solid var(--border-default);
    backdrop-filter: blur(8px);
    background-color: color-mix(in srgb, var(--bg-primary) 80%, transparent);
  }
  
  .header-container {
    max-width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2rem;
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 3rem;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
    color: var(--text-primary);
    font-weight: 600;
    font-size: 1.125rem;
    transition: opacity 0.15s ease;
  }
  
  .logo:hover {
    opacity: 0.8;
  }
  
  .logo-icon {
    font-size: 1.5rem;
  }
  
  .logo-text {
    background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .nav {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .nav-link {
    position: relative;
    padding: 0.5rem 1rem;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 0.5rem;
    transition: all 0.15s ease;
  }
  
  .nav-link:hover {
    color: var(--text-primary);
    background-color: var(--bg-hover);
  }
  
  .nav-link.active {
    color: var(--text-primary);
    background-color: var(--bg-tertiary);
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 1px solid var(--border-default);
    border-radius: 0.5rem;
    background-color: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .theme-toggle:hover {
    background-color: var(--bg-hover);
    color: var(--text-primary);
    border-color: var(--border-dark);
  }
  
  .icon {
    font-size: 1.25rem;
  }
  
  @media (max-width: 768px) {
    .header-container {
      padding: 0 1rem;
    }
    
    .header-left {
      gap: 1.5rem;
    }
    
    .nav {
      gap: 0.5rem;
    }
    
    .nav-link {
      padding: 0.5rem 0.75rem;
      font-size: 0.8125rem;
    }
    
    .logo-text {
      display: none;
    }
  }
</style>