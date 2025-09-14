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
  
  let editorContainer: HTMLDivElement;
  let editor: MonacoEditorInstance | null = null;
  let monaco: typeof import('monaco-editor') | null = null;
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  
  // エディタ設定を監視
  const settings = $derived(editorStore.editorSettings);
  const theme = $derived(themeStore.current);
  
  // Monaco Editorの初期化（クライアントサイドのみ）
  onMount(async () => {
    try {
      // 動的インポートでMonaco Editorを読み込み
      monaco = await import('monaco-editor');
      
      // TypeScript設定
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
      
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        module: monaco.languages.typescript.ModuleKind.ESNext,
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
      updateMarkers();
      
      isLoading = false;
    } catch (err) {
      console.error('Failed to load Monaco Editor:', err);
      error = 'エディタの読み込みに失敗しました';
      isLoading = false;
    }
  });
  
  // エディタの破棄
  onDestroy(() => {
    editor?.dispose();
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
    if (editor && monaco) {
      monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
    }
  });
  
  // マーカーの更新を監視
  $effect(() => {
    updateMarkers();
  });
  
  // マーカーを設定
  function updateMarkers(): void {
    if (!editor || !monaco) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    const monacoMarkers = markers.map(marker => {
      const markerData: import('monaco-editor').editor.IMarkerData = {
        severity: {
          error: monaco!.MarkerSeverity.Error,
          warning: monaco!.MarkerSeverity.Warning,
          info: monaco!.MarkerSeverity.Info,
          hint: monaco!.MarkerSeverity.Hint,
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
    
    monaco.editor.setModelMarkers(model, 'typescript', monacoMarkers);
  }
</script>

<div class="monaco-editor-wrapper" style="height: {height}; width: {width};">
  {#if isLoading}
    <div class="loading">
      <div class="spinner"></div>
      <p>エディタを読み込んでいます...</p>
    </div>
  {:else if error}
    <div class="error">
      <p>{error}</p>
    </div>
  {:else}
    <div 
      bind:this={editorContainer}
      class="monaco-editor-container"
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
  }
  
  .monaco-editor-container {
    width: 100%;
    height: 100%;
  }
  
  .loading,
  .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
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
  
  .loading p,
  .error p {
    margin-top: 1rem;
    font-size: 0.875rem;
  }
</style>