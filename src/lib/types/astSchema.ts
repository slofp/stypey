/**
 * AST-based Type Assertion Schema Definitions
 * 
 * This module defines the structure for representing TypeScript type patterns
 * using AST-based comparisons instead of string-based comparisons.
 */

// ============================================================================
// Core AST Node Types
// ============================================================================

/**
 * Base interface for all AST type patterns
 */
export interface ASTTypePattern {
  readonly kind: string;
  readonly optional?: boolean;
  readonly nullable?: boolean;
  readonly readonly?: boolean;
}

/**
 * Primitive type patterns
 */
export interface PrimitiveTypePattern extends ASTTypePattern {
  readonly kind: 'primitive';
  readonly type: 'string' | 'number' | 'boolean' | 'symbol' | 'undefined' | 'null' | 'void' | 'never' | 'any' | 'unknown' | 'bigint';
}

/**
 * Literal type patterns
 */
export interface LiteralTypePattern extends ASTTypePattern {
  readonly kind: 'literal';
  readonly value: string | number | boolean;
}

/**
 * Array type patterns
 */
export interface ArrayTypePattern extends ASTTypePattern {
  readonly kind: 'array';
  readonly elementType: TypePattern;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly exactLength?: number;
}

/**
 * Tuple type patterns
 */
export interface TupleTypePattern extends ASTTypePattern {
  readonly kind: 'tuple';
  readonly elements: readonly TypePattern[];
  readonly restType?: TypePattern;
}

/**
 * Object type patterns
 */
export interface ObjectTypePattern extends ASTTypePattern {
  readonly kind: 'object';
  readonly properties: readonly PropertyPattern[];
  readonly indexSignature?: IndexSignaturePattern;
  readonly allowExtraProperties?: boolean;
}

/**
 * Property pattern for object types
 */
export interface PropertyPattern {
  readonly name: string;
  readonly type: TypePattern;
  readonly optional?: boolean;
  readonly readonly?: boolean;
  readonly description?: string;
}

/**
 * Index signature pattern
 */
export interface IndexSignaturePattern {
  readonly keyType: 'string' | 'number' | 'symbol';
  readonly valueType: TypePattern;
  readonly readonly?: boolean;
}

/**
 * Union type patterns
 */
export interface UnionTypePattern extends ASTTypePattern {
  readonly kind: 'union';
  readonly types: readonly TypePattern[];
  readonly discriminator?: string; // Property name for discriminated unions
}

/**
 * Intersection type patterns
 */
export interface IntersectionTypePattern extends ASTTypePattern {
  readonly kind: 'intersection';
  readonly types: readonly TypePattern[];
}

/**
 * Function type patterns
 */
export interface FunctionTypePattern extends ASTTypePattern {
  readonly kind: 'function';
  readonly typeParameters?: readonly TypeParameterPattern[];
  readonly parameters: readonly ParameterPattern[];
  readonly returnType: TypePattern;
  readonly restParameter?: ParameterPattern;
  readonly isAsync?: boolean;
  readonly isGenerator?: boolean;
}

/**
 * Parameter pattern for functions
 */
export interface ParameterPattern {
  readonly name?: string;
  readonly type: TypePattern;
  readonly optional?: boolean;
  readonly defaultValue?: string; // String representation of default value
}

/**
 * Type parameter (generic) pattern
 */
export interface TypeParameterPattern {
  readonly name: string;
  readonly constraint?: TypePattern;
  readonly default?: TypePattern;
}

/**
 * Generic type reference pattern
 */
export interface GenericTypePattern extends ASTTypePattern {
  readonly kind: 'generic';
  readonly typeName: string;
  readonly typeArguments?: readonly TypePattern[];
}

/**
 * Type reference pattern (references to type parameters)
 */
export interface TypeReferencePattern extends ASTTypePattern {
  readonly kind: 'typeReference';
  readonly name: string;
}

/**
 * Conditional type pattern
 */
export interface ConditionalTypePattern extends ASTTypePattern {
  readonly kind: 'conditional';
  readonly checkType: TypePattern;
  readonly extendsType: TypePattern;
  readonly trueType: TypePattern;
  readonly falseType: TypePattern;
}

/**
 * Mapped type pattern
 */
export interface MappedTypePattern extends ASTTypePattern {
  readonly kind: 'mapped';
  readonly keyType: TypePattern;
  readonly valueType: TypePattern;
  readonly optionalModifier?: '+' | '-' | undefined;
  readonly readonlyModifier?: '+' | '-' | undefined;
}

/**
 * Template literal type pattern
 */
export interface TemplateLiteralTypePattern extends ASTTypePattern {
  readonly kind: 'templateLiteral';
  readonly parts: readonly (string | TypePattern)[];
}

/**
 * Interface declaration pattern
 */
export interface InterfacePattern extends ASTTypePattern {
  readonly kind: 'interface';
  readonly name: string;
  readonly typeParameters?: readonly TypeParameterPattern[];
  readonly extends?: readonly TypePattern[];
  readonly properties: readonly PropertyPattern[];
  readonly methods?: readonly MethodPattern[];
  readonly indexSignature?: IndexSignaturePattern;
}

/**
 * Method pattern for interfaces and classes
 */
export interface MethodPattern {
  readonly name: string;
  readonly signature: FunctionTypePattern;
  readonly optional?: boolean;
}

/**
 * Class declaration pattern
 */
export interface ClassPattern extends ASTTypePattern {
  readonly kind: 'class';
  readonly name: string;
  readonly typeParameters?: readonly TypeParameterPattern[];
  readonly extends?: TypePattern;
  readonly implements?: readonly TypePattern[];
  readonly constructorPattern?: FunctionTypePattern;
  readonly properties?: readonly PropertyPattern[];
  readonly methods?: readonly MethodPattern[];
  readonly abstract?: boolean;
}

/**
 * Enum pattern
 */
export interface EnumPattern extends ASTTypePattern {
  readonly kind: 'enum';
  readonly name: string;
  readonly members: readonly EnumMemberPattern[];
  readonly const?: boolean;
}

/**
 * Enum member pattern
 */
export interface EnumMemberPattern {
  readonly name: string;
  readonly value?: string | number;
}

/**
 * Type alias pattern
 */
export interface TypeAliasPattern extends ASTTypePattern {
  readonly kind: 'typeAlias';
  readonly name: string;
  readonly typeParameters?: readonly TypeParameterPattern[];
  readonly type: TypePattern;
}

/**
 * Namespace/Module pattern
 */
export interface NamespacePattern extends ASTTypePattern {
  readonly kind: 'namespace';
  readonly name: string;
  readonly exports: readonly ExportPattern[];
}

/**
 * Export pattern for namespaces
 */
export interface ExportPattern {
  readonly name: string;
  readonly type: TypePattern;
  readonly isType?: boolean;
}

/**
 * Wildcard pattern for partial matching
 */
export interface WildcardPattern extends ASTTypePattern {
  readonly kind: 'wildcard';
  readonly constraint?: TypePattern;
  readonly description?: string;
}

/**
 * Union of all type patterns
 */
export type TypePattern =
  | PrimitiveTypePattern
  | LiteralTypePattern
  | ArrayTypePattern
  | TupleTypePattern
  | ObjectTypePattern
  | UnionTypePattern
  | IntersectionTypePattern
  | FunctionTypePattern
  | GenericTypePattern
  | TypeReferencePattern
  | ConditionalTypePattern
  | MappedTypePattern
  | TemplateLiteralTypePattern
  | InterfacePattern
  | ClassPattern
  | EnumPattern
  | TypeAliasPattern
  | NamespacePattern
  | WildcardPattern;

// ============================================================================
// AST-Based Type Assertion
// ============================================================================

/**
 * Comparison modes for type matching
 */
export type ComparisonMode = 
  | 'exact'       // Exact structural match
  | 'structural'  // Structural typing (duck typing)
  | 'assignable'  // Type assignability check
  | 'partial'     // Partial match (subset of properties)
  | 'shape';      // Shape matching (ignores extra properties)

/**
 * AST-based type assertion
 */
export interface ASTTypeAssertion {
  readonly symbol: string;
  readonly symbolKind: SymbolKind;
  readonly pattern: TypePattern;
  readonly mode: ComparisonMode;
  readonly description?: string;
  readonly errorMessage?: string;
  readonly allowSubtypes?: boolean;
  readonly ignoreOptional?: boolean;
  readonly checkExcessProperties?: boolean;
  readonly metadata?: AssertionMetadata;
}

/**
 * Symbol kinds that can be asserted
 */
export type SymbolKind = 
  | 'variable'
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'namespace'
  | 'parameter'
  | 'property'
  | 'method'
  | 'getter'
  | 'setter'
  | 'export'
  | 'import';

/**
 * Additional metadata for assertions
 */
export interface AssertionMetadata {
  readonly scope?: ScopePattern;
  readonly modifiers?: readonly ModifierPattern[];
  readonly decorators?: readonly DecoratorPattern[];
  readonly jsDoc?: JSDocPattern;
}

/**
 * Scope pattern for symbol location
 */
export interface ScopePattern {
  readonly type: 'global' | 'module' | 'function' | 'block' | 'class' | 'interface';
  readonly name?: string;
  readonly nested?: ScopePattern;
}

/**
 * Modifier pattern
 */
export type ModifierPattern = 
  | 'public'
  | 'private'
  | 'protected'
  | 'static'
  | 'readonly'
  | 'abstract'
  | 'async'
  | 'const'
  | 'export'
  | 'default';

/**
 * Decorator pattern
 */
export interface DecoratorPattern {
  readonly name: string;
  readonly arguments?: readonly string[];
}

/**
 * JSDoc pattern
 */
export interface JSDocPattern {
  readonly description?: string;
  readonly params?: readonly JSDocParamPattern[];
  readonly returns?: string;
  readonly deprecated?: boolean;
  readonly tags?: readonly JSDocTagPattern[];
}

/**
 * JSDoc parameter pattern
 */
export interface JSDocParamPattern {
  readonly name: string;
  readonly type?: string;
  readonly description?: string;
}

/**
 * JSDoc tag pattern
 */
export interface JSDocTagPattern {
  readonly name: string;
  readonly value?: string;
}

// ============================================================================
// Validation Result Types
// ============================================================================

/**
 * Result of AST-based type assertion
 */
export interface ASTAssertionResult {
  readonly passed: boolean;
  readonly symbol: string;
  readonly actualType?: ExtractedTypeInfo;
  readonly expectedPattern: TypePattern;
  readonly mode: ComparisonMode;
  readonly errors: readonly ValidationError[];
  readonly warnings?: readonly ValidationWarning[];
  readonly diff?: TypeDifference;
}

/**
 * Extracted type information from AST
 */
export interface ExtractedTypeInfo {
  readonly astNode: ASTNodeInfo;
  readonly typePattern: TypePattern;
  readonly symbolKind: SymbolKind;
  readonly modifiers?: readonly ModifierPattern[];
  readonly location: SourceLocation;
  readonly rawTypeString?: string; // For debugging
}

/**
 * AST node information
 */
export interface ASTNodeInfo {
  readonly kind: string; // ts.SyntaxKind as string
  readonly text?: string;
  readonly children?: readonly ASTNodeInfo[];
}

/**
 * Source location information
 */
export interface SourceLocation {
  readonly file?: string;
  readonly line: number;
  readonly column: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

/**
 * Validation error details
 */
export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly path?: string[]; // Path to the error in nested structures
  readonly expected?: string;
  readonly actual?: string;
  readonly location?: SourceLocation;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  readonly code: string;
  readonly message: string;
  readonly suggestion?: string;
  readonly location?: SourceLocation;
}

/**
 * Type difference for detailed comparison
 */
export interface TypeDifference {
  readonly kind: DifferenceKind;
  readonly path: string[];
  readonly expected: TypePattern | undefined;
  readonly actual: TypePattern | undefined;
  readonly children?: readonly TypeDifference[];
}

/**
 * Kinds of differences between types
 */
export type DifferenceKind = 
  | 'missing'
  | 'extra'
  | 'mismatch'
  | 'incompatible'
  | 'subtype'
  | 'supertype';

// ============================================================================
// Helper Functions for Type Guards
// ============================================================================

export function isPrimitivePattern(pattern: TypePattern): pattern is PrimitiveTypePattern {
  return pattern.kind === 'primitive';
}

export function isObjectPattern(pattern: TypePattern): pattern is ObjectTypePattern {
  return pattern.kind === 'object';
}

export function isFunctionPattern(pattern: TypePattern): pattern is FunctionTypePattern {
  return pattern.kind === 'function';
}

export function isUnionPattern(pattern: TypePattern): pattern is UnionTypePattern {
  return pattern.kind === 'union';
}

export function isGenericPattern(pattern: TypePattern): pattern is GenericTypePattern {
  return pattern.kind === 'generic';
}

export function isWildcardPattern(pattern: TypePattern): pattern is WildcardPattern {
  return pattern.kind === 'wildcard';
}

// ============================================================================
// Validation Configuration
// ============================================================================

/**
 * Configuration for AST validation
 */
export interface ASTValidationConfig {
  readonly strictMode?: boolean;
  readonly allowAny?: boolean;
  readonly allowUnknown?: boolean;
  readonly checkExcessProperties?: boolean;
  readonly checkOptionalProperties?: boolean;
  readonly checkReadonlyProperties?: boolean;
  readonly ignoreJSDoc?: boolean;
  readonly ignoreDecorators?: boolean;
  readonly maxDepth?: number; // Maximum recursion depth
  readonly timeout?: number; // Validation timeout in ms
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ASTValidationConfig = {
  strictMode: true,
  allowAny: false,
  allowUnknown: false,
  checkExcessProperties: true,
  checkOptionalProperties: true,
  checkReadonlyProperties: true,
  ignoreJSDoc: false,
  ignoreDecorators: false,
  maxDepth: 100,
  timeout: 5000
} as const;