<script lang="ts">
  import { browser } from '$app/environment';
  
  let editorValue = $state(`// TypeScript 型学習プラットフォーム「Stypey」へようこそ！
// ここでTypeScriptの型システムを学習できます。

// 基本的な型注釈
const message: string = "Hello, TypeScript!";
const count: number = 42;
const isReady: boolean = true;

// オブジェクト型
interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  isActive: true
};

// ジェネリクス
function identity<T>(value: T): T {
  return value;
}

const result = identity<string>("TypeScript");

// Union型
type Status = "pending" | "success" | "error";
const currentStatus: Status = "success";

// 型推論を活用
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);

console.log(message, user, result, doubled);`);
  
  let MonacoEditor = $state<typeof import('$components/Editor/MonacoEditor.svelte').default | null>(null);
  
  // クライアントサイドでのみMonaco Editorを読み込み
  $effect(() => {
    if (browser && !MonacoEditor) {
      import('$components/Editor/MonacoEditor.svelte').then((module) => {
        MonacoEditor = module.default;
      });
    }
  });
  
  function handleEditorChange(value: string): void {
    editorValue = value;
  }
  
  function handleSave(value: string): void {
    console.log('保存されました:', value);
  }
</script>

<svelte:head>
  <title>Stypey - TypeScript型学習プラットフォーム</title>
  <meta name="description" content="TypeScriptの型システムを実践的に学習できるインタラクティブなプラットフォーム" />
</svelte:head>

<div class="container">
  <div class="main">
    <div class="playground">
      <div class="playground-header">
        <h2 class="playground-title">TypeScript Playground</h2>
        <div class="playground-info">
          <span class="info-badge">TypeScript 5.9</span>
          <span class="info-badge">Strict Mode</span>
        </div>
      </div>
      
      <div class="editor-wrapper">
        {#if browser && MonacoEditor}
          <MonacoEditor
            bind:value={editorValue}
            language="typescript"
            height="500px"
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
      
      <div class="playground-footer">
        <p class="help-text">
          <kbd>Ctrl/Cmd + S</kbd> で保存 | <kbd>Ctrl/Cmd + Shift + F</kbd> でフォーマット
        </p>
      </div>
    </div>
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
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .playground {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-default);
    border-radius: 0.5rem;
    overflow: hidden;
  }
  
  .playground-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-default);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .playground-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }
  
  .playground-info {
    display: flex;
    gap: 0.5rem;
  }
  
  .info-badge {
    padding: 0.25rem 0.75rem;
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .editor-wrapper {
    padding: 1.5rem;
    min-height: 500px;
  }
  
  .editor-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 500px;
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
  
  .playground-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-default);
    background-color: var(--bg-tertiary);
  }
  
  .help-text {
    margin: 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
  
  .help-text kbd {
    padding: 0.125rem 0.375rem;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-default);
    border-radius: 0.25rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
  }
  
  @media (max-width: 768px) {
    .main {
      padding: 1rem;
    }
    
    .playground-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
  }
</style>