<script lang="ts">
  import { browser } from '$app/environment';
  import EditorSettings from '$components/Editor/EditorSettings.svelte';
  import { themeStore } from '$stores/theme.svelte';
  
  // アイコンを絵文字で代替
  const IconSun = '☀️';
  const IconMoon = '🌙';
  
  let editorValue = $state(`// TypeScript 型学習プラットフォーム「TypeMaster」へようこそ！
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
  
  let settingsOpen = $state(false);
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
  
  function toggleTheme(): void {
    themeStore.toggle();
  }
  
  const theme = $derived(themeStore.current);
</script>

<svelte:head>
  <title>TypeMaster - TypeScript型学習プラットフォーム</title>
  <meta name="description" content="TypeScriptの型システムを実践的に学習できるインタラクティブなプラットフォーム" />
</svelte:head>

<div class="container">
  <header class="header">
    <div class="header-content">
      <h1 class="logo">TypeMaster</h1>
      <nav class="nav">
        <button class="nav-link" onclick={() => {}}>
          問題一覧
        </button>
        <button class="nav-link" onclick={() => {}}>
          進捗
        </button>
        <button class="nav-link" onclick={() => {}}>
          ヘルプ
        </button>
      </nav>
      <div class="header-actions">
        <EditorSettings bind:isOpen={settingsOpen} />
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
    color: var(--text-primary);
    margin: 0;
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
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.2s ease;
    padding: 0.5rem 0;
  }
  
  .nav-link:hover {
    color: var(--text-primary);
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
    max-width: 1280px;
    width: 100%;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .playground {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-default);
    border-radius: 0.75rem;
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
    
    .playground-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
  }
</style>