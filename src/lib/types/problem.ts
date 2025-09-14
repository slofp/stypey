/**
 * 問題の難易度レベル
 */
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

/**
 * 問題カテゴリ
 */
export type ProblemCategory = 
  | '基礎型'
  | 'オブジェクト型'
  | '配列型'
  | 'Union型'
  | 'Intersection型'
  | 'ジェネリクス'
  | '条件型'
  | 'Mapped Types'
  | 'Template Literal Types'
  | 'ユーティリティ型';

/**
 * 問題定義のインターフェース
 */
export interface ProblemDefinition {
  readonly id: string;
  readonly title: string;
  readonly difficulty: DifficultyLevel;
  readonly category: ProblemCategory;
  readonly description: string;
  readonly initialCode: string;
  readonly testCode: string;
  readonly expectedType: string;
  readonly hints?: ReadonlyArray<string>;
  readonly explanation?: string;
  readonly tags?: ReadonlyArray<string>;
}

/**
 * 型チェックのエラー情報
 */
export interface TypeCheckError {
  readonly message: string;
  readonly line: number;
  readonly column: number;
  readonly code: number;
  readonly severity: 'error' | 'warning' | 'info';
}

/**
 * 型チェック結果
 */
export interface TypeCheckResult {
  readonly success: boolean;
  readonly actualType: string;
  readonly expectedType: string;
  readonly errors: ReadonlyArray<TypeCheckError>;
  readonly diagnostics?: ReadonlyArray<string>;
}

/**
 * 問題の実行結果
 */
export interface TestResult {
  readonly problemId: string;
  readonly passed: boolean;
  readonly typeCheckResult: TypeCheckResult;
  readonly executionTime: number;
  readonly timestamp: Date;
}

/**
 * 問題リストのフィルタオプション
 */
export interface ProblemFilterOptions {
  readonly difficulty?: DifficultyLevel | ReadonlyArray<DifficultyLevel>;
  readonly category?: ProblemCategory | ReadonlyArray<ProblemCategory>;
  readonly tags?: ReadonlyArray<string>;
  readonly completed?: boolean;
  readonly searchTerm?: string;
}

/**
 * 問題の統計情報
 */
export interface ProblemStatistics {
  readonly problemId: string;
  readonly attempts: number;
  readonly successRate: number;
  readonly averageTime: number;
  readonly lastAttempt?: Date;
}

/**
 * 型ガード: ProblemDefinitionかどうかを判定
 */
export function isProblemDefinition(value: unknown): value is ProblemDefinition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['title'] === 'string' &&
    isDifficultyLevel(obj['difficulty']) &&
    isProblemCategory(obj['category']) &&
    typeof obj['description'] === 'string' &&
    typeof obj['initialCode'] === 'string' &&
    typeof obj['testCode'] === 'string' &&
    typeof obj['expectedType'] === 'string'
  );
}

/**
 * 型ガード: DifficultyLevelかどうかを判定
 */
export function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return value === 'easy' || value === 'medium' || value === 'hard';
}

/**
 * 型ガード: ProblemCategoryかどうかを判定
 */
export function isProblemCategory(value: unknown): value is ProblemCategory {
  const categories: ReadonlyArray<ProblemCategory> = [
    '基礎型',
    'オブジェクト型',
    '配列型',
    'Union型',
    'Intersection型',
    'ジェネリクス',
    '条件型',
    'Mapped Types',
    'Template Literal Types',
    'ユーティリティ型'
  ];
  
  return categories.includes(value as ProblemCategory);
}