import type { ThemePreference } from './theme';
import type { EditorSettings } from './editor';
import type { ProblemDefinition, TestResult } from './problem';

/**
 * ローカルストレージのキー
 */
export type StorageKey = 'theme' | 'progress' | 'editorSettings' | 'completedProblems' | 'currentProblem';

/**
 * ストレージのスキーマ
 */
export interface StorageSchema {
  readonly theme: ThemePreference;
  readonly progress: UserProgress;
  readonly editorSettings: EditorSettings;
  readonly completedProblems: CompletedProblemsData;
  readonly currentProblem: CurrentProblemData | null;
}

/**
 * ユーザーの進捗情報
 */
export interface UserProgress {
  readonly userId: string;
  readonly totalScore: number;
  readonly level: number;
  readonly experience: number;
  readonly streakDays: number;
  readonly lastActiveDate: Date;
  readonly achievements: ReadonlyArray<Achievement>;
}

/**
 * 完了した問題のデータ
 */
export interface CompletedProblemsData {
  readonly problems: ReadonlyArray<CompletedProblem>;
  readonly totalCompleted: number;
  readonly byDifficulty: {
    readonly easy: number;
    readonly medium: number;
    readonly hard: number;
  };
  readonly byCategory: ReadonlyMap<string, number>;
}

/**
 * 完了した問題の詳細
 */
export interface CompletedProblem {
  readonly problemId: string;
  readonly completedAt: Date;
  readonly attempts: number;
  readonly solution: string;
  readonly timeSpent: number;
  readonly hintsUsed: number;
  readonly score: number;
}

/**
 * 現在取り組んでいる問題のデータ
 */
export interface CurrentProblemData {
  readonly problemId: string;
  readonly startedAt: Date;
  readonly code: string;
  readonly attempts: number;
  readonly hintsViewed: ReadonlyArray<number>;
  readonly lastSaved: Date;
}

/**
 * 実績
 */
export interface Achievement {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly unlockedAt: Date;
  readonly category: AchievementCategory;
  readonly rarity: AchievementRarity;
}

/**
 * 実績のカテゴリ
 */
export type AchievementCategory = 
  | 'completion'
  | 'streak'
  | 'speed'
  | 'mastery'
  | 'exploration';

/**
 * 実績のレアリティ
 */
export type AchievementRarity = 
  | 'common'
  | 'rare'
  | 'epic'
  | 'legendary';

/**
 * ストレージのエラー
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly key: StorageKey,
    public readonly operation: 'get' | 'set' | 'remove' | 'clear'
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * ストレージのユーティリティクラス
 */
export class StorageManager {
  private readonly prefix = 'stypy_';

  /**
   * データを取得
   */
  get<K extends StorageKey>(key: K): StorageSchema[K] | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (item === null) {
        return null;
      }
      
      const data = JSON.parse(item) as StorageSchema[K];
      return this.deserialize(key, data);
    } catch (error) {
      throw new StorageError(
        `Failed to get data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        key,
        'get'
      );
    }
  }

  /**
   * データを保存
   */
  set<K extends StorageKey>(key: K, value: StorageSchema[K]): void {
    try {
      const data = this.serialize(key, value);
      localStorage.setItem(this.prefix + key, JSON.stringify(data));
    } catch (error) {
      throw new StorageError(
        `Failed to set data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        key,
        'set'
      );
    }
  }

  /**
   * データを削除
   */
  remove(key: StorageKey): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      throw new StorageError(
        `Failed to remove data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        key,
        'remove'
      );
    }
  }

  /**
   * すべてのデータをクリア
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      throw new StorageError(
        `Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'theme', // ダミーのキー
        'clear'
      );
    }
  }

  /**
   * データのシリアライズ
   */
  private serialize<K extends StorageKey>(key: K, value: StorageSchema[K]): unknown {
    // 日付型などをシリアライズ可能な形式に変換
    if (key === 'progress' || key === 'completedProblems' || key === 'currentProblem') {
      return this.serializeDates(value);
    }
    return value;
  }

  /**
   * データのデシリアライズ
   */
  private deserialize<K extends StorageKey>(key: K, data: unknown): StorageSchema[K] {
    // 日付型などを復元
    if (key === 'progress' || key === 'completedProblems' || key === 'currentProblem') {
      return this.deserializeDates(data) as StorageSchema[K];
    }
    return data as StorageSchema[K];
  }

  /**
   * 日付型のシリアライズ
   */
  private serializeDates(obj: unknown): unknown {
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.serializeDates(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.serializeDates(value);
      }
      return result;
    }
    return obj;
  }

  /**
   * 日付型のデシリアライズ
   */
  private deserializeDates(obj: unknown): unknown {
    if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
      return new Date(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.deserializeDates(item));
    }
    if (obj !== null && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.deserializeDates(value);
      }
      return result;
    }
    return obj;
  }
}

/**
 * デフォルトのストレージマネージャインスタンス
 */
export const storage = new StorageManager();