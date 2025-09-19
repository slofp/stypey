/**
 * AST Comparison Engine
 * 
 * This module implements the core logic for comparing TypeScript AST patterns
 * with extracted type information.
 */

import type * as ts from 'typescript';
import type {
  TypePattern,
  ComparisonMode,
  ASTAssertionResult,
  ExtractedTypeInfo,
  ValidationError,
  ValidationWarning,
  TypeDifference,
  DifferenceKind,
  ASTValidationConfig,
  SourceLocation,
  PrimitiveTypePattern,
  LiteralTypePattern,
  ArrayTypePattern,
  TupleTypePattern,
  ObjectTypePattern,
  PropertyPattern,
  UnionTypePattern,
  IntersectionTypePattern,
  FunctionTypePattern,
  GenericTypePattern,
  TypeReferencePattern,
  WildcardPattern,
  SymbolKind,
  ASTNodeInfo
} from '../types/astSchema.js';
import { DEFAULT_VALIDATION_CONFIG } from '../types/astSchema.js';
import { isPatternKind } from '../types/typePatterns.js';

// ============================================================================
// Main Comparison Engine
// ============================================================================

export class ASTComparator {
  private readonly config: ASTValidationConfig;
  private readonly typeChecker?: ts.TypeChecker;
  private readonly errors: ValidationError[] = [];
  private readonly warnings: ValidationWarning[] = [];
  private readonly depth: number = 0;
  private readonly maxDepth: number;
  private readonly startTime: number = Date.now();
  private readonly timeout: number;

  constructor(
    config: Partial<ASTValidationConfig> = {},
    typeChecker?: ts.TypeChecker
  ) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    this.typeChecker = typeChecker;
    this.maxDepth = this.config.maxDepth ?? 100;
    this.timeout = this.config.timeout ?? 5000;
  }

  /**
   * Compare an expected pattern with extracted type information
   */
  public compare(
    expectedPattern: TypePattern,
    actualType: ExtractedTypeInfo,
    mode: ComparisonMode = 'structural'
  ): ASTAssertionResult {
    this.errors.length = 0;
    this.warnings.length = 0;

    try {
      const passed = this.comparePatterns(
        expectedPattern,
        actualType.typePattern,
        mode,
        []
      );

      const diff = passed ? undefined : this.generateDiff(
        expectedPattern,
        actualType.typePattern,
        []
      );

      return {
        passed,
        symbol: actualType.astNode.text ?? '',
        actualType,
        expectedPattern,
        mode,
        errors: [...this.errors],
        warnings: [...this.warnings],
        diff
      };
    } catch (error) {
      this.addError('COMPARISON_ERROR', `Comparison failed: ${String(error)}`, []);
      return {
        passed: false,
        symbol: actualType.astNode.text ?? '',
        actualType,
        expectedPattern,
        mode,
        errors: [...this.errors],
        warnings: [...this.warnings]
      };
    }
  }

  /**
   * Compare two type patterns based on the comparison mode
   */
  private comparePatterns(
    expected: TypePattern,
    actual: TypePattern,
    mode: ComparisonMode,
    path: string[]
  ): boolean {
    // Check depth and timeout
    if (this.depth > this.maxDepth) {
      this.addError('MAX_DEPTH', `Maximum recursion depth exceeded`, path);
      return false;
    }
    if (Date.now() - this.startTime > this.timeout) {
      this.addError('TIMEOUT', `Validation timeout exceeded`, path);
      return false;
    }

    // Handle wildcards
    if (isPatternKind(expected, 'wildcard')) {
      return this.matchWildcard(expected, actual, path);
    }

    // Handle different comparison modes
    switch (mode) {
      case 'exact':
        return this.compareExact(expected, actual, path);
      case 'structural':
        return this.compareStructural(expected, actual, path);
      case 'assignable':
        return this.checkAssignable(actual, expected, path);
      case 'partial':
        return this.comparePartial(expected, actual, path);
      case 'shape':
        return this.compareShape(expected, actual, path);
      default:
        this.addError('INVALID_MODE', `Invalid comparison mode: ${mode}`, path);
        return false;
    }
  }

  /**
   * Exact comparison - types must match exactly
   */
  private compareExact(
    expected: TypePattern,
    actual: TypePattern,
    path: string[]
  ): boolean {
    if (expected.kind !== actual.kind) {
      this.addError(
        'KIND_MISMATCH',
        `Expected ${expected.kind} but got ${actual.kind}`,
        path
      );
      return false;
    }

    // Check modifiers
    if (expected.optional !== actual.optional) {
      this.addError(
        'OPTIONAL_MISMATCH',
        `Optional modifier mismatch`,
        path
      );
      return false;
    }
    if (expected.readonly !== actual.readonly) {
      this.addError(
        'READONLY_MISMATCH',
        `Readonly modifier mismatch`,
        path
      );
      return false;
    }

    // Type-specific comparisons
    switch (expected.kind) {
      case 'primitive':
        return this.comparePrimitive(
          expected,
          actual as PrimitiveTypePattern,
          path
        );
      case 'literal':
        return this.compareLiteral(
          expected,
          actual as LiteralTypePattern,
          path
        );
      case 'array':
        return this.compareArray(
          expected,
          actual as ArrayTypePattern,
          'exact',
          path
        );
      case 'tuple':
        return this.compareTuple(
          expected,
          actual as TupleTypePattern,
          'exact',
          path
        );
      case 'object':
        return this.compareObject(
          expected,
          actual as ObjectTypePattern,
          'exact',
          path
        );
      case 'union':
        return this.compareUnion(
          expected,
          actual as UnionTypePattern,
          'exact',
          path
        );
      case 'intersection':
        return this.compareIntersection(
          expected,
          actual as IntersectionTypePattern,
          'exact',
          path
        );
      case 'function':
        return this.compareFunction(
          expected,
          actual as FunctionTypePattern,
          'exact',
          path
        );
      case 'generic':
        return this.compareGeneric(
          expected,
          actual as GenericTypePattern,
          'exact',
          path
        );
      case 'typeReference':
        return this.compareTypeReference(
          expected,
          actual as TypeReferencePattern,
          path
        );
      default:
        // For complex types not yet fully implemented
        return this.compareComplex(expected, actual, 'exact', path);
    }
  }

  /**
   * Structural comparison - compare structure, not identity
   */
  private compareStructural(
    expected: TypePattern,
    actual: TypePattern,
    path: string[]
  ): boolean {
    // For structural comparison, some differences are allowed
    // e.g., Array<string> is structurally equal to string[]
    
    // Handle array notation differences
    if (expected.kind === 'array' && actual.kind === 'generic') {
      if (actual.typeName === 'Array' && actual.typeArguments?.length === 1) {
        return this.comparePatterns(
          expected.elementType,
          actual.typeArguments[0]!,
          'structural',
          [...path, 'element']
        );
      }
    }
    if (expected.kind === 'generic' && actual.kind === 'array') {
      if (expected.typeName === 'Array' && expected.typeArguments?.length === 1) {
        return this.comparePatterns(
          expected.typeArguments[0]!,
          actual.elementType,
          'structural',
          [...path, 'element']
        );
      }
    }

    // Handle union member ordering
    if (expected.kind === 'union' && actual.kind === 'union') {
      return this.compareUnionStructural(expected, actual, path);
    }

    // Handle object property ordering
    if (expected.kind === 'object' && actual.kind === 'object') {
      return this.compareObjectStructural(expected, actual, path);
    }

    // Otherwise fall back to exact comparison for the specific type
    return this.compareExact(expected, actual, path);
  }

  /**
   * Assignability check - can actual be assigned to expected?
   */
  private checkAssignable(
    actual: TypePattern,
    expected: TypePattern,
    path: string[]
  ): boolean {
    // Special case: any and unknown
    if (!this.config.allowAny && actual.kind === 'primitive' && actual.type === 'any') {
      this.addError('ANY_NOT_ALLOWED', 'Type "any" is not allowed', path);
      return false;
    }
    if (!this.config.allowUnknown && actual.kind === 'primitive' && actual.type === 'unknown') {
      this.addError('UNKNOWN_NOT_ALLOWED', 'Type "unknown" is not allowed', path);
      return false;
    }

    // any is assignable to anything (if allowed)
    if (actual.kind === 'primitive' && actual.type === 'any' && this.config.allowAny) {
      return true;
    }

    // Everything is assignable to unknown
    if (expected.kind === 'primitive' && expected.type === 'unknown') {
      return true;
    }

    // never is assignable to everything
    if (actual.kind === 'primitive' && actual.type === 'never') {
      return true;
    }

    // Nothing (except never) is assignable to never
    if (expected.kind === 'primitive' && expected.type === 'never') {
      return actual.kind === 'primitive' && actual.type === 'never';
    }

    // Literal types are assignable to their base types
    if (actual.kind === 'literal' && expected.kind === 'primitive') {
      return this.isLiteralAssignableToPrimitive(actual, expected);
    }

    // Union types: actual must be assignable to at least one member
    if (expected.kind === 'union') {
      return expected.types.some(memberType =>
        this.checkAssignable(actual, memberType, path)
      );
    }

    // Intersection types: actual must be assignable to all members
    if (expected.kind === 'intersection') {
      return expected.types.every(memberType =>
        this.checkAssignable(actual, memberType, path)
      );
    }

    // Object assignability
    if (expected.kind === 'object' && actual.kind === 'object') {
      return this.checkObjectAssignable(actual, expected, path);
    }

    // Array assignability
    if (expected.kind === 'array' && actual.kind === 'array') {
      return this.checkAssignable(
        actual.elementType,
        expected.elementType,
        [...path, 'element']
      );
    }

    // Function assignability (contravariant parameters, covariant return)
    if (expected.kind === 'function' && actual.kind === 'function') {
      return this.checkFunctionAssignable(actual, expected, path);
    }

    // Fall back to structural comparison
    return this.compareStructural(expected, actual, path);
  }

  /**
   * Partial comparison - expected is a subset of actual
   */
  private comparePartial(
    expected: TypePattern,
    actual: TypePattern,
    path: string[]
  ): boolean {
    if (expected.kind === 'object' && actual.kind === 'object') {
      // All expected properties must exist in actual
      for (const expectedProp of expected.properties) {
        const actualProp = actual.properties.find(p => p.name === expectedProp.name);
        if (!actualProp) {
          if (!expectedProp.optional) {
            this.addError(
              'MISSING_PROPERTY',
              `Property "${expectedProp.name}" is missing`,
              [...path, expectedProp.name]
            );
            return false;
          }
        } else {
          if (!this.comparePatterns(
            expectedProp.type,
            actualProp.type,
            'partial',
            [...path, expectedProp.name]
          )) {
            return false;
          }
        }
      }
      return true;
    }

    // For non-objects, fall back to structural comparison
    return this.compareStructural(expected, actual, path);
  }

  /**
   * Shape comparison - compare shape without exact type matching
   */
  private compareShape(
    expected: TypePattern,
    actual: TypePattern,
    path: string[]
  ): boolean {
    // Similar to partial but more lenient
    if (expected.kind === 'object' && actual.kind === 'object') {
      // Check if all expected properties exist with compatible shapes
      for (const expectedProp of expected.properties) {
        const actualProp = actual.properties.find(p => p.name === expectedProp.name);
        if (!actualProp && !expectedProp.optional) {
          this.addError(
            'SHAPE_MISMATCH',
            `Property "${expectedProp.name}" shape mismatch`,
            [...path, expectedProp.name]
          );
          return false;
        }
        if (actualProp) {
          // Check if shapes are compatible (e.g., both are objects, arrays, etc.)
          if (!this.areShapesCompatible(expectedProp.type, actualProp.type)) {
            this.addError(
              'SHAPE_INCOMPATIBLE',
              `Property "${expectedProp.name}" has incompatible shape`,
              [...path, expectedProp.name]
            );
            return false;
          }
        }
      }
      return true;
    }

    return this.areShapesCompatible(expected, actual);
  }

  // ============================================================================
  // Type-Specific Comparisons
  // ============================================================================

  /**
   * Compare primitive types
   */
  private comparePrimitive(
    expected: PrimitiveTypePattern,
    actual: PrimitiveTypePattern,
    path: string[]
  ): boolean {
    if (expected.type !== actual.type) {
      this.addError(
        'PRIMITIVE_MISMATCH',
        `Expected ${expected.type} but got ${actual.type}`,
        path
      );
      return false;
    }
    return true;
  }

  /**
   * Compare literal types
   */
  private compareLiteral(
    expected: LiteralTypePattern,
    actual: LiteralTypePattern,
    path: string[]
  ): boolean {
    if (expected.value !== actual.value) {
      this.addError(
        'LITERAL_MISMATCH',
        `Expected literal ${expected.value} but got ${actual.value}`,
        path
      );
      return false;
    }
    return true;
  }

  /**
   * Compare array types
   */
  private compareArray(
    expected: ArrayTypePattern,
    actual: ArrayTypePattern,
    mode: ComparisonMode,
    path: string[]
  ): boolean {
    // Check length constraints
    if (expected.exactLength !== undefined) {
      // This would require runtime information, add warning
      this.addWarning(
        'LENGTH_CHECK_STATIC',
        'Array length constraints cannot be verified statically',
        path
      );
    }

    // Compare element types
    return this.comparePatterns(
      expected.elementType,
      actual.elementType,
      mode,
      [...path, 'element']
    );
  }

  /**
   * Compare tuple types
   */
  private compareTuple(
    expected: TupleTypePattern,
    actual: TupleTypePattern,
    mode: ComparisonMode,
    path: string[]
  ): boolean {
    // Check element count
    if (expected.elements.length !== actual.elements.length) {
      this.addError(
        'TUPLE_LENGTH_MISMATCH',
        `Expected ${expected.elements.length} elements but got ${actual.elements.length}`,
        path
      );
      return false;
    }

    // Compare each element
    for (let i = 0; i < expected.elements.length; i++) {
      if (!this.comparePatterns(
        expected.elements[i]!,
        actual.elements[i]!,
        mode,
        [...path, `[${i}]`]
      )) {
        return false;
      }
    }

    // Compare rest types if present
    if (expected.restType || actual.restType) {
      if (!expected.restType || !actual.restType) {
        this.addError(
          'REST_TYPE_MISMATCH',
          'Rest type mismatch in tuple',
          path
        );
        return false;
      }
      return this.comparePatterns(
        expected.restType,
        actual.restType,
        mode,
        [...path, '...']
      );
    }

    return true;
  }

  /**
   * Compare object types (exact mode)
   */
  private compareObject(
    expected: ObjectTypePattern,
    actual: ObjectTypePattern,
    mode: ComparisonMode,
    path: string[]
  ): boolean {
    const expectedProps = new Map(expected.properties.map(p => [p.name, p]));
    const actualProps = new Map(actual.properties.map(p => [p.name, p]));

    // Check for missing properties
    for (const [name, expectedProp] of expectedProps) {
      if (!actualProps.has(name)) {
        if (!expectedProp.optional) {
          this.addError(
            'MISSING_PROPERTY',
            `Required property "${name}" is missing`,
            [...path, name]
          );
          return false;
        }
      }
    }

    // Check for extra properties
    if (this.config.checkExcessProperties && !expected.allowExtraProperties) {
      for (const name of actualProps.keys()) {
        if (!expectedProps.has(name)) {
          this.addError(
            'EXCESS_PROPERTY',
            `Unexpected property "${name}"`,
            [...path, name]
          );
          return false;
        }
      }
    }

    // Compare common properties
    for (const [name, expectedProp] of expectedProps) {
      const actualProp = actualProps.get(name);
      if (actualProp) {
        // Check modifiers
        if (this.config.checkOptionalProperties) {
          if (expectedProp.optional !== actualProp.optional) {
            this.addError(
              'OPTIONAL_MISMATCH',
              `Property "${name}" optional modifier mismatch`,
              [...path, name]
            );
            return false;
          }
        }
        if (this.config.checkReadonlyProperties) {
          if (expectedProp.readonly !== actualProp.readonly) {
            this.addError(
              'READONLY_MISMATCH',
              `Property "${name}" readonly modifier mismatch`,
              [...path, name]
            );
            return false;
          }
        }

        // Compare property types
        if (!this.comparePatterns(
          expectedProp.type,
          actualProp.type,
          mode,
          [...path, name]
        )) {
          return false;
        }
      }
    }

    // Check index signatures
    if (expected.indexSignature || actual.indexSignature) {
      if (!expected.indexSignature || !actual.indexSignature) {
        this.addError(
          'INDEX_SIGNATURE_MISMATCH',
          'Index signature mismatch',
          path
        );
        return false;
      }
      if (expected.indexSignature.keyType !== actual.indexSignature.keyType) {
        this.addError(
          'INDEX_KEY_MISMATCH',
          `Index key type mismatch`,
          path
        );
        return false;
      }
      return this.comparePatterns(
        expected.indexSignature.valueType,
        actual.indexSignature.valueType,
        mode,
        [...path, '[index]']
      );
    }

    return true;
  }

  /**
   * Compare object types (structural mode)
   */
  private compareObjectStructural(
    expected: ObjectTypePattern,
    actual: ObjectTypePattern,
    path: string[]
  ): boolean {
    // In structural mode, property order doesn't matter
    // and we're more lenient about modifiers
    
    const expectedProps = new Map(expected.properties.map(p => [p.name, p]));
    const actualProps = new Map(actual.properties.map(p => [p.name, p]));

    // Check that all required properties exist and match
    for (const [name, expectedProp] of expectedProps) {
      const actualProp = actualProps.get(name);
      if (!actualProp && !expectedProp.optional) {
        this.addError(
          'MISSING_PROPERTY',
          `Required property "${name}" is missing`,
          [...path, name]
        );
        return false;
      }
      if (actualProp) {
        if (!this.comparePatterns(
          expectedProp.type,
          actualProp.type,
          'structural',
          [...path, name]
        )) {
          return false;
        }
      }
    }

    // Don't check for excess properties in structural mode
    // unless explicitly configured
    if (this.config.checkExcessProperties && expected.allowExtraProperties === false) {
      for (const name of actualProps.keys()) {
        if (!expectedProps.has(name)) {
          this.addWarning(
            'EXCESS_PROPERTY',
            `Extra property "${name}" found`,
            [...path, name]
          );
        }
      }
    }

    return true;
  }

  /**
   * Compare union types
   */
  private compareUnion(
    expected: UnionTypePattern,
    actual: UnionTypePattern,
    mode: ComparisonMode,
    path: string[]
  ): boolean {
    // In exact mode, unions must have the same members
    if (expected.types.length !== actual.types.length) {
      this.addError(
        'UNION_LENGTH_MISMATCH',
        `Union has ${actual.types.length} members, expected ${expected.types.length}`,
        path
      );
      return false;
    }

    // Try to match each expected member with an actual member
    const unmatchedActual = [...actual.types];
    for (const expectedType of expected.types) {
      const matchIndex = unmatchedActual.findIndex(actualType =>
        this.comparePatterns(expectedType, actualType, mode, path)
      );
      if (matchIndex === -1) {
        this.addError(
          'UNION_MEMBER_MISSING',
          'Union member not found',
          path
        );
        return false;
      }
      unmatchedActual.splice(matchIndex, 1);
    }

    return unmatchedActual.length === 0;
  }

  /**
   * Compare union types (structural mode)
   */
  private compareUnionStructural(
    expected: UnionTypePattern,
    actual: UnionTypePattern,
    path: string[]
  ): boolean {
    // In structural mode, order doesn't matter
    // Each expected member must have a matching actual member
    
    const unmatchedActual = [...actual.types];
    for (const expectedType of expected.types) {
      const matchIndex = unmatchedActual.findIndex(actualType => {
        // Clear errors for this attempt
        const errorCount = this.errors.length;
        const result = this.comparePatterns(expectedType, actualType, 'structural', path);
        if (!result) {
          // Remove errors from failed attempt
          this.errors.length = errorCount;
        }
        return result;
      });
      
      if (matchIndex === -1) {
        this.addError(
          'UNION_MEMBER_MISSING',
          'Union member not found in actual type',
          path
        );
        return false;
      }
      unmatchedActual.splice(matchIndex, 1);
    }

    // Check for extra members
    if (unmatchedActual.length > 0) {
      this.addError(
        'UNION_EXTRA_MEMBERS',
        `Union has ${unmatchedActual.length} extra members`,
        path
      );
      return false;
    }

    return true;
  }

  /**
   * Compare intersection types
   */
  private compareIntersection(
    expected: IntersectionTypePattern,
    actual: IntersectionTypePattern,
    mode: ComparisonMode,
    path: string[]
  ): boolean {
    // All expected members must be present in actual
    for (const expectedType of expected.types) {
      const hasMatch = actual.types.some(actualType =>
        this.comparePatterns(expectedType, actualType, mode, path)
      );
      if (!hasMatch) {
        this.addError(
          'INTERSECTION_MEMBER_MISSING',
          'Intersection member not found',
          path
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Compare function types
   */
  private compareFunction(
    expected: FunctionTypePattern,
    actual: FunctionTypePattern,
    mode: ComparisonMode,
    path: string[]
  ): boolean {
    // Check async/generator modifiers
    if (expected.isAsync !== actual.isAsync) {
      this.addError(
        'ASYNC_MISMATCH',
        `Function async modifier mismatch`,
        path
      );
      return false;
    }
    if (expected.isGenerator !== actual.isGenerator) {
      this.addError(
        'GENERATOR_MISMATCH',
        `Function generator modifier mismatch`,
        path
      );
      return false;
    }

    // Check parameter count
    const expectedParamCount = expected.parameters.length;
    const actualParamCount = actual.parameters.length;
    
    // Account for optional parameters
    const expectedRequiredCount = expected.parameters.filter(p => !p.optional).length;
    const actualRequiredCount = actual.parameters.filter(p => !p.optional).length;
    
    if (actualRequiredCount < expectedRequiredCount) {
      this.addError(
        'PARAM_COUNT_MISMATCH',
        `Function has ${actualRequiredCount} required parameters, expected at least ${expectedRequiredCount}`,
        [...path, 'parameters']
      );
      return false;
    }

    // Compare parameters
    for (let i = 0; i < Math.min(expectedParamCount, actualParamCount); i++) {
      const expectedParam = expected.parameters[i]!;
      const actualParam = actual.parameters[i]!;
      
      if (!this.comparePatterns(
        expectedParam.type,
        actualParam.type,
        mode,
        [...path, `param${i}`]
      )) {
        return false;
      }
      
      if (expectedParam.optional !== actualParam.optional) {
        this.addWarning(
          'PARAM_OPTIONAL_MISMATCH',
          `Parameter ${i} optional modifier mismatch`,
          [...path, `param${i}`]
        );
      }
    }

    // Compare rest parameters
    if (expected.restParameter || actual.restParameter) {
      if (!expected.restParameter || !actual.restParameter) {
        this.addError(
          'REST_PARAM_MISMATCH',
          'Rest parameter mismatch',
          [...path, '...params']
        );
        return false;
      }
      if (!this.comparePatterns(
        expected.restParameter.type,
        actual.restParameter.type,
        mode,
        [...path, '...params']
      )) {
        return false;
      }
    }

    // Compare return type
    return this.comparePatterns(
      expected.returnType,
      actual.returnType,
      mode,
      [...path, 'return']
    );
  }

  /**
   * Check function assignability (contravariant parameters, covariant return)
   */
  private checkFunctionAssignable(
    actual: FunctionTypePattern,
    expected: FunctionTypePattern,
    path: string[]
  ): boolean {
    // Actual can have fewer parameters (due to JavaScript's flexibility)
    const minParams = Math.min(expected.parameters.length, actual.parameters.length);
    
    // Parameters are contravariant: expected params must be assignable to actual params
    for (let i = 0; i < minParams; i++) {
      if (!this.checkAssignable(
        expected.parameters[i]!.type,
        actual.parameters[i]!.type,
        [...path, `param${i}`]
      )) {
        return false;
      }
    }

    // Return type is covariant: actual return must be assignable to expected return
    return this.checkAssignable(
      actual.returnType,
      expected.returnType,
      [...path, 'return']
    );
  }

  /**
   * Compare generic types
   */
  private compareGeneric(
    expected: GenericTypePattern,
    actual: GenericTypePattern,
    mode: ComparisonMode,
    path: string[]
  ): boolean {
    // Check type name
    if (expected.typeName !== actual.typeName) {
      this.addError(
        'GENERIC_NAME_MISMATCH',
        `Expected generic type ${expected.typeName} but got ${actual.typeName}`,
        path
      );
      return false;
    }

    // Check type arguments
    const expectedArgs = expected.typeArguments ?? [];
    const actualArgs = actual.typeArguments ?? [];

    if (expectedArgs.length !== actualArgs.length) {
      this.addError(
        'GENERIC_ARGS_MISMATCH',
        `Generic type has ${actualArgs.length} arguments, expected ${expectedArgs.length}`,
        path
      );
      return false;
    }

    // Compare each type argument
    for (let i = 0; i < expectedArgs.length; i++) {
      if (!this.comparePatterns(
        expectedArgs[i]!,
        actualArgs[i]!,
        mode,
        [...path, `<${i}>`]
      )) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare type references
   */
  private compareTypeReference(
    expected: TypeReferencePattern,
    actual: TypeReferencePattern,
    path: string[]
  ): boolean {
    if (expected.name !== actual.name) {
      this.addError(
        'TYPE_REF_MISMATCH',
        `Expected type reference ${expected.name} but got ${actual.name}`,
        path
      );
      return false;
    }
    return true;
  }

  /**
   * Match wildcard patterns
   */
  private matchWildcard(
    wildcard: WildcardPattern,
    actual: TypePattern,
    path: string[]
  ): boolean {
    // If there's a constraint, check if actual satisfies it
    if (wildcard.constraint) {
      return this.checkAssignable(actual, wildcard.constraint, path);
    }
    // Wildcard without constraint matches anything
    return true;
  }

  /**
   * Compare complex types not yet fully implemented
   */
  private compareComplex(
    expected: TypePattern,
    actual: TypePattern,
    mode: ComparisonMode,
    path: string[]
  ): boolean {
    // For complex types not yet implemented, add a warning
    this.addWarning(
      'COMPLEX_TYPE',
      `Complex type comparison not fully implemented for ${expected.kind}`,
      path
    );
    
    // Do a basic kind check
    return expected.kind === actual.kind;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Check if a literal type is assignable to a primitive type
   */
  private isLiteralAssignableToPrimitive(
    literal: LiteralTypePattern,
    primitive: PrimitiveTypePattern
  ): boolean {
    const literalType = typeof literal.value;
    switch (primitive.type) {
      case 'string':
        return literalType === 'string';
      case 'number':
        return literalType === 'number';
      case 'boolean':
        return literalType === 'boolean';
      default:
        return false;
    }
  }

  /**
   * Check if an object is assignable to another object
   */
  private checkObjectAssignable(
    actual: ObjectTypePattern,
    expected: ObjectTypePattern,
    path: string[]
  ): boolean {
    // Actual must have all required properties of expected
    for (const expectedProp of expected.properties) {
      const actualProp = actual.properties.find(p => p.name === expectedProp.name);
      if (!actualProp) {
        if (!expectedProp.optional) {
          this.addError(
            'MISSING_REQUIRED_PROPERTY',
            `Required property "${expectedProp.name}" is missing`,
            [...path, expectedProp.name]
          );
          return false;
        }
      } else {
        // Property types must be compatible
        if (!this.checkAssignable(
          actualProp.type,
          expectedProp.type,
          [...path, expectedProp.name]
        )) {
          return false;
        }
      }
    }
    
    // If expected doesn't allow extra properties, check for them
    if (!expected.allowExtraProperties && this.config.checkExcessProperties) {
      for (const actualProp of actual.properties) {
        if (!expected.properties.find(p => p.name === actualProp.name)) {
          this.addError(
            'EXCESS_PROPERTY_NOT_ALLOWED',
            `Property "${actualProp.name}" is not allowed`,
            [...path, actualProp.name]
          );
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Check if two patterns have compatible shapes
   */
  private areShapesCompatible(expected: TypePattern, actual: TypePattern): boolean {
    // Primitives are compatible with themselves
    if (expected.kind === 'primitive' && actual.kind === 'primitive') {
      return true; // Shape check doesn't care about specific primitive type
    }
    
    // Arrays are compatible with arrays
    if (expected.kind === 'array' && actual.kind === 'array') {
      return true;
    }
    
    // Objects are compatible with objects
    if (expected.kind === 'object' && actual.kind === 'object') {
      return true;
    }
    
    // Functions are compatible with functions
    if (expected.kind === 'function' && actual.kind === 'function') {
      return true;
    }
    
    // Otherwise, kinds must match
    return expected.kind === actual.kind;
  }

  /**
   * Generate a diff between two type patterns
   */
  private generateDiff(
    expected: TypePattern,
    actual: TypePattern,
    path: string[]
  ): TypeDifference {
    if (expected.kind !== actual.kind) {
      return {
        kind: 'mismatch',
        path,
        expected,
        actual
      };
    }

    const children: TypeDifference[] = [];

    if (expected.kind === 'object' && actual.kind === 'object') {
      const expectedProps = new Map(expected.properties.map(p => [p.name, p]));
      const actualProps = new Map(actual.properties.map(p => [p.name, p]));

      // Find missing properties
      for (const [name, prop] of expectedProps) {
        if (!actualProps.has(name)) {
          children.push({
            kind: 'missing',
            path: [...path, name],
            expected: prop.type,
            actual: undefined
          });
        }
      }

      // Find extra properties
      for (const [name, prop] of actualProps) {
        if (!expectedProps.has(name)) {
          children.push({
            kind: 'extra',
            path: [...path, name],
            expected: undefined,
            actual: prop.type
          });
        }
      }

      // Find mismatched properties
      for (const [name, expectedProp] of expectedProps) {
        const actualProp = actualProps.get(name);
        if (actualProp) {
          const propDiff = this.generateDiff(
            expectedProp.type,
            actualProp.type,
            [...path, name]
          );
          if (propDiff.kind !== 'mismatch' || propDiff.children?.length) {
            children.push(propDiff);
          }
        }
      }
    }

    return {
      kind: 'mismatch',
      path,
      expected,
      actual,
      children: children.length > 0 ? children : undefined
    };
  }

  /**
   * Add an error to the error list
   */
  private addError(code: string, message: string, path: string[]): void {
    this.errors.push({
      code,
      message,
      path: path.length > 0 ? path : undefined
    });
  }

  /**
   * Add a warning to the warning list
   */
  private addWarning(code: string, message: string, path: string[], suggestion?: string): void {
    this.warnings.push({
      code,
      message,
      suggestion
    });
  }
}

// ============================================================================
// Export utilities
// ============================================================================

/**
 * Create a new AST comparator instance
 */
export function createComparator(
  config?: Partial<ASTValidationConfig>,
  typeChecker?: ts.TypeChecker
): ASTComparator {
  return new ASTComparator(config, typeChecker);
}

/**
 * Quick comparison function
 */
export function compareTypes(
  expected: TypePattern,
  actual: ExtractedTypeInfo,
  mode: ComparisonMode = 'structural',
  config?: Partial<ASTValidationConfig>
): ASTAssertionResult {
  const comparator = new ASTComparator(config);
  return comparator.compare(expected, actual, mode);
}