import { createGlobalTheme, style } from '@vanilla-extract/css';
import { vars } from './tokens.css';

/**
 * テーマ変数の定義
 */
export const themeVars = createGlobalTheme(':root', {
  colors: {
    background: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      tertiary: '#f1f3f5',
      elevated: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
      code: '#f6f8fa',
      hover: 'rgba(0, 0, 0, 0.04)',
      active: 'rgba(0, 0, 0, 0.08)',
    },
    text: {
      primary: '#212529',
      secondary: '#495057',
      tertiary: '#6c757d',
      disabled: '#adb5bd',
      inverse: '#ffffff',
      link: vars.color.primary[600],
      code: '#e83e8c',
    },
    border: {
      default: '#dee2e6',
      light: '#e9ecef',
      dark: '#adb5bd',
      focus: vars.color.primary[500],
    },
    status: {
      success: vars.color.semantic.success,
      error: vars.color.semantic.error,
      warning: vars.color.semantic.warning,
      info: vars.color.semantic.info,
    },
  },
});

/**
 * ライトテーマクラス
 */
export const lightThemeClass = style({
  backgroundColor: '#ffffff',
  color: '#212529',
});

/**
 * ダークテーマクラス
 */
export const darkThemeClass = style({
  backgroundColor: '#1a1a1a',
  color: '#e9ecef',
});

/**
 * テーマタイプ
 */
export type ThemeColors = typeof themeVars;

/**
 * テーマによるグローバルスタイル
 */
export const themeStyles = {
  light: lightThemeClass,
  dark: darkThemeClass,
} as const;