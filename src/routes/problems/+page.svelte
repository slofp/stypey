<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { Problem } from '$types/problem';
  import { ProblemList } from '$components/Problems';
  import { ProblemLoader } from '$services/problemLoader';
  
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
</script>

<svelte:head>
  <title>問題一覧 - Stypey</title>
  <meta name="description" content="TypeScriptの型システムを学習する問題一覧" />
</svelte:head>

<div class="container">
  <div class="main">
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
  </div>
</div>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
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
  
  @media (max-width: 768px) {
    .main {
      padding: 1rem;
    }
  }
</style>