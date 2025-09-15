<script lang="ts">
  import type { DifficultyLevel, ProblemCategory } from '$types/problem';
  import { Button } from '$components/UI';
  
  interface Props {
    selectedDifficulty: DifficultyLevel | 'all';
    selectedCategory: ProblemCategory | 'all';
    showCompleted: boolean;
    onDifficultyChange: (difficulty: DifficultyLevel | 'all') => void;
    onCategoryChange: (category: ProblemCategory | 'all') => void;
    onCompletedToggle: () => void;
  }
  
  let {
    selectedDifficulty = $bindable(),
    selectedCategory = $bindable(),
    showCompleted = $bindable(),
    onDifficultyChange,
    onCategoryChange,
    onCompletedToggle
  }: Props = $props();
  
  const difficulties: Array<DifficultyLevel | 'all'> = ['all', 'easy', 'medium', 'hard'];
  const categories: Array<ProblemCategory | 'all'> = [
    'all',
    'basics',
    'interfaces', 
    'generics',
    'unions',
    'utility-types',
    'advanced'
  ];
  
  const difficultyLabels: Record<string, string> = {
    'all': 'すべて',
    'easy': '初級',
    'medium': '中級',
    'hard': '上級'
  };
  
  const categoryLabels: Record<string, string> = {
    'all': 'すべて',
    'basics': '基礎',
    'interfaces': 'インターフェース',
    'generics': 'ジェネリクス',
    'unions': 'Union型',
    'utility-types': 'ユーティリティ型',
    'advanced': '上級'
  };
</script>

<div class="filter-container">
  <div class="filter-section">
    <label class="filter-label">難易度</label>
    <div class="filter-buttons">
      {#each difficulties as difficulty}
        <Button
          variant={selectedDifficulty === difficulty ? 'primary' : 'secondary'}
          size="small"
          onclick={() => onDifficultyChange(difficulty)}
        >
          {difficultyLabels[difficulty]}
        </Button>
      {/each}
    </div>
  </div>
  
  <div class="filter-section">
    <label class="filter-label">カテゴリ</label>
    <div class="filter-buttons">
      {#each categories as category}
        <Button
          variant={selectedCategory === category ? 'primary' : 'secondary'}
          size="small"
          onclick={() => onCategoryChange(category)}
        >
          {categoryLabels[category]}
        </Button>
      {/each}
    </div>
  </div>
  
  <div class="filter-section">
    <label class="filter-label">表示オプション</label>
    <div class="filter-checkbox">
      <label class="checkbox-label">
        <input
          type="checkbox"
          checked={showCompleted}
          onchange={onCompletedToggle}
        />
        <span>完了した問題を表示</span>
      </label>
    </div>
  </div>
</div>

<style>
  .filter-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-default);
    border-radius: 0.75rem;
  }
  
  .filter-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .filter-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .filter-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .filter-checkbox {
    display: flex;
    align-items: center;
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .checkbox-label input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    accent-color: var(--accent-primary);
    cursor: pointer;
  }
  
  .checkbox-label:hover span {
    color: var(--text-primary);
  }
  
  @media (max-width: 768px) {
    .filter-container {
      padding: 1rem;
    }
    
    .filter-buttons {
      flex-direction: column;
    }
  }
</style>