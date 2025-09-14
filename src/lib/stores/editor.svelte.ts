import type { EditorSettings, EditorState, CursorPosition, Selection } from '$types/editor';
import { DEFAULT_EDITOR_SETTINGS } from '$types/editor';
import { storage } from '$types/storage';

/**
 * エディタ管理ストア
 * Svelte 5 Runesを使用
 */
class EditorStore {
  private settings = $state<EditorSettings>(DEFAULT_EDITOR_SETTINGS);
  private state = $state<EditorState>({
    value: '',
    cursorPosition: { line: 1, column: 1 },
    selections: [],
    scrollTop: 0,
    scrollLeft: 0,
    isDirty: false
  });
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }
  
  /**
   * エディタ設定を取得
   */
  get editorSettings(): EditorSettings {
    return this.settings;
  }
  
  /**
   * エディタの状態を取得
   */
  get editorState(): EditorState {
    return this.state;
  }
  
  /**
   * エディタの値を取得
   */
  get value(): string {
    return this.state.value;
  }
  
  /**
   * エディタの値を設定
   */
  setValue(value: string): void {
    this.state = {
      ...this.state,
      value,
      isDirty: true
    };
  }
  
  /**
   * カーソル位置を更新
   */
  updateCursorPosition(position: CursorPosition): void {
    this.state = {
      ...this.state,
      cursorPosition: position
    };
  }
  
  /**
   * 選択範囲を更新
   */
  updateSelections(selections: ReadonlyArray<Selection>): void {
    this.state = {
      ...this.state,
      selections
    };
  }
  
  /**
   * スクロール位置を更新
   */
  updateScrollPosition(scrollTop: number, scrollLeft: number): void {
    this.state = {
      ...this.state,
      scrollTop,
      scrollLeft
    };
  }
  
  /**
   * 設定を更新
   */
  updateSettings(settings: Partial<EditorSettings>): void {
    this.settings = {
      ...this.settings,
      ...settings
    };
    
    this.saveSettings();
  }
  
  /**
   * フォントサイズを変更
   */
  changeFontSize(delta: number): void {
    const newSize = Math.max(10, Math.min(24, this.settings.fontSize + delta));
    this.updateSettings({ fontSize: newSize });
  }
  
  /**
   * タブサイズを切り替え
   */
  toggleTabSize(): void {
    const newSize = this.settings.tabSize === 2 ? 4 : 2;
    this.updateSettings({ tabSize: newSize });
  }
  
  /**
   * ワードラップを切り替え
   */
  toggleWordWrap(): void {
    const newWrap = this.settings.wordWrap === 'on' ? 'off' : 'on';
    this.updateSettings({ wordWrap: newWrap });
  }
  
  /**
   * ミニマップを切り替え
   */
  toggleMinimap(): void {
    this.updateSettings({ minimap: !this.settings.minimap });
  }
  
  /**
   * 行番号表示を切り替え
   */
  cycleLineNumbers(): void {
    const options: Array<EditorSettings['lineNumbers']> = ['on', 'off', 'relative'];
    const currentIndex = options.indexOf(this.settings.lineNumbers);
    const nextIndex = (currentIndex + 1) % options.length;
    const nextValue = options[nextIndex];
    if (nextValue) {
      this.updateSettings({ lineNumbers: nextValue });
    }
  }
  
  /**
   * 保存状態をリセット
   */
  markAsSaved(): void {
    this.state = {
      ...this.state,
      isDirty: false
    };
  }
  
  /**
   * エディタをリセット
   */
  reset(): void {
    this.state = {
      value: '',
      cursorPosition: { line: 1, column: 1 },
      selections: [],
      scrollTop: 0,
      scrollLeft: 0,
      isDirty: false
    };
  }
  
  /**
   * 初期化
   */
  private initialize(): void {
    // ローカルストレージから設定を読み込み
    const savedSettings = storage.get('editorSettings');
    if (savedSettings) {
      this.settings = savedSettings;
    }
  }
  
  /**
   * 設定を保存
   */
  private saveSettings(): void {
    storage.set('editorSettings', this.settings);
  }
}

/**
 * エディタストアのシングルトンインスタンス
 */
export const editorStore = new EditorStore();