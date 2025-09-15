<script lang="ts">
  import type { Problem, DifficultyLevel, ProblemCategory } from '$types/problem';
  import ProblemCard from './ProblemCard.svelte';
  import ProblemFilter from './ProblemFilter.svelte';
  import { progressStore } from '$stores/progress.svelte';
  
  interface Props {
    problems: Problem[];
    onProblemSelect?: (problem: Problem) => void;
  }
  
  let { problems, onProblemSelect }: Props = $props();
  
  let selectedDifficulty = $state<DifficultyLevel | 'all'>('all');
  let selectedCategory = $state<ProblemCategory | 'all'>('all');
  let showCompleted = $state(true);
  let searchQuery = $state('');
  
  const filteredProblems = $derived(() => {
    return problems.filter(problem => {
      // 難易度フィルタ
      if (selectedDifficulty !== 'all' && problem.difficulty !== selectedDifficulty) {
        return false;
      }
      
      // カテゴリフィルタ
      if (selectedCategory !== 'all' && problem.category !== selectedCategory) {
        return false;
      }
      
      // 完了状態フィルタ
      const isCompleted = progressStore.isProblemCompleted(problem.id);
      if (!showCompleted && isCompleted) {
        return false;
      }
      
      // 検索フィルタ
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          problem.title.toLowerCase().includes(query) ||
          problem.description.toLowerCase().includes(query) ||
          problem.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  });
  
  const statistics = $derived(() => {
    const completed = problems.filter(p => 
      progressStore.isProblemCompleted(p.id)
    ).length;
    
    return {
      total: problems.length,
      completed,
      remaining: problems.length - completed,
      completionRate: problems.length > 0 
        ? Math.round((completed / problems.length) * 100) 
        : 0
    };
  });
  
  function handleProblemClick(problem: Problem) {
    onProblemSelect?.(problem);
  }
</script>

<div class="problem-list-container">
  <div class="list-header">
    <div class="header-content">
      <h2 class="list-title">問題一覧</h2>
      <div class="statistics">
        <span class="stat">
          <strong>{statistics().completed}</strong> / {statistics().total} 完了
        </span>
        <span class="stat">
          進捗率: <strong>{statistics().completionRate}%</strong>
        </span>
      </div>
    </div>
    
    <div class="search-container">
      <input
        type="search"
        placeholder="問題を検索..."
        bind:value={searchQuery}
        class="search-input"
      />
      <span class="search-icon">🔍</span>
    </div>
  </div>
  
  <div class="list-content">
    <aside class="filter-sidebar">
      <ProblemFilter
        bind:selectedDifficulty
        bind:selectedCategory
        bind:showCompleted
        onDifficultyChange={(d) => selectedDifficulty = d}
        onCategoryChange={(c) => selectedCategory = c}
        onCompletedToggle={() => showCompleted = !showCompleted}
      />
    </aside>
    
    <div class="problems-grid">
      {#if filteredProblems().length === 0}
        <div class="empty-state">
          <p class="empty-message">
            {#if searchQuery}
              「{searchQuery}」に一致する問題が見つかりませんでした
            {:else}
              条件に一致する問題がありません
            {/if}
          </p>
        </div>
      {:else}
        {#each filteredProblems() as problem (problem.id)}
          <ProblemCard 
            {problem}
            onClick={() => handleProblemClick(problem)}
          />
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .problem-list-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
  }
  
  .list-header {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .list-title {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  
  .statistics {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }
  
  .stat {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .stat strong {
    color: var(--text-primary);
    font-weight: 600;
  }
  
  .search-container {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .search-input {
    width: 100%;
    padding: 0.75rem 2.5rem 0.75rem 1rem;
    font-size: 0.875rem;
    background-color: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
    border-radius: 0.5rem;
    outline: none;
    transition: all 0.2s ease;
  }
  
  .search-input:focus {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 2px var(--border-focus-ring);
  }
  
  .search-input::placeholder {
    color: var(--text-tertiary);
  }
  
  .search-icon {
    position: absolute;
    right: 1rem;
    pointer-events: none;
    opacity: 0.5;
  }
  
  .list-content {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 2rem;
    align-items: start;
  }
  
  .filter-sidebar {
    position: sticky;
    top: 2rem;
  }
  
  .problems-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }
  
  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
  }
  
  .empty-message {
    margin: 0;
    font-size: 1rem;
    color: var(--text-secondary);
  }
  
  @media (max-width: 1024px) {
    .list-content {
      grid-template-columns: 1fr;
    }
    
    .filter-sidebar {
      position: static;
    }
    
    .problems-grid {
      grid-template-columns: 1fr;
    }
  }
  
  @media (max-width: 768px) {
    .header-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
    
    .statistics {
      gap: 1rem;
    }
  }
</style>