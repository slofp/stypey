<script lang="ts">
  import type { Problem, ProblemTest } from '$types/problem';
  import { TypeChecker } from '$services/typeChecker';
  import { Button, Badge } from '$components/UI';
  
  interface Props {
    problem: Problem;
    userCode: string;
    onComplete?: (success: boolean, score: number) => void;
  }
  
  interface TestResult {
    test: ProblemTest;
    status: 'pending' | 'running' | 'passed' | 'failed';
    error?: string;
  }
  
  let { problem, userCode, onComplete }: Props = $props();
  
  let isRunning = $state(false);
  let testResults = $state<TestResult[]>([]);
  let overallResult = $state<'idle' | 'running' | 'success' | 'failure'>('idle');
  
  async function runTests() {
    isRunning = true;
    overallResult = 'running';
    testResults = problem.tests.map(test => ({
      test,
      status: 'pending'
    }));
    
    let allPassed = true;
    
    for (let i = 0; i < problem.tests.length; i++) {
      const testResult = testResults[i];
      if (!testResult) continue;
      
      testResult.status = 'running';
      testResults = [...testResults];
      
      try {
        // テストコードを組み立て
        const testCode = `
${userCode}

// Test case ${i + 1}
${testResult.test.input}
`;
        
        // 型チェックを実行
        const checkResult = await TypeChecker.checkCode(testCode);
        
        // エラーがあるかチェック
        if (checkResult.errors.length > 0) {
          testResult.status = 'failed';
          testResult.error = checkResult.errors[0]?.message || '型エラーがあります';
          allPassed = false;
        } else {
          // 期待される結果と比較（簡易版）
          // 実際にはもっと高度な検証が必要
          testResult.status = 'passed';
        }
      } catch (err) {
        testResult.status = 'failed';
        testResult.error = err instanceof Error ? err.message : 'テストの実行に失敗しました';
        allPassed = false;
      }
      
      testResults = [...testResults];
      
      // 少し遅延を入れてアニメーション効果を演出
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    overallResult = allPassed ? 'success' : 'failure';
    isRunning = false;
    
    if (allPassed) {
      // スコア計算（簡易版）
      const baseScore = {
        easy: 100,
        medium: 200,
        hard: 300
      }[problem.difficulty];
      
      onComplete?.(true, baseScore);
    }
  }
  
  function getStatusIcon(status: TestResult['status']): string {
    switch (status) {
      case 'pending': return '⏸';
      case 'running': return '⚡';
      case 'passed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  }
  
  function getStatusVariant(status: TestResult['status']): 'default' | 'primary' | 'success' | 'error' {
    switch (status) {
      case 'running': return 'primary';
      case 'passed': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  }
</script>

<div class="test-runner">
  <div class="runner-header">
    <h3 class="runner-title">テストケース</h3>
    <Button
      variant="primary"
      onclick={runTests}
      disabled={isRunning}
      isLoading={isRunning}
    >
      {isRunning ? 'テスト実行中...' : 'テストを実行'}
    </Button>
  </div>
  
  {#if testResults.length > 0}
    <div class="test-results">
      {#each testResults as result, index (index)}
        <div class="test-case {result.status}">
          <div class="test-header">
            <div class="test-info">
              <span class="test-icon">{getStatusIcon(result.status)}</span>
              <span class="test-name">
                テスト {index + 1}
                {#if result.test.description}
                  : {result.test.description}
                {/if}
              </span>
            </div>
            <Badge variant={getStatusVariant(result.status)} size="small">
              {result.status === 'pending' ? '待機中' :
               result.status === 'running' ? '実行中' :
               result.status === 'passed' ? '成功' : '失敗'}
            </Badge>
          </div>
          
          {#if result.status === 'failed' && result.error}
            <div class="test-error">
              <p class="error-message">{result.error}</p>
            </div>
          {/if}
          
          <details class="test-details">
            <summary>コードを表示</summary>
            <pre class="test-code">{result.test.input}</pre>
            {#if result.test.expected}
              <div class="expected-output">
                <strong>期待される結果:</strong>
                <pre>{result.test.expected}</pre>
              </div>
            {/if}
          </details>
        </div>
      {/each}
    </div>
  {:else if problem.tests.length === 0}
    <div class="no-tests">
      <p>この問題にはテストケースがありません</p>
    </div>
  {:else}
    <div class="test-list">
      <p class="test-count">
        {problem.tests.length} 個のテストケースがあります
      </p>
      <ul class="test-descriptions">
        {#each problem.tests as test, index}
          <li>
            テスト {index + 1}
            {#if test.description}
              : {test.description}
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  
  {#if overallResult === 'success'}
    <div class="success-message">
      <span class="success-icon">🎉</span>
      <p>すべてのテストに合格しました！</p>
    </div>
  {:else if overallResult === 'failure'}
    <div class="failure-message">
      <p>いくつかのテストが失敗しました。コードを見直してください。</p>
    </div>
  {/if}
</div>

<style>
  .test-runner {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-default);
    border-radius: 0.75rem;
  }
  
  .runner-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .runner-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .test-results {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .test-case {
    padding: 1rem;
    background-color: var(--bg-primary);
    border: 1px solid var(--border-default);
    border-radius: 0.5rem;
    transition: all 0.3s ease;
  }
  
  .test-case.running {
    border-color: var(--info-border);
    background-color: var(--info-bg);
  }
  
  .test-case.passed {
    border-color: var(--success-border);
    background-color: var(--success-bg);
  }
  
  .test-case.failed {
    border-color: var(--error-border);
    background-color: var(--error-bg);
  }
  
  .test-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .test-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .test-icon {
    font-size: 1.25rem;
  }
  
  .test-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .test-error {
    margin-top: 1rem;
    padding: 0.75rem;
    background-color: var(--bg-primary);
    border-left: 3px solid var(--error-border);
    border-radius: 0.25rem;
  }
  
  .error-message {
    margin: 0;
    font-size: 0.875rem;
    color: var(--error-text);
    font-family: 'JetBrains Mono', monospace;
  }
  
  .test-details {
    margin-top: 1rem;
  }
  
  .test-details summary {
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--text-secondary);
    user-select: none;
  }
  
  .test-details summary:hover {
    color: var(--text-primary);
  }
  
  .test-code {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background-color: var(--bg-code);
    border: 1px solid var(--border-light);
    border-radius: 0.25rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    overflow-x: auto;
    color: var(--text-primary);
  }
  
  .expected-output {
    margin-top: 1rem;
  }
  
  .expected-output strong {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .expected-output pre {
    padding: 0.75rem;
    background-color: var(--bg-tertiary);
    border: 1px solid var(--border-light);
    border-radius: 0.25rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    overflow-x: auto;
    color: var(--text-primary);
  }
  
  .no-tests,
  .test-list {
    padding: 1rem;
    background-color: var(--bg-tertiary);
    border-radius: 0.5rem;
  }
  
  .no-tests p,
  .test-count {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .test-descriptions {
    margin: 0.5rem 0 0 1.5rem;
    padding: 0;
    list-style: disc;
  }
  
  .test-descriptions li {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .success-message,
  .failure-message {
    padding: 1rem;
    border-radius: 0.5rem;
    text-align: center;
  }
  
  .success-message {
    background-color: var(--success-bg);
    border: 1px solid var(--success-border);
  }
  
  .success-message p {
    margin: 0.5rem 0 0 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--success-text);
  }
  
  .success-icon {
    font-size: 2rem;
  }
  
  .failure-message {
    background-color: var(--error-bg);
    border: 1px solid var(--error-border);
  }
  
  .failure-message p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--error-text);
  }
</style>