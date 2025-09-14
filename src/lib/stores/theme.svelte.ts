import type { Theme, SystemTheme, ThemePreference } from '$types/theme';
import { storage } from '$types/storage';

/**
 * テーマ管理ストア
 * Svelte 5 Runesを使用
 */
class ThemeStore {
  private theme = $state<Theme>('light');
  private systemTheme = $state<SystemTheme>('auto');
  
  constructor() {
    // 初期化時にローカルストレージから設定を読み込み
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }
  
  /**
   * 現在のテーマを取得
   */
  get current(): Theme {
    return this.theme;
  }
  
  /**
   * システムテーマ設定を取得
   */
  get systemPreference(): SystemTheme {
    return this.systemTheme;
  }
  
  /**
   * テーマを切り替え
   */
  toggle(): void {
    this.setTheme(this.theme === 'light' ? 'dark' : 'light');
  }
  
  /**
   * テーマを設定
   */
  setTheme(theme: Theme): void {
    this.theme = theme;
    this.applyTheme(theme);
    this.savePreference();
  }
  
  /**
   * システムテーマ設定を変更
   */
  setSystemTheme(systemTheme: SystemTheme): void {
    this.systemTheme = systemTheme;
    
    if (systemTheme === 'auto') {
      this.detectSystemTheme();
    } else {
      this.setTheme(systemTheme);
    }
    
    this.savePreference();
  }
  
  /**
   * 初期化処理
   */
  private initialize(): void {
    // ローカルストレージから設定を読み込み
    const preference = storage.get('theme');
    
    if (preference) {
      this.systemTheme = preference.mode;
      
      if (preference.mode === 'auto') {
        this.detectSystemTheme();
      } else {
        this.theme = preference.mode;
      }
    } else {
      // デフォルトはシステム設定に従う
      this.detectSystemTheme();
    }
    
    // システムテーマの変更を監視
    this.watchSystemTheme();
    
    // テーマを適用
    this.applyTheme(this.theme);
  }
  
  /**
   * システムのテーマを検出
   */
  private detectSystemTheme(): void {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.theme = mediaQuery.matches ? 'dark' : 'light';
  }
  
  /**
   * システムテーマの変更を監視
   */
  private watchSystemTheme(): void {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent): void => {
      if (this.systemTheme === 'auto') {
        this.theme = e.matches ? 'dark' : 'light';
        this.applyTheme(this.theme);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
  }
  
  /**
   * テーマをDOMに適用
   */
  private applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') return;
    
    document.documentElement.setAttribute('data-theme', theme);
    
    // メタテーマカラーも更新
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        theme === 'light' ? '#ffffff' : '#1a1a1a'
      );
    }
  }
  
  /**
   * 設定を保存
   */
  private savePreference(): void {
    const preference: ThemePreference = {
      mode: this.systemTheme,
      preferredLight: 'light',
      preferredDark: 'dark'
    };
    
    storage.set('theme', preference);
  }
}

/**
 * テーマストアのシングルトンインスタンス
 */
export const themeStore = new ThemeStore();