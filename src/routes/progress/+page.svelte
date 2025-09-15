<script lang="ts">
  import { onMount } from 'svelte';
  import { progressStore } from '$stores/progress.svelte';
  import { Card, Badge } from '$components/UI';
  import type { Problem } from '$types/problem';
  import { ProblemLoader } from '$services/problemLoader';
  
  const progress = $derived(progressStore.progress);
  const completed = $derived(progressStore.completed);
  const statistics = $derived(progressStore.getStatistics());
  
  let allProblems = $state<Problem[]>([]);
  let loading = $state(true);
  
  onMount(async () => {
    try {
      allProblems = await ProblemLoader.getAllProblems();
    } catch (err) {
      console.error('Failed to load problems:', err);
    } finally {
      loading = false;
    }
  });
  
  const completionRate = $derived(() => {
    if (allProblems.length === 0) return 0;
    return Math.round((completed.totalCompleted / allProblems.length) * 100);
  });
  
  const recentProblems = $derived(() => {
    return [...completed.problems]
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 5);
  });
  
  function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}時間${minutes % 60}分`;
    } else if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
</script>

<svelte:head>
  <title>進捗 - TypeMaster</title>
  <meta name="description" content="学習の進捗とスタッツを確認" />
</svelte:head>

<div class="container">
  <main class="main">
    <div class="progress-header">
      <h2 class="page-title">学習の進捗</h2>
      <p class="user-id">ユーザーID: {progress.userId}</p>
    </div>
    
    <div class="stats-grid">
      <Card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">🏆</div>
          <div class="stat-info">
            <p class="stat-label">総スコア</p>
            <p class="stat-value">{progress.totalScore.toLocaleString()}</p>
          </div>
        </div>
      </Card>
      
      <Card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">📊</div>
          <div class="stat-info">
            <p class="stat-label">レベル</p>
            <p class="stat-value">{progress.level}</p>
            <div class="experience-bar">
              <div 
                class="experience-fill" 
                style="width: {(progress.experience % 1000) / 10}%"
              ></div>
            </div>
            <p class="experience-text">
              {progress.experience % 1000} / 1000 XP
            </p>
          </div>
        </div>
      </Card>
      
      <Card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">🔥</div>
          <div class="stat-info">
            <p class="stat-label">連続日数</p>
            <p class="stat-value">{progress.streakDays}日</p>
          </div>
        </div>
      </Card>
      
      <Card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <p class="stat-label">完了率</p>
            <p class="stat-value">{completionRate()}%</p>
            <p class="stat-subtext">
              {completed.totalCompleted} / {allProblems.length} 問題
            </p>
          </div>
        </div>
      </Card>
    </div>
    
    <div class="progress-sections">
      <section class="progress-section">
        <h3 class="section-title">難易度別進捗</h3>
        <Card>
          <div class="difficulty-stats">
            <div class="difficulty-item">
              <div class="difficulty-header">
                <Badge variant="success" size="small">初級</Badge>
                <span class="difficulty-count">
                  {completed.byDifficulty.easy} 完了
                </span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill easy"
                  style="width: {allProblems.filter(p => p.difficulty === 'easy').length > 0 
                    ? (completed.byDifficulty.easy / allProblems.filter(p => p.difficulty === 'easy').length) * 100 
                    : 0}%"
                ></div>
              </div>
            </div>
            
            <div class="difficulty-item">
              <div class="difficulty-header">
                <Badge variant="warning" size="small">中級</Badge>
                <span class="difficulty-count">
                  {completed.byDifficulty.medium} 完了
                </span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill medium"
                  style="width: {allProblems.filter(p => p.difficulty === 'medium').length > 0 
                    ? (completed.byDifficulty.medium / allProblems.filter(p => p.difficulty === 'medium').length) * 100 
                    : 0}%"
                ></div>
              </div>
            </div>
            
            <div class="difficulty-item">
              <div class="difficulty-header">
                <Badge variant="error" size="small">上級</Badge>
                <span class="difficulty-count">
                  {completed.byDifficulty.hard} 完了
                </span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill hard"
                  style="width: {allProblems.filter(p => p.difficulty === 'hard').length > 0 
                    ? (completed.byDifficulty.hard / allProblems.filter(p => p.difficulty === 'hard').length) * 100 
                    : 0}%"
                ></div>
              </div>
            </div>
          </div>
        </Card>
      </section>
      
      <section class="progress-section">
        <h3 class="section-title">最近完了した問題</h3>
        {#if recentProblems().length > 0}
          <div class="recent-problems">
            {#each recentProblems() as problem}
              <Card class="recent-problem-card">
                <div class="recent-problem">
                  <div class="recent-problem-info">
                    <p class="recent-problem-id">{problem.problemId}</p>
                    <p class="recent-problem-date">
                      {formatDate(problem.completedAt)}
                    </p>
                  </div>
                  <div class="recent-problem-stats">
                    <Badge variant="default" size="small">
                      スコア: {problem.score}
                    </Badge>
                    <span class="problem-stat">
                      時間: {formatTime(problem.timeSpent)}
                    </span>
                    <span class="problem-stat">
                      試行: {problem.attempts}回
                    </span>
                    {#if problem.hintsUsed > 0}
                      <span class="problem-stat">
                        ヒント: {problem.hintsUsed}個
                      </span>
                    {/if}
                  </div>
                </div>
              </Card>
            {/each}
          </div>
        {:else}
          <Card>
            <p class="empty-message">まだ完了した問題がありません</p>
          </Card>
        {/if}
      </section>
      
      <section class="progress-section">
        <h3 class="section-title">統計</h3>
        <Card>
          <div class="statistics">
            <div class="stat-row">
              <span class="stat-name">総完了数</span>
              <span class="stat-data">{statistics.totalCompleted} 問題</span>
            </div>
            <div class="stat-row">
              <span class="stat-name">総スコア</span>
              <span class="stat-data">{statistics.totalScore.toLocaleString()} ポイント</span>
            </div>
            <div class="stat-row">
              <span class="stat-name">平均スコア</span>
              <span class="stat-data">{Math.round(statistics.averageScore)} ポイント</span>
            </div>
            <div class="stat-row">
              <span class="stat-name">最終アクティブ</span>
              <span class="stat-data">{formatDate(progress.lastActiveDate)}</span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  </main>
</div>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  .main {
    flex: 1;
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .progress-header {
    margin-bottom: 2rem;
  }
  
  .page-title {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  
  .user-id {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-family: 'JetBrains Mono', monospace;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }
  
  :global(.stat-card) {
    position: relative;
    overflow: hidden;
  }
  
  .stat-content {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  
  .stat-icon {
    font-size: 2.5rem;
  }
  
  .stat-info {
    flex: 1;
  }
  
  .stat-label {
    margin: 0 0 0.25rem 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .stat-value {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  
  .stat-subtext {
    margin: 0.25rem 0 0 0;
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }
  
  .experience-bar {
    width: 100%;
    height: 6px;
    background-color: var(--bg-tertiary);
    border-radius: 3px;
    margin: 0.5rem 0 0.25rem 0;
    overflow: hidden;
  }
  
  .experience-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    transition: width 0.3s ease;
  }
  
  .experience-text {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }
  
  .progress-sections {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .progress-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .section-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .difficulty-stats {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .difficulty-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .difficulty-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .difficulty-count {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .progress-bar {
    width: 100%;
    height: 8px;
    background-color: var(--bg-tertiary);
    border-radius: 4px;
    overflow: hidden;
  }
  
  .progress-fill {
    height: 100%;
    transition: width 0.3s ease;
  }
  
  .progress-fill.easy {
    background-color: var(--success);
  }
  
  .progress-fill.medium {
    background-color: var(--warning);
  }
  
  .progress-fill.hard {
    background-color: var(--error);
  }
  
  .recent-problems {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  :global(.recent-problem-card) {
    padding: 1rem !important;
  }
  
  .recent-problem {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .recent-problem-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .recent-problem-id {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .recent-problem-date {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
  
  .recent-problem-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }
  
  .problem-stat {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }
  
  .statistics {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-light);
  }
  
  .stat-row:last-child {
    border-bottom: none;
  }
  
  .stat-name {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .stat-data {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .empty-message {
    margin: 0;
    padding: 2rem;
    text-align: center;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  @media (max-width: 768px) {
    .main {
      padding: 1rem;
    }
    
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
</style>