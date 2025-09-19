<script lang="ts">
  import type { Problem, TypeAssertion, ASTTypeAssertion } from '$types/problem';
  import { isASTTypeAssertion } from '$types/problem';
  import { VirtualTypeChecker } from '$services/virtualTypeChecker';
  import { createComparator } from '$services/astComparator';
  import type { ASTAssertionResult } from '$types/astSchema';
  import { patternToString } from '$types/typePatterns';
  import { Button, Badge } from '$components/UI';
  import { slide } from 'svelte/transition';
  import { IconPlayerPause, IconBolt, IconCheck, IconX, IconQuestionMark, IconAlertTriangle, IconConfetti } from '@tabler/icons-svelte';
  
  interface Props {
    problem: Problem;
    userCode: string;
    onComplete?: (success: boolean, score: number) => void;
  }
  
  interface TestResult {
    assertion: TypeAssertion | ASTTypeAssertion;
    status: 'pending' | 'running' | 'passed' | 'failed';
    actualType?: string;
    error?: string;
    astResult?: ASTAssertionResult; // For AST-based results
  }
  
  let { problem, userCode, onComplete }: Props = $props();
  
  let isRunning = $state(false);
  let testResults = $state<TestResult[]>([]);
  let overallResult = $state<'idle' | 'running' | 'success' | 'failure'>('idle');
  let parseError = $state<string | null>(null);
  let testRunnerElement: HTMLDivElement | undefined;
  let showDetails = $state<Set<number>>(new Set());
  
  async function runTests() {
    isRunning = true;
    overallResult = 'running';
    parseError = null;
    showDetails = new Set();  // 詳細表示をリセット
    testResults = problem.typeAssertions.map(assertion => ({
      assertion,
      status: 'pending'
    }));
    
    // テスト結果セクションまで自動スクロール
    if (testRunnerElement) {
      setTimeout(() => {
        testRunnerElement?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start'
        });
      }, 100);
    }
    
    let allPassed = true;
    
    // まず構文エラーがないかチェック
    const syntaxCheck = await VirtualTypeChecker.checkSyntax(userCode);
    if (!syntaxCheck.isValid && syntaxCheck.errors.length > 0) {
      // 構文エラーがある場合は解析エラーとして表示
      parseError = `構文エラー: ${syntaxCheck.errors[0]?.message || 'コードに構文エラーがあります'}`;
      testResults = [];
      overallResult = 'failure';
      isRunning = false;
      return;
    }
    
    // TypeScript Compiler APIで型検証
    try {
      // Check if we have any AST-based assertions
      const hasASTAssertions = problem.typeAssertions.some(isASTTypeAssertion);
      
      // Extract types based on the format we need
      const extractedTypes = hasASTAssertions
        ? await VirtualTypeChecker.extractTypePatterns(userCode)
        : await VirtualTypeChecker.extractTypes(userCode);
      
      // Create AST comparator if needed
      const comparator = hasASTAssertions ? createComparator() : null;
      
      // 各アサーションを検証
      for (let i = 0; i < problem.typeAssertions.length; i++) {
        const assertion = problem.typeAssertions[i];
        const testResult = testResults[i];
        
        if (!assertion || !testResult) continue;
        
        testResult.status = 'running';
        testResults = [...testResults];
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (isASTTypeAssertion(assertion)) {
          // AST-based comparison
          const extractedTypeInfo = (extractedTypes as Map<string, import('$types/astSchema').ExtractedTypeInfo>).get(assertion.symbol);
          
          if (!extractedTypeInfo) {
            testResult.status = 'failed';
            testResult.error = `シンボル '${assertion.symbol}' が見つかりません`;
            testResult.actualType = 'undefined';
            allPassed = false;
          } else {
            // Use AST comparator
            const astResult = comparator!.compare(
              assertion.pattern,
              extractedTypeInfo,
              assertion.mode
            );
            
            testResult.astResult = astResult;
            
            if (astResult.passed) {
              testResult.status = 'passed';
              testResult.actualType = extractedTypeInfo.rawTypeString || 'matched';
            } else {
              testResult.status = 'failed';
              // Build error message from AST errors
              const errorMessages = astResult.errors.map(e => e.message).join(', ');
              testResult.error = errorMessages || 'Type mismatch';
              testResult.actualType = extractedTypeInfo.rawTypeString || 'unknown';
              allPassed = false;
            }
          }
        } else {
          // Legacy string-based comparison
          const actualType = (extractedTypes as Map<string, import('$services/virtualTypeChecker').InferredType>).get(assertion.symbol);
          
          if (!actualType) {
            testResult.status = 'failed';
            testResult.error = `シンボル '${assertion.symbol}' が見つかりません`;
            testResult.actualType = 'undefined';
            allPassed = false;
          } else {
            // Virtual TypeScript Environmentで型比較
            const comparisonResult = VirtualTypeChecker.compareTypes(
              assertion.expectedType,
              actualType
            );
            
            if (comparisonResult.matches) {
              testResult.status = 'passed';
              testResult.actualType = actualType.typeString;
            } else {
              testResult.status = 'failed';
              testResult.error = comparisonResult.details;
              testResult.actualType = actualType.typeString;
              allPassed = false;
            }
          }
        }
        
        testResults = [...testResults];
      }
    } catch (err) {
      // 型解析エラー
      parseError = `型解析に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`;
      testResults = [];
      overallResult = 'failure';
      isRunning = false;
      return;
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
  
  function getStatusIcon(status: TestResult['status']) {
    switch (status) {
      case 'pending': return IconPlayerPause;
      case 'running': return IconBolt;
      case 'passed': return IconCheck;
      case 'failed': return IconX;
      default: return IconQuestionMark;
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
  
  function toggleDetails(index: number): void {
    const newSet = new Set(showDetails);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    showDetails = newSet;
  }
  
  function getModeDescription(mode: string): string {
    switch (mode) {
      case 'exact':
        return '完全一致（型の表記も厳密にチェック）';
      case 'structural':
        return '構造的等価性（プロパティ順序や配列記法の差異を無視）';
      case 'assignable':
        return '代入可能性（実際の型が期待される型に代入可能か）';
      case 'partial':
        return '部分一致（期待される型のサブセット）';
      case 'shape':
        return '形状の互換性（型の形が一致するか）';
      default:
        return mode;
    }
  }
</script>

<div class="test-runner" bind:this={testRunnerElement}>
  <div class="runner-header">
    <h3 class="runner-title">テストケース</h3>
    <Button
      variant="secondary"
      onclick={runTests}
      disabled={isRunning}
      isLoading={isRunning}
    >
      {isRunning ? 'テスト実行中...' : 'テストを実行'}
    </Button>
  </div>
  
  {#if parseError}
    <div class="parse-error-container">
      <div class="parse-error-icon">
        <IconAlertTriangle size={48} color="var(--status-warning)" />
      </div>
      <h3 class="parse-error-title">コードの解析に失敗しました</h3>
      <p class="parse-error-message">{parseError}</p>
      <p class="parse-error-hint">コードの構文を確認し、もう一度お試しください。</p>
    </div>
  {:else if testResults.length > 0}
    <div class="test-results">
      {#each testResults as result, index (index)}
        <div class="test-case {result.status}">
          <div class="test-header">
            <div class="test-info">
              <span class="test-icon {result.status}">
                <svelte:component this={getStatusIcon(result.status)} size={20} />
              </span>
              <span class="test-name">
                {result.assertion.symbol}
                {#if result.assertion.description}
                  : {result.assertion.description}
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
          
          <div class="test-details">
            <button class="test-details-toggle" onclick={() => toggleDetails(index)}>
              詳細を表示
            </button>
            {#if showDetails.has(index)}
              <div class="assertion-details" transition:slide={{ duration: 200 }}>
                <div class="detail-row">
                  <span class="detail-label">シンボル:</span>
                  <span class="detail-value">{result.assertion.symbol}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">種類:</span>
                  <span class="detail-value">
                    {isASTTypeAssertion(result.assertion) ? result.assertion.symbolKind : result.assertion.kind}
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">期待される型:</span>
                  <pre class="type-value">{isASTTypeAssertion(result.assertion) 
                      ? patternToString(result.assertion.pattern) 
                      : result.assertion.expectedType}</pre>
                </div>
                {#if isASTTypeAssertion(result.assertion)}
                  <div class="detail-row">
                    <span class="detail-label">比較モード:</span>
                    <div class="mode-info">
                      <span class="detail-value">{result.assertion.mode}</span>
                      <span class="mode-hint">{getModeDescription(result.assertion.mode)}</span>
                    </div>
                  </div>
                {/if}
                {#if result.actualType}
                  <div class="detail-row">
                    <span class="detail-label">実際の型:</span>
                    <pre class="type-value">{result.actualType}</pre>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else if problem.typeAssertions.length === 0}
    <div class="no-tests">
      <p>この問題には型推論要件がありません</p>
    </div>
  {:else}
    <div class="test-list">
      <p class="test-count">
        {problem.typeAssertions.length} 個の型推論要件があります
      </p>
      <ul class="test-descriptions">
        {#each problem.typeAssertions as assertion}
          <li>
            {assertion.symbol} ({assertion.kind})
            {#if assertion.description}
              : {assertion.description}
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  
  {#if overallResult === 'success'}
    <div class="success-message">
      <span class="success-icon">
        <IconConfetti size={48} color="var(--status-success)" />
      </span>
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
    display: inline-flex;
    align-items: center;
  }
  
  .test-icon.pending {
    color: var(--text-tertiary);
  }
  
  .test-icon.running {
    color: var(--info);
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  .test-icon.passed {
    color: var(--status-success);
  }
  
  .test-icon.failed {
    color: var(--status-error);
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
  
  .test-details-toggle {
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--text-secondary);
    user-select: none;
    transition: color 0.2s ease;
    background: none;
    border: none;
    padding: 0.25rem 0;
    text-align: left;
    width: 100%;
  }
  
  .test-details-toggle:hover {
    color: var(--text-primary);
  }
  
  .assertion-details {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transform-origin: top;
  }
  
  .detail-row {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .detail-label {
    min-width: 100px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
  }
  
  .detail-value {
    font-size: 0.875rem;
    color: var(--text-primary);
    font-family: 'JetBrains Mono', monospace;
  }
  
  .type-value {
    margin: 0;
    padding: 0.5rem;
    background-color: var(--bg-code);
    border: 1px solid var(--border-light);
    border-radius: 0.25rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: var(--text-primary);
    overflow-x: auto;
  }
  
  .mode-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .mode-hint {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-style: italic;
    margin-left: 0.5rem;
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
  
  .parse-error-container {
    padding: 1.5rem;
    background-color: var(--error-bg);
    border: 2px solid var(--error-border);
    border-radius: 0.75rem;
    text-align: center;
  }
  
  .parse-error-icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }
  
  .parse-error-title {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--error-text);
  }
  
  .parse-error-message {
    margin: 0 0 0.75rem 0;
    padding: 0.75rem;
    background-color: var(--bg-primary);
    border-radius: 0.5rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
    color: var(--text-primary);
    text-align: left;
    word-break: break-word;
  }
  
  .parse-error-hint {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
</style>