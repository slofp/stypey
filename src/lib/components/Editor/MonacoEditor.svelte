<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as monaco from 'monaco-editor';
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
  let monaco_: typeof monaco;
  
  // エディタ設定を監視
  const settings = $derived(editorStore.editorSettings);
  const theme = $derived(themeStore.current);
  
  // Monaco Editorの初期化
  onMount(async () => {
    // Monaco Editorの設定
    monaco_ = monaco;
    
    // TypeScript設定
    monaco_.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    
    monaco_.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco_.languages.typescript.ScriptTarget.ESNext,
      module: monaco_.languages.typescript.ModuleKind.ESNext,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      allowSyntheticDefaultImports: true,
      forceConsistentCasingInFileNames: true,
      moduleResolution: monaco_.languages.typescript.ModuleResolutionKind.NodeJs,
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
    
    editor = monaco_.editor.create(editorContainer, options);
    
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
    editor.addCommand(monaco_.KeyMod.CtrlCmd | monaco_.KeyCode.KeyS, () => {
      const currentValue = editor?.getValue() ?? '';
      onSave?.(currentValue);
      editorStore.markAsSaved();
    });
    
    // フォーマットコマンド
    editor.addCommand(monaco_.KeyMod.CtrlCmd | monaco_.KeyMod.Shift | monaco_.KeyCode.KeyF, () => {
      editor?.getAction('editor.action.formatDocument')?.run();
    });
    
    // マーカーの設定
    updateMarkers();
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
    if (editor) {
      monaco_.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
    }
  });
  
  // マーカーの更新を監視
  $effect(() => {
    updateMarkers();
  });
  
  // マーカーを設定
  function updateMarkers(): void {
    if (!editor || !monaco_) return;
    
    const model = editor.getModel();
    if (!model) return;
    
    const monacoMarkers = markers.map(marker => {
      const markerData: monaco.editor.IMarkerData = {
        severity: {
          error: monaco_.MarkerSeverity.Error,
          warning: monaco_.MarkerSeverity.Warning,
          info: monaco_.MarkerSeverity.Info,
          hint: monaco_.MarkerSeverity.Hint,
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
    
    monaco_.editor.setModelMarkers(model, 'typescript', monacoMarkers);
  }
</script>

<div 
  bind:this={editorContainer}
  class="monaco-editor-container"
  style="height: {height}; width: {width};"
></div>

<style>
  .monaco-editor-container {
    position: relative;
    border: 1px solid var(--border-default);
    border-radius: 0.5rem;
    overflow: hidden;
  }
</style>