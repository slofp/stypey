<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { Problem } from '$types/problem';
  import { ProblemList } from '$components/Problems';
  import { ProblemLoader } from '$services/problemLoader';
  import { themeStore } from '$stores/theme.svelte';
  
  let problems = $state<Problem[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  
  onMount(async () => {
    try {
      problems = await ProblemLoader.getAllProblems();
    } catch (err) {
      error = err instanceof Error ? err.message : '問題の読み込みに失敗しました';
    } finally {
      loading = false;
    }
  });
  
  function handleProblemSelect(problem: Problem) {
    goto(`/problems/${problem.id}`);
  }
  
  function toggleTheme(): void {
    themeStore.toggle();
  }
  
  const theme = $derived(themeStore.current);
  const IconSun = '☀️';
  const IconMoon = '🌙';
</script>

<svelte:head>
  <title>問題一覧 - TypeMaster</title>
  <meta name="description" content="TypeScriptの型システムを学習する問題一覧" />
</svelte:head>

<div class="container">
  <header class="header">
    <div class="header-content">
      <h1 class="logo">
        <a href="/" class="logo-link">TypeMaster</a>
      </h1>
      <nav class="nav">
        <a href="/" class="nav-link">ホーム</a>
        <a href="/problems" class="nav-link active">問題一覧</a>
        <a href="/progress" class="nav-link">進捗</a>
      </nav>
      <div class="header-actions">
        <button
          class="theme-toggle"
          onclick={toggleTheme}
          aria-label="テーマ切り替え"
          title={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
        >
          {#if theme === 'light'}
            <span>{IconMoon}</span>
          {:else}
            <span>{IconSun}</span>
          {/if}
        </button>
      </div>
    </div>
  </header>
  
  <main class="main">
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>問題を読み込んでいます...</p>
      </div>
    {:else if error}
      <div class="error-state">
        <p class="error-message">{error}</p>
        <button onclick={() => window.location.reload()} class="retry-button">
          再読み込み
        </button>
      </div>
    {:else}
      <ProblemList 
        {problems}
        onProblemSelect={handleProblemSelect}
      />
    {/if}
  </main>
  
  <footer class="footer">
    <p class="footer-text">
      © 2024 TypeMaster - TypeScriptの型システムを楽しく学ぼう
    </p>
  </footer>
</div>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  .header {
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-default);
    padding: 1rem 0;
  }
  
  .header-content {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .logo {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }
  
  .logo-link {
    color: var(--text-primary);
    text-decoration: none;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .nav {
    display: flex;
    gap: 2rem;
  }
  
  .nav-link {
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
    transition: color 0.2s ease;
    padding: 0.5rem 0;
    border-bottom: 2px solid transparent;
  }
  
  .nav-link:hover {
    color: var(--text-primary);
  }
  
  .nav-link.active {
    color: var(--text-primary);
    border-bottom-color: var(--accent-primary);
  }
  
  .header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 0.5rem;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .theme-toggle:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--border-dark);
  }
  
  .main {
    flex: 1;
    padding: 2rem;
  }
  
  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1rem;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-light);
    border-top-color: var(--border-focus);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  .loading-state p,
  .error-message {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .error-message {
    color: var(--error-text);
  }
  
  .retry-button {
    padding: 0.5rem 1rem;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .retry-button:hover {
    background-color: var(--bg-tertiary);
    border-color: var(--border-dark);
  }
  
  .footer {
    background-color: var(--bg-secondary);
    border-top: 1px solid var(--border-default);
    padding: 1.5rem 0;
  }
  
  .footer-text {
    text-align: center;
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  @media (max-width: 768px) {
    .nav {
      display: none;
    }
    
    .header-content {
      padding: 0 1rem;
    }
    
    .main {
      padding: 1rem;
    }
  }
</style>