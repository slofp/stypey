<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { MonacoEditorInstance, MonacoEditorOptions, EditorMarker } from '$types/editor';
  import { createMonacoOptions } from '$types/editor';
  import { editorStore } from '$stores/editor.svelte';
  import { themeStore } from '$stores/theme.svelte';
  
  interface Props {
    value: string;
    language?: string;
    readOnly?: boolean;
    height?: string;
    width?: string;
    onChange?: (value: string) => void;
    onSave?: (value: string) => void;
    markers?: ReadonlyArray<EditorMarker>;
  }
  
  let {
    value = $bindable(),
    language = 'typescript',
    readOnly = false,
    height = '100%',
    width = '100%',
    onChange,
    onSave,
    markers = []
  }: Props = $props();
  
  let editorContainer: HTMLDivElement | undefined;
  let editor: MonacoEditorInstance | null = null;
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let isMounted = $state(false);
  
  // エディタ設定を監視
  const settings = $derived(editorStore.editorSettings);
  const theme = $derived(themeStore.current);
  
  // DOM要素がマウントされたときに呼び出される
  function initializeEditor(node: HTMLDivElement) {
    editorContainer = node;
    isMounted = true;
    setupEditor();
    
    return {
      destroy() {
        if (editor) {
          editor.dispose();
          editor = null;
        }
      }
    };
  }
  
  // エディタのセットアップ
  async function setupEditor() {
    if (!editorContainer) {
      return;
    }
    
    try {
      // Monaco EditorとWorker設定を動的インポート
      const { setupMonacoEnvironment, monaco } = await import('./MonacoWorker');
      
      // WebWorker環境を設定
      setupMonacoEnvironment();
      
      // TypeScript設定
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
      
      // デフォルトの型定義を追加
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        `declare const console: Console;`,
        'ts:global.d.ts'
      );
      
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        lib: ['ESNext', 'DOM', 'DOM.Iterable'],
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        resolveJsonModule: true,
        noImplicitAny: true,
        strictNullChecks: true,
        strictFunctionTypes: true,
        strictBindCallApply: true,
        strictPropertyInitialization: true,
        noImplicitThis: true,
        alwaysStrict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        exactOptionalPropertyTypes: true,
        noUncheckedIndexedAccess: true,
        noPropertyAccessFromIndexSignature: true,
      });
      
      // エディタインスタンスの作成
      const options: Partial<MonacoEditorOptions> = {
        ...createMonacoOptions(settings),
        value,
        language,
        readOnly,
        theme: theme === 'dark' ? 'vs-dark' : 'vs',
        automaticLayout: true,
        minimap: {
          enabled: settings.minimap,
        },
        scrollBeyondLastLine: false,
        fontSize: settings.fontSize,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        lineNumbers: settings.lineNumbers,
        suggestOnTriggerCharacters: true,
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false
        },
        parameterHints: {
          enabled: true
        },
        formatOnType: true,
        formatOnPaste: true,
        folding: true,
        foldingStrategy: 'indentation',
      };
      
      editor = monaco.editor.create(editorContainer, options);
      
      // イベントリスナーの設定
      editor.onDidChangeModelContent(() => {
        const newValue = editor?.getValue() ?? '';
        value = newValue;
        onChange?.(newValue);
        editorStore.setValue(newValue);
      });
      
      editor.onDidChangeCursorPosition((e) => {
        editorStore.updateCursorPosition({
          line: e.position.lineNumber,
          column: e.position.column,
        });
      });
      
      editor.onDidChangeCursorSelection((e) => {
        const selections = editor?.getSelections() ?? [];
        editorStore.updateSelections(
          selections.map(sel => ({
            start: {
              line: sel.startLineNumber,
              column: sel.startColumn,
            },
            end: {
              line: sel.endLineNumber,
              column: sel.endColumn,
            },
          }))
        );
      });
      
      editor.onDidScrollChange((e) => {
        editorStore.updateScrollPosition(e.scrollTop, e.scrollLeft);
      });
      
      // 保存コマンドの登録
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        const currentValue = editor?.getValue() ?? '';
        onSave?.(currentValue);
        editorStore.markAsSaved();
      });
      
      // フォーマットコマンド
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
        editor?.getAction('editor.action.formatDocument')?.run();
      });
      
      // マーカーの設定
      updateMarkers(monaco);
      
      // テーマ更新のためにmonacoを保存
      (window as any).__monaco = monaco;
      
      isLoading = false;
    } catch (err) {
      console.error('Failed to load Monaco Editor:', err);
      error = `エディタの読み込みに失敗しました: ${err instanceof Error ? err.message : 'Unknown error'}`;
      isLoading = false;
    }
  }
  
  // エディタの破棄
  onDestroy(() => {
    if (editor) {
      editor.dispose();
      editor = null;
    }
  });
  
  // 値の更新を監視
  $effect(() => {
    if (editor && editor.getValue() !== value) {
      editor.setValue(value);
    }
  });
  
  // 設定の更新を監視
  $effect(() => {
    if (editor) {
      editor.updateOptions({
        fontSize: settings.fontSize,
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        lineNumbers: settings.lineNumbers,
        minimap: {
          enabled: settings.minimap,
        },
        renderWhitespace: settings.renderWhitespace,
        cursorBlinking: settings.cursorBlinking,
        cursorStyle: settings.cursorStyle,
      });
    }
  });
  
  // テーマの更新を監視
  $effect(() => {
    const monaco = (window as any).__monaco;
    if (editor && monaco) {
      monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
    }
  });
  
  // マーカーの更新を監視
  $effect(() => {
    const monaco = (window as any).__monaco;
    if (monaco) {
      updateMarkers(monaco);
    }
  });
  
  // マーカーを設定
  function updateMarkers(monaco: typeof import('monaco-editor')): void {
    if (!editor || !monaco) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    // マーカーが空の場合はデフォルトのTypeScript診断を使用
    if (markers.length === 0) {
      // TypeScriptの自動診断に任せる
      return;
    }
    
    const monacoMarkers = markers.map(marker => {
      const markerData: import('monaco-editor').editor.IMarkerData = {
        severity: {
          error: monaco.MarkerSeverity.Error,
          warning: monaco.MarkerSeverity.Warning,
          info: monaco.MarkerSeverity.Info,
          hint: monaco.MarkerSeverity.Hint,
        }[marker.severity],
        startLineNumber: marker.startLineNumber,
        startColumn: marker.startColumn,
        endLineNumber: marker.endLineNumber,
        endColumn: marker.endColumn,
        message: marker.message,
      };
      
      if (marker.code !== undefined) {
        markerData.code = marker.code;
      }
      if (marker.source !== undefined) {
        markerData.source = marker.source;
      }
      
      return markerData;
    });
    
    monaco.editor.setModelMarkers(model, 'custom', monacoMarkers);
  }
</script>

<div class="monaco-editor-wrapper" style="height: {height}; width: {width};">
  {#if isLoading}
    <div class="loading">
      <div class="spinner"></div>
      <p>エディタを読み込んでいます...</p>
    </div>
  {/if}
  
  {#if error}
    <div class="error">
      <p>{error}</p>
      <button onclick={() => window.location.reload()} class="retry-button">
        再読み込み
      </button>
    </div>
  {/if}
  
  {#if !error}
    <div 
      use:initializeEditor
      class="monaco-editor-container"
      class:hidden={isLoading}
    ></div>
  {/if}
</div>

<style>
  .monaco-editor-wrapper {
    position: relative;
    border: 1px solid var(--border-default);
    border-radius: 0.5rem;
    overflow: hidden;
    background-color: var(--bg-code);
    min-height: 100px;
  }
  
  .monaco-editor-container {
    width: 100%;
    height: 100%;
  }
  
  .monaco-editor-container.hidden {
    visibility: hidden;
  }
  
  .loading,
  .error {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-primary);
    color: var(--text-secondary);
    z-index: 10;
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
  
  .loading p,
  .error p {
    margin-top: 1rem;
    font-size: 0.875rem;
  }
  
  .retry-button {
    margin-top: 1rem;
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
</style>