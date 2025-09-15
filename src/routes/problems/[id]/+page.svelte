<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';
  import { progressStore } from '$stores/progress.svelte';
  import { Badge, Button } from '$components/UI';
  import TestRunner from '$components/Problems/TestRunner.svelte';
  
  let { data }: { data: PageData } = $props();
  
  const { problem } = data;
  
  let MonacoEditor = $state<typeof import('$components/Editor/MonacoEditor.svelte').default | null>(null);
  let editorValue = $state(problem.initialCode);
  let showSolution = $state(false);
  let showHints = $state<number[]>([]);
  let testRunnerKey = $state(0);
  
  const isCompleted = $derived(progressStore.isProblemCompleted(problem.id));
  
  // クライアントサイドでのみMonaco Editorを読み込み
  $effect(() => {
    if (browser && !MonacoEditor) {
      import('$components/Editor/MonacoEditor.svelte').then((module) => {
        MonacoEditor = module.default;
      });
    }
  });
  
  // 問題開始時の処理
  $effect(() => {
    if (!isCompleted && !progressStore.current) {
      progressStore.startProblem(problem.id, problem.initialCode);
    }
  });
  
  function handleEditorChange(value: string): void {
    editorValue = value;
    progressStore.saveCode(value);
  }
  
  function handleSave(value: string): void {
    progressStore.saveCode(value);
  }
  
  function toggleHint(index: number): void {
    if (!showHints.includes(index)) {
      showHints = [...showHints, index];
      progressStore.viewHint(index);
    } else {
      showHints = showHints.filter(i => i !== index);
    }
  }
  
  function handleTestComplete(success: boolean, score: number): void {
    if (success) {
      progressStore.completeProblem(
        problem.id,
        editorValue,
        problem.difficulty,
        problem.category
      );
    }
  }
  
  function resetCode(): void {
    editorValue = problem.initialCode;
    testRunnerKey++; // TestRunnerを再レンダリング
  }
  
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
  
  const difficultyColor = $derived(() => {
    switch (problem.difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  });
</script>

<svelte:head>
  <title>{problem.title} - TypeMaster</title>
  <meta name="description" content={problem.description} />
</svelte:head>

<div class="container">
  <main class="main">
    <div class="breadcrumb">
      <a href="/problems" class="breadcrumb-link">問題一覧</a>
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-current">{problem.title}</span>
    </div>
    
    <div class="problem-container">
      <div class="problem-sidebar">
        <div class="problem-header">
          <h2 class="problem-title">
            {#if isCompleted}
              <span class="completed-icon">✅</span>
            {/if}
            {problem.title}
          </h2>
          <div class="problem-badges">
            <Badge variant={difficultyColor()} size="small">
              {problem.difficulty}
            </Badge>
            <Badge variant="default" size="small" isOutlined={true}>
              {categoryDisplay()}
            </Badge>
          </div>
        </div>
        
        <div class="problem-description">
          <h3>問題説明</h3>
          <div class="description-content">
            {#each problem.description.split('\n') as paragraph}
              {#if paragraph.trim()}
                <p>{paragraph}</p>
              {/if}
            {/each}
          </div>
        </div>
        
        {#if problem.hints.length > 0}
          <div class="problem-hints">
            <h3>ヒント</h3>
            <div class="hints-list">
              {#each problem.hints as hint, index}
                <div class="hint-item">
                  <button
                    class="hint-toggle"
                    onclick={() => toggleHint(index)}
                  >
                    {showHints.includes(index) ? '🔽' : '▶️'} ヒント {index + 1}
                  </button>
                  {#if showHints.includes(index)}
                    <div class="hint-content">
                      {hint}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        <div class="problem-actions">
          <Button variant="secondary" size="small" onclick={resetCode}>
            コードをリセット
          </Button>
          {#if problem.solution}
            <Button 
              variant="ghost" 
              size="small" 
              onclick={() => showSolution = !showSolution}
            >
              {showSolution ? '解答を隠す' : '解答を見る'}
            </Button>
          {/if}
        </div>
        
        {#if showSolution && problem.solution}
          <div class="solution-container">
            <h3>解答例</h3>
            <pre class="solution-code">{problem.solution}</pre>
          </div>
        {/if}
      </div>
      
      <div class="problem-main">
        <div class="editor-section">
          <div class="editor-header">
            <h3>コードエディタ</h3>
            <div class="editor-info">
              <Badge variant="default" size="small">TypeScript</Badge>
              <Badge variant="default" size="small">Strict Mode</Badge>
            </div>
          </div>
          
          <div class="editor-wrapper">
            {#if browser && MonacoEditor}
              <MonacoEditor
                bind:value={editorValue}
                language="typescript"
                height="400px"
                onChange={handleEditorChange}
                onSave={handleSave}
              />
            {:else}
              <div class="editor-placeholder">
                <div class="spinner"></div>
                <p>エディタを準備しています...</p>
              </div>
            {/if}
          </div>
        </div>
        
        <div class="test-section">
          {#key testRunnerKey}
            <TestRunner
              {problem}
              userCode={editorValue}
              onComplete={handleTestComplete}
            />
          {/key}
        </div>
      </div>
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
    max-width: 1440px;
    width: 100%;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 2rem;
    font-size: 0.875rem;
  }
  
  .breadcrumb-link {
    color: var(--text-secondary);
    text-decoration: none;
  }
  
  .breadcrumb-link:hover {
    color: var(--text-primary);
  }
  
  .breadcrumb-separator {
    color: var(--text-tertiary);
  }
  
  .breadcrumb-current {
    color: var(--text-primary);
    font-weight: 500;
  }
  
  .problem-container {
    display: grid;
    grid-template-columns: 400px 1fr;
    gap: 2rem;
    align-items: start;
  }
  
  .problem-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    position: sticky;
    top: 2rem;
    max-height: calc(100vh - 4rem);
    overflow-y: auto;
  }
  
  .problem-header {
    padding: 1.5rem;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-default);
    border-radius: 0.75rem;
  }
  
  .problem-title {
    margin: 0 0 1rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .completed-icon {
    color: var(--success-text);
  }
  
  .problem-badges {
    display: flex;
    gap: 0.5rem;
  }
  
  .problem-description,
  .problem-hints,
  .problem-actions,
  .solution-container {
    padding: 1.5rem;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-default);
    border-radius: 0.75rem;
  }
  
  .problem-description h3,
  .problem-hints h3,
  .solution-container h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .description-content p {
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }
  
  .description-content p:last-child {
    margin-bottom: 0;
  }
  
  .hints-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .hint-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .hint-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-default);
    border-radius: 0.25rem;
    font-size: 0.875rem;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .hint-toggle:hover {
    background-color: var(--bg-primary);
    border-color: var(--border-dark);
  }
  
  .hint-content {
    padding: 0.75rem;
    background-color: var(--info-bg);
    border-left: 3px solid var(--info-border);
    border-radius: 0.25rem;
    font-size: 0.875rem;
    color: var(--info-text);
  }
  
  .problem-actions {
    display: flex;
    gap: 0.75rem;
  }
  
  .solution-code {
    padding: 1rem;
    background-color: var(--bg-code);
    border: 1px solid var(--border-light);
    border-radius: 0.5rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    line-height: 1.6;
    color: var(--text-primary);
    overflow-x: auto;
  }
  
  .problem-main {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .editor-section,
  .test-section {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-default);
    border-radius: 0.75rem;
    overflow: hidden;
  }
  
  .editor-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-default);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .editor-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .editor-info {
    display: flex;
    gap: 0.5rem;
  }
  
  .editor-wrapper {
    padding: 1.5rem;
  }
  
  .editor-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    color: var(--text-secondary);
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
  
  .editor-placeholder p {
    margin-top: 1rem;
    font-size: 0.875rem;
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
  
  @media (max-width: 1024px) {
    .problem-container {
      grid-template-columns: 1fr;
    }
    
    .problem-sidebar {
      position: static;
      max-height: none;
    }
  }
  
  @media (max-width: 768px) {
    .main {
      padding: 1rem;
    }
  }
</style>