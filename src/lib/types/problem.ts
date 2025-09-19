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
  | 'ユーティリティ型'
  | 'basics'
  | 'interfaces'
  | 'generics'
  | 'unions'
  | 'utility-types'
  | 'advanced';

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
    'ユーティリティ型',
    'basics',
    'interfaces',
    'generics',
    'unions',
    'utility-types',
    'advanced'
  ];
  
  return categories.includes(value as ProblemCategory);
}

/**
 * 型推論要件の種別
 */
export type TypeAssertionKind = 'variable' | 'function' | 'parameter' | 'return' | 'property';

/**
 * 型比較モード
 */
export type TypeComparisonMode = 'exact' | 'structural' | 'assignable' | 'type-alias';

/**
 * 型推論要件定義（従来の文字列ベース）
 */
export interface TypeAssertion {
  readonly symbol: string;          // 検証対象のシンボル名
  readonly expectedType: string;    // 期待される型
  readonly kind: TypeAssertionKind; // シンボルの種類
  readonly description?: string;    // 説明（オプション）
  readonly comparisonMode?: TypeComparisonMode; // 型比較モード（デフォルト: structural）
  readonly allowSubtypes?: boolean; // サブタイプを許可するか（デフォルト: true）
  readonly ignoreOptional?: boolean; // オプショナルプロパティを無視するか（デフォルト: false）
}

/**
 * AST-based type assertion (new format)
 */
export interface ASTTypeAssertion {
  readonly symbol: string;
  readonly symbolKind: import('./astSchema.js').SymbolKind;
  readonly pattern: import('./astSchema.js').TypePattern;
  readonly mode: import('./astSchema.js').ComparisonMode;
  readonly description?: string;
  readonly errorMessage?: string;
  readonly allowSubtypes?: boolean;
  readonly ignoreOptional?: boolean;
  readonly checkExcessProperties?: boolean;
}

/**
 * 問題定義（簡易版）
 */
export interface Problem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly difficulty: DifficultyLevel;
  readonly category: ProblemCategory;
  readonly initialCode: string;
  readonly solution: string;
  readonly hints: ReadonlyArray<string>;
  readonly tags: ReadonlyArray<string>;
  readonly typeAssertions: ReadonlyArray<TypeAssertion | ASTTypeAssertion>; // 型推論要件 (両形式サポート)
}

/**
 * Type guard for AST type assertions
 */
export function isASTTypeAssertion(assertion: TypeAssertion | ASTTypeAssertion): assertion is ASTTypeAssertion {
  return 'pattern' in assertion && 'symbolKind' in assertion && 'mode' in assertion;
}

/**
 * 型ガード: Problemかどうかを判定
 */
export function isProblem(value: unknown): value is Problem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['title'] === 'string' &&
    typeof obj['description'] === 'string' &&
    isDifficultyLevel(obj['difficulty']) &&
    isProblemCategory(obj['category']) &&
    typeof obj['initialCode'] === 'string' &&
    typeof obj['solution'] === 'string' &&
    Array.isArray(obj['hints']) &&
    Array.isArray(obj['tags']) &&
    Array.isArray(obj['typeAssertions'])
  );
}