import type { editor } from 'monaco-editor';

/**
 * エディタの設定
 */
export interface EditorSettings {
  readonly fontSize: number;
  readonly tabSize: 2 | 4;
  readonly wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  readonly minimap: boolean;
  readonly lineNumbers: 'on' | 'off' | 'relative' | 'interval';
  readonly renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
  readonly cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
  readonly cursorStyle: 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline' | 'underline-thin';
  readonly autoClosingBrackets: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  readonly autoClosingQuotes: 'always' | 'languageDefined' | 'beforeWhitespace' | 'never';
  readonly formatOnPaste: boolean;
  readonly formatOnType: boolean;
}

/**
 * カーソル位置
 */
export interface CursorPosition {
  readonly line: number;
  readonly column: number;
}

/**
 * テキスト選択範囲
 */
export interface Selection {
  readonly start: CursorPosition;
  readonly end: CursorPosition;
}

/**
 * エディタの状態
 */
export interface EditorState {
  readonly value: string;
  readonly cursorPosition: CursorPosition;
  readonly selections: ReadonlyArray<Selection>;
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly isDirty: boolean;
}

/**
 * エディタのイベント
 */
export interface EditorEvents {
  readonly onChange: (value: string) => void;
  readonly onCursorChange: (position: CursorPosition) => void;
  readonly onSelectionChange: (selections: ReadonlyArray<Selection>) => void;
  readonly onBlur: () => void;
  readonly onFocus: () => void;
  readonly onSave: (value: string) => void;
}

/**
 * Monaco Editorのオプション型をラップ
 */
export type MonacoEditorOptions = editor.IStandaloneEditorConstructionOptions;

/**
 * Monaco Editorのインスタンス型
 */
export type MonacoEditorInstance = editor.IStandaloneCodeEditor;

/**
 * コード補完の提案
 */
export interface CompletionItem {
  readonly label: string;
  readonly kind: CompletionItemKind;
  readonly detail?: string;
  readonly documentation?: string;
  readonly insertText: string;
  readonly sortText?: string;
  readonly filterText?: string;
}

/**
 * 補完アイテムの種類
 */
export type CompletionItemKind = 
  | 'keyword'
  | 'variable'
  | 'function'
  | 'method'
  | 'class'
  | 'interface'
  | 'module'
  | 'property'
  | 'enum'
  | 'value'
  | 'constant'
  | 'snippet';

/**
 * エディタのテーマ
 */
export type EditorTheme = 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';

/**
 * エディタマーカー（エラー表示など）
 */
export interface EditorMarker {
  readonly severity: MarkerSeverity;
  readonly startLineNumber: number;
  readonly startColumn: number;
  readonly endLineNumber: number;
  readonly endColumn: number;
  readonly message: string;
  readonly code?: string;
  readonly source?: string;
}

/**
 * マーカーの重要度
 */
export type MarkerSeverity = 'error' | 'warning' | 'info' | 'hint';

/**
 * デフォルトのエディタ設定
 */
export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  minimap: false,
  lineNumbers: 'on',
  renderWhitespace: 'selection',
  cursorBlinking: 'blink',
  cursorStyle: 'line',
  autoClosingBrackets: 'languageDefined',
  autoClosingQuotes: 'languageDefined',
  formatOnPaste: true,
  formatOnType: true,
} as const;

/**
 * 型ガード: EditorSettingsかどうかを判定
 */
export function isEditorSettings(value: unknown): value is EditorSettings {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj['fontSize'] === 'number' &&
    (obj['tabSize'] === 2 || obj['tabSize'] === 4) &&
    typeof obj['wordWrap'] === 'string' &&
    typeof obj['minimap'] === 'boolean' &&
    typeof obj['lineNumbers'] === 'string'
  );
}

/**
 * Monaco Editorのオプションを生成
 */
export function createMonacoOptions(settings: EditorSettings): Partial<MonacoEditorOptions> {
  return {
    fontSize: settings.fontSize,
    tabSize: settings.tabSize,
    wordWrap: settings.wordWrap,
    minimap: {
      enabled: settings.minimap,
    },
    lineNumbers: settings.lineNumbers,
    renderWhitespace: settings.renderWhitespace,
    cursorBlinking: settings.cursorBlinking,
    cursorStyle: settings.cursorStyle,
    autoClosingBrackets: settings.autoClosingBrackets,
    autoClosingQuotes: settings.autoClosingQuotes,
    formatOnPaste: settings.formatOnPaste,
    formatOnType: settings.formatOnType,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    readOnly: false,
    language: 'typescript',
  };
}