<script lang="ts">
  import type { Problem } from '$types/problem';
  import { Card, Badge } from '$components/UI';
  import { progressStore } from '$stores/progress.svelte';
  
  interface Props {
    problem: Problem;
    onClick?: () => void;
  }
  
  let { problem, onClick }: Props = $props();
  
  const isCompleted = $derived(progressStore.isProblemCompleted(problem.id));
  
  const difficultyColor = $derived(() => {
    switch (problem.difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  });
  
  const categoryDisplay = $derived(() => {
    const categoryMap: Record<string, string> = {
      'basics': '基礎',
      'interfaces': 'インターフェース',
      'generics': 'ジェネリクス',
      'unions': 'Union型',
      'utility-types': 'ユーティリティ型',
      'advanced': '上級'
    };
    return categoryMap[problem.category] || problem.category;
  });
</script>

<div class="problem-card" class:completed={isCompleted}>
  <Card 
    hoverable={true}
    onclick={onClick}
  >
  <div class="card-header">
    <div class="header-top">
      <h3 class="problem-title">
        {#if isCompleted}
          <span class="check-icon">✓</span>
        {/if}
        {problem.title}
      </h3>
      <Badge variant={difficultyColor()} size="small">
        {problem.difficulty}
      </Badge>
    </div>
    <div class="problem-meta">
      <Badge variant="default" size="small" isOutlined={true}>
        {categoryDisplay()}
      </Badge>
      {#if problem.typeAssertions.length > 0}
        <span class="test-count">
          型要件: {problem.typeAssertions.length}
        </span>
      {/if}
    </div>
  </div>
  
  <p class="problem-description">
    {problem.description.split('\n')[0]}
  </p>
  
  {#if problem.tags.length > 0}
    <div class="problem-tags">
      {#each problem.tags as tag}
        <span class="tag">#{tag}</span>
      {/each}
    </div>
  {/if}
  </Card>
</div>

<style>
  .problem-card {
    transition: all 0.3s ease;
  }
  
  .problem-card.completed :global(.card) {
    background-color: var(--success-bg);
    border-color: var(--success-border);
  }
  
  .card-header {
    margin-bottom: 1rem;
  }
  
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .problem-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .check-icon {
    color: var(--success-text);
    font-weight: bold;
  }
  
  .problem-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .test-count {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
  
  .problem-description {
    margin: 0 0 1rem 0;
    color: var(--text-secondary);
    font-size: 0.875rem;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  
  .problem-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .tag {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    padding: 0.125rem 0.375rem;
    background-color: var(--bg-tertiary);
    border-radius: 0.25rem;
  }
</style>