/**
 * テーマの種類
 */
export type Theme = 'light' | 'dark';

/**
 * システムのテーマ設定
 */
export type SystemTheme = 'light' | 'dark' | 'auto';

/**
 * テーマの設定
 */
export interface ThemePreference {
  readonly mode: SystemTheme;
  readonly preferredLight: Theme;
  readonly preferredDark: Theme;
}

/**
 * カラーパレット
 */
export interface ColorPalette {
  readonly primary: ColorScale;
  readonly secondary: ColorScale;
  readonly success: string;
  readonly error: string;
  readonly warning: string;
  readonly info: string;
  readonly background: ColorBackground;
  readonly text: ColorText;
  readonly border: ColorBorder;
}

/**
 * カラースケール
 */
export interface ColorScale {
  readonly 50: string;
  readonly 100: string;
  readonly 200: string;
  readonly 300: string;
  readonly 400: string;
  readonly 500: string;
  readonly 600: string;
  readonly 700: string;
  readonly 800: string;
  readonly 900: string;
}

/**
 * 背景色の定義
 */
export interface ColorBackground {
  readonly primary: string;
  readonly secondary: string;
  readonly tertiary: string;
  readonly elevated: string;
  readonly overlay: string;
}

/**
 * テキスト色の定義
 */
export interface ColorText {
  readonly primary: string;
  readonly secondary: string;
  readonly tertiary: string;
  readonly disabled: string;
  readonly inverse: string;
}

/**
 * ボーダー色の定義
 */
export interface ColorBorder {
  readonly default: string;
  readonly light: string;
  readonly dark: string;
  readonly focus: string;
}

/**
 * テーマ設定の保存データ
 */
export interface ThemeData {
  readonly currentTheme: Theme;
  readonly systemTheme: SystemTheme;
  readonly lastManualChange?: Date;
}

/**
 * ライトテーマのカラーパレット
 */
export const LIGHT_PALETTE: ColorPalette = {
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3',
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },
  secondary: {
    50: '#f3e5f5',
    100: '#e1bee7',
    200: '#ce93d8',
    300: '#ba68c8',
    400: '#ab47bc',
    500: '#9c27b0',
    600: '#8e24aa',
    700: '#7b1fa2',
    800: '#6a1b9a',
    900: '#4a148c',
  },
  success: '#4caf50',
  error: '#f44336',
  warning: '#ff9800',
  info: '#2196f3',
  background: {
    primary: '#ffffff',
    secondary: '#f5f5f5',
    tertiary: '#fafafa',
    elevated: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  text: {
    primary: '#212121',
    secondary: '#757575',
    tertiary: '#9e9e9e',
    disabled: '#bdbdbd',
    inverse: '#ffffff',
  },
  border: {
    default: '#e0e0e0',
    light: '#f5f5f5',
    dark: '#bdbdbd',
    focus: '#2196f3',
  },
} as const;

/**
 * ダークテーマのカラーパレット
 */
export const DARK_PALETTE: ColorPalette = {
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3',
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },
  secondary: {
    50: '#f3e5f5',
    100: '#e1bee7',
    200: '#ce93d8',
    300: '#ba68c8',
    400: '#ab47bc',
    500: '#9c27b0',
    600: '#8e24aa',
    700: '#7b1fa2',
    800: '#6a1b9a',
    900: '#4a148c',
  },
  success: '#66bb6a',
  error: '#ef5350',
  warning: '#ffa726',
  info: '#42a5f5',
  background: {
    primary: '#121212',
    secondary: '#1e1e1e',
    tertiary: '#2c2c2c',
    elevated: '#383838',
    overlay: 'rgba(255, 255, 255, 0.1)',
  },
  text: {
    primary: '#e0e0e0',
    secondary: '#b0b0b0',
    tertiary: '#757575',
    disabled: '#424242',
    inverse: '#121212',
  },
  border: {
    default: '#424242',
    light: '#2c2c2c',
    dark: '#616161',
    focus: '#42a5f5',
  },
} as const;

/**
 * デフォルトのテーマ設定
 */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = {
  mode: 'auto',
  preferredLight: 'light',
  preferredDark: 'dark',
} as const;

/**
 * 型ガード: Themeかどうかを判定
 */
export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/**
 * 型ガード: SystemThemeかどうかを判定
 */
export function isSystemTheme(value: unknown): value is SystemTheme {
  return value === 'light' || value === 'dark' || value === 'auto';
}

/**
 * 型ガード: ThemePreferenceかどうかを判定
 */
export function isThemePreference(value: unknown): value is ThemePreference {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  return (
    isSystemTheme(obj['mode']) &&
    isTheme(obj['preferredLight']) &&
    isTheme(obj['preferredDark'])
  );
}

/**
 * システムのテーマを取得
 */
export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  return mediaQuery.matches ? 'dark' : 'light';
}

/**
 * 実際に適用するテーマを決定
 */
export function resolveTheme(preference: ThemePreference): Theme {
  if (preference.mode === 'auto') {
    return getSystemTheme();
  }
  
  return preference.mode;
}