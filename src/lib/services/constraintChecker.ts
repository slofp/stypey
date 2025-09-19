/**
 * Constraint Checker Service
 * 
 * This module provides constraint validation for TypeScript types
 */

import type {
  TypePattern,
  TypeConstraints,
  ConstraintViolation,
  ConstraintValidationResult,
  EnhancedExtractedTypeInfo,
  PrimitiveTypePattern,
  LiteralTypePattern,
  ObjectTypePattern,
  FunctionTypePattern,
  GenericTypePattern,
  StyleConstraint,
  StructuralConstraint,
  TypeCreationConstraint,
  ValueConstraint,
  TypeFilter,
  LintConstraint
} from '../types/astSchema.js';

/**
 * Service for checking type constraints
 */
export class ConstraintChecker {
  private violations: ConstraintViolation[] = [];
  private warnings: string[] = [];
  private infos: string[] = [];
  private startTime: number = Date.now();
  private constraintsChecked: number = 0;

  /**
   * Check all constraints for a type
   */
  public checkConstraints(
    typeInfo: EnhancedExtractedTypeInfo,
    constraints: TypeConstraints | undefined
  ): ConstraintValidationResult {
    // Reset state
    this.violations = [];
    this.warnings = [];
    this.infos = [];
    this.startTime = Date.now();
    this.constraintsChecked = 0;

    if (!constraints || !constraints.enabled) {
      return {
        passed: true,
        violations: [],
        warnings: [],
        infos: []
      };
    }

    // Check each constraint type
    if (constraints.creation) {
      this.checkCreationConstraints(typeInfo, constraints.creation);
      if (constraints.stopOnFirstViolation && this.violations.length > 0) {
        return this.buildResult();
      }
    }

    if (constraints.value) {
      this.checkValueConstraints(typeInfo.typePattern, constraints.value);
      if (constraints.stopOnFirstViolation && this.violations.length > 0) {
        return this.buildResult();
      }
    }

    if (constraints.structural) {
      this.checkStructuralConstraints(typeInfo.typePattern, constraints.structural);
      if (constraints.stopOnFirstViolation && this.violations.length > 0) {
        return this.buildResult();
      }
    }

    if (constraints.style) {
      this.checkStyleConstraints(typeInfo, constraints.style);
      if (constraints.stopOnFirstViolation && this.violations.length > 0) {
        return this.buildResult();
      }
    }

    if (constraints.filter) {
      this.checkTypeFilters(typeInfo.typePattern, constraints.filter);
      if (constraints.stopOnFirstViolation && this.violations.length > 0) {
        return this.buildResult();
      }
    }

    if (constraints.lint) {
      this.checkLintConstraints(typeInfo, constraints.lint);
    }

    return this.buildResult();
  }

  /**
   * Check type creation constraints
   */
  private checkCreationConstraints(
    typeInfo: EnhancedExtractedTypeInfo,
    constraint: TypeCreationConstraint
  ): void {
    this.constraintsChecked++;

    // Check if explicit type is required
    if (constraint.requireExplicitType && !typeInfo.hasTypeAnnotation) {
      this.addViolation('creation', 'EXPLICIT_TYPE_REQUIRED', 
        'Explicit type annotation is required',
        'error',
        'Add type annotation to the declaration'
      );
    }

    // Check if type annotation is allowed
    if (constraint.allowTypeAnnotation === false && typeInfo.hasTypeAnnotation) {
      this.addViolation('creation', 'TYPE_ANNOTATION_FORBIDDEN',
        'Type annotation is not allowed',
        'error',
        'Remove the type annotation and use inference'
      );
    }

    // Check if type assertion is allowed
    if (constraint.allowAssertion === false && typeInfo.hasAssertion) {
      this.addViolation('creation', 'TYPE_ASSERTION_FORBIDDEN',
        'Type assertion (as) is not allowed',
        'error',
        'Use proper type guards or type annotation instead'
      );
    }

    // Check if type inference is allowed
    if (constraint.allowInference === false && typeInfo.typeSource === 'inference') {
      this.addViolation('creation', 'TYPE_INFERENCE_FORBIDDEN',
        'Type inference is not allowed',
        'error',
        'Add explicit type annotation'
      );
    }

    // Check for unsafe casts
    if (constraint.forbidUnsafeCast && typeInfo.isUnsafeCast) {
      this.addViolation('creation', 'UNSAFE_CAST',
        'Unsafe type cast detected',
        'error',
        'Avoid casting from undefined/null. Use proper type guards'
      );
    }

    // Check assertion chain length
    if (constraint.maxAssertionChain && typeInfo.assertionChain) {
      if (typeInfo.assertionChain.length > constraint.maxAssertionChain) {
        this.addViolation('creation', 'ASSERTION_CHAIN_TOO_LONG',
          `Assertion chain is too long (${typeInfo.assertionChain.length} > ${constraint.maxAssertionChain})`,
          'error',
          'Simplify the type assertion or use intermediate variables'
        );
      }
    }
  }

  /**
   * Check value constraints
   */
  private checkValueConstraints(
    pattern: TypePattern,
    constraint: ValueConstraint,
    path: string[] = []
  ): void {
    this.constraintsChecked++;

    if (pattern.kind === 'literal') {
      const literalPattern = pattern as LiteralTypePattern;
      const value = literalPattern.value;

      // Check allowed values
      if (constraint.allowedValues && !constraint.allowedValues.includes(value)) {
        this.addViolation('value', 'VALUE_NOT_ALLOWED',
          `Value "${value}" is not in the allowed list`,
          'error',
          `Use one of: ${constraint.allowedValues.join(', ')}`,
          path
        );
      }

      // Check forbidden values
      if (constraint.forbiddenValues && constraint.forbiddenValues.includes(value)) {
        this.addViolation('value', 'VALUE_FORBIDDEN',
          `Value "${value}" is forbidden`,
          'error',
          'Use a different value',
          path
        );
      }

      // Check numeric range
      if (typeof value === 'number' && constraint.numericRange) {
        const range = constraint.numericRange;
        if (range.min !== undefined) {
          const minOk = range.excludeMin ? value > range.min : value >= range.min;
          if (!minOk) {
            this.addViolation('value', 'VALUE_TOO_SMALL',
              `Value ${value} is below minimum ${range.min}`,
              'error',
              undefined,
              path
            );
          }
        }
        if (range.max !== undefined) {
          const maxOk = range.excludeMax ? value < range.max : value <= range.max;
          if (!maxOk) {
            this.addViolation('value', 'VALUE_TOO_LARGE',
              `Value ${value} is above maximum ${range.max}`,
              'error',
              undefined,
              path
            );
          }
        }
      }

      // Check string constraints
      if (typeof value === 'string') {
        if (constraint.stringPattern) {
          const regex = new RegExp(constraint.stringPattern);
          if (!regex.test(value)) {
            this.addViolation('value', 'STRING_PATTERN_MISMATCH',
              `String "${value}" does not match pattern ${constraint.stringPattern}`,
              'error',
              undefined,
              path
            );
          }
        }

        if (constraint.stringLength) {
          const len = value.length;
          if (constraint.stringLength.min !== undefined && len < constraint.stringLength.min) {
            this.addViolation('value', 'STRING_TOO_SHORT',
              `String length ${len} is below minimum ${constraint.stringLength.min}`,
              'error',
              undefined,
              path
            );
          }
          if (constraint.stringLength.max !== undefined && len > constraint.stringLength.max) {
            this.addViolation('value', 'STRING_TOO_LONG',
              `String length ${len} exceeds maximum ${constraint.stringLength.max}`,
              'error',
              undefined,
              path
            );
          }
        }
      }
    }

    // Recursively check nested patterns
    this.traversePattern(pattern, (subPattern, subPath) => {
      if (subPattern.kind === 'literal') {
        this.checkValueConstraints(subPattern, constraint, subPath);
      }
    });
  }

  /**
   * Check structural constraints
   */
  private checkStructuralConstraints(
    pattern: TypePattern,
    constraint: StructuralConstraint
  ): void {
    this.constraintsChecked++;

    if (pattern.kind === 'object' || pattern.kind === 'interface' || pattern.kind === 'class') {
      const objPattern = pattern as ObjectTypePattern;
      const properties = objPattern.properties || [];
      const propNames = properties.map(p => p.name);

      // Check required properties
      if (constraint.requiredProperties) {
        for (const required of constraint.requiredProperties) {
          if (!propNames.includes(required)) {
            this.addViolation('structural', 'MISSING_REQUIRED_PROPERTY',
              `Required property "${required}" is missing`,
              'error',
              `Add property "${required}" to the type`
            );
          }
        }
      }

      // Check forbidden properties
      if (constraint.forbiddenProperties) {
        for (const forbidden of constraint.forbiddenProperties) {
          if (propNames.includes(forbidden)) {
            this.addViolation('structural', 'FORBIDDEN_PROPERTY',
              `Property "${forbidden}" is not allowed`,
              'error',
              `Remove property "${forbidden}" from the type`
            );
          }
        }
      }

      // Check property naming pattern
      if (constraint.propertyNamingPattern) {
        const regex = new RegExp(constraint.propertyNamingPattern);
        for (const prop of properties) {
          if (!regex.test(prop.name)) {
            this.addViolation('structural', 'PROPERTY_NAMING_VIOLATION',
              `Property name "${prop.name}" violates naming pattern`,
              'warning',
              `Property names should match pattern: ${constraint.propertyNamingPattern}`
            );
          }
        }
      }

      // Check property count
      if (constraint.minProperties && properties.length < constraint.minProperties) {
        this.addViolation('structural', 'TOO_FEW_PROPERTIES',
          `Type has ${properties.length} properties, minimum is ${constraint.minProperties}`,
          'error'
        );
      }

      if (constraint.maxProperties && properties.length > constraint.maxProperties) {
        this.addViolation('structural', 'TOO_MANY_PROPERTIES',
          `Type has ${properties.length} properties, maximum is ${constraint.maxProperties}`,
          'error'
        );
      }
    }
  }

  /**
   * Check style constraints
   */
  private checkStyleConstraints(
    typeInfo: EnhancedExtractedTypeInfo,
    constraint: StyleConstraint
  ): void {
    this.constraintsChecked++;

    const pattern = typeInfo.typePattern;

    // Check for forbidden types
    if (constraint.forbidAny && this.containsType(pattern, 'any')) {
      this.addViolation('style', 'ANY_TYPE_FORBIDDEN',
        'The "any" type is not allowed',
        'error',
        'Use a more specific type or "unknown"'
      );
    }

    if (constraint.forbidUnknown && this.containsType(pattern, 'unknown')) {
      this.addViolation('style', 'UNKNOWN_TYPE_FORBIDDEN',
        'The "unknown" type is not allowed',
        'error',
        'Use a more specific type'
      );
    }

    if (constraint.forbidNever && this.containsType(pattern, 'never')) {
      this.addViolation('style', 'NEVER_TYPE_FORBIDDEN',
        'The "never" type is not allowed',
        'error'
      );
    }

    // Check type assertion usage
    if (constraint.forbidTypeAssertion && typeInfo.hasAssertion) {
      this.addViolation('style', 'TYPE_ASSERTION_FORBIDDEN',
        'Type assertions are not allowed',
        'error',
        'Use type guards or proper typing instead'
      );
    }

    // Check naming conventions
    if (constraint.namingConvention) {
      const symbolName = typeInfo.astNode.text || '';
      if (symbolName && !this.matchesNamingConvention(symbolName, constraint.namingConvention)) {
        this.addViolation('style', 'NAMING_CONVENTION_VIOLATION',
          `Name "${symbolName}" does not follow ${constraint.namingConvention} convention`,
          'warning'
        );
      }
    }

    // Check generic constraints
    if (constraint.requireGenericConstraints && pattern.kind === 'generic') {
      const genericPattern = pattern as GenericTypePattern;
      // This would need more implementation to check if type parameters have constraints
      this.warnings.push('Generic constraint checking not fully implemented');
    }
  }

  /**
   * Check type filters
   */
  private checkTypeFilters(
    pattern: TypePattern,
    filter: TypeFilter
  ): void {
    this.constraintsChecked++;

    // Check exclude types
    if (filter.excludeTypes) {
      for (const excludedPattern of filter.excludeTypes) {
        if (this.patternsMatch(pattern, excludedPattern)) {
          this.addViolation('filter', 'TYPE_EXCLUDED',
            `Type matches excluded pattern`,
            'error',
            'Use a different type'
          );
        }
      }
    }

    // Check include types
    if (filter.includeTypes && filter.includeTypes.length > 0) {
      let matched = false;
      for (const includedPattern of filter.includeTypes) {
        if (this.patternsMatch(pattern, includedPattern)) {
          matched = true;
          break;
        }
      }
      if (!matched) {
        this.addViolation('filter', 'TYPE_NOT_INCLUDED',
          `Type does not match any included patterns`,
          'error',
          'Use one of the allowed types'
        );
      }
    }
  }

  /**
   * Check lint constraints
   */
  private checkLintConstraints(
    typeInfo: EnhancedExtractedTypeInfo,
    constraint: LintConstraint
  ): void {
    this.constraintsChecked++;

    const level = constraint.level || 'warning';

    if (constraint.warnIf) {
      const conditions = constraint.warnIf;

      if (conditions.hasAssertion && typeInfo.hasAssertion) {
        this.addViolation('lint', 'HAS_ASSERTION',
          constraint.message || 'Type assertion detected',
          level,
          constraint.suggestion
        );
      }

      if (conditions.hasMultipleCasts && typeInfo.assertionChain && typeInfo.assertionChain.length > 1) {
        this.addViolation('lint', 'MULTIPLE_CASTS',
          constraint.message || 'Multiple type casts detected',
          level,
          constraint.suggestion || 'Simplify the type casting'
        );
      }

      if (conditions.lacksDocumentation && !typeInfo.hasDocumentation) {
        this.addViolation('lint', 'NO_DOCUMENTATION',
          constraint.message || 'Missing documentation',
          level,
          constraint.suggestion || 'Add JSDoc comments'
        );
      }

      if (conditions.exceedsComplexity && typeInfo.typeComplexity) {
        if (typeInfo.typeComplexity > conditions.exceedsComplexity) {
          this.addViolation('lint', 'COMPLEX_TYPE',
            constraint.message || `Type complexity (${typeInfo.typeComplexity}) exceeds limit`,
            level,
            constraint.suggestion || 'Simplify the type definition'
          );
        }
      }

      if (conditions.hasAny && this.containsType(typeInfo.typePattern, 'any')) {
        this.addViolation('lint', 'HAS_ANY',
          constraint.message || 'Type contains "any"',
          level,
          constraint.suggestion || 'Use more specific types'
        );
      }

      if (conditions.hasUnknown && this.containsType(typeInfo.typePattern, 'unknown')) {
        this.addViolation('lint', 'HAS_UNKNOWN',
          constraint.message || 'Type contains "unknown"',
          level,
          constraint.suggestion || 'Use more specific types'
        );
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Add a constraint violation
   */
  private addViolation(
    type: ConstraintViolation['type'],
    code: string,
    message: string,
    severity: ConstraintViolation['severity'],
    suggestion?: string,
    path?: readonly string[]
  ): void {
    this.violations.push({
      type,
      code,
      message,
      severity,
      suggestion,
      path
    });
  }

  /**
   * Build the validation result
   */
  private buildResult(): ConstraintValidationResult {
    const duration = Date.now() - this.startTime;
    
    return {
      passed: this.violations.length === 0,
      violations: this.violations,
      warnings: this.warnings.length > 0 ? this.warnings : undefined,
      infos: this.infos.length > 0 ? this.infos : undefined,
      metrics: {
        checkDuration: duration,
        constraintsChecked: this.constraintsChecked,
        violationsFound: this.violations.length
      }
    };
  }

  /**
   * Check if a pattern contains a specific primitive type
   */
  private containsType(pattern: TypePattern, typeName: string): boolean {
    if (pattern.kind === 'primitive') {
      return (pattern as PrimitiveTypePattern).type === typeName;
    }

    let found = false;
    this.traversePattern(pattern, (subPattern) => {
      if (subPattern.kind === 'primitive' && (subPattern as PrimitiveTypePattern).type === typeName) {
        found = true;
        return true; // Stop traversal
      }
    });
    return found;
  }

  /**
   * Traverse a type pattern recursively
   */
  private traversePattern(
    pattern: TypePattern,
    visitor: (pattern: TypePattern, path: string[]) => boolean | void,
    path: string[] = []
  ): void {
    if (visitor(pattern, path)) {
      return; // Stop if visitor returns true
    }

    // Recursively traverse based on pattern kind
    switch (pattern.kind) {
      case 'array':
        this.traversePattern((pattern as any).elementType, visitor, [...path, 'element']);
        break;
      case 'tuple':
        (pattern as any).elements?.forEach((elem: TypePattern, i: number) => {
          this.traversePattern(elem, visitor, [...path, `[${i}]`]);
        });
        break;
      case 'object':
      case 'interface':
      case 'class':
        (pattern as any).properties?.forEach((prop: any) => {
          this.traversePattern(prop.type, visitor, [...path, prop.name]);
        });
        break;
      case 'union':
      case 'intersection':
        (pattern as any).types?.forEach((type: TypePattern, i: number) => {
          this.traversePattern(type, visitor, [...path, `|${i}|`]);
        });
        break;
      case 'function':
        (pattern as any).parameters?.forEach((param: any, i: number) => {
          this.traversePattern(param.type, visitor, [...path, `param${i}`]);
        });
        if ((pattern as any).returnType) {
          this.traversePattern((pattern as any).returnType, visitor, [...path, 'return']);
        }
        break;
      case 'generic':
        (pattern as any).typeArguments?.forEach((arg: TypePattern, i: number) => {
          this.traversePattern(arg, visitor, [...path, `<${i}>`]);
        });
        break;
    }
  }

  /**
   * Check if two patterns match (simplified)
   */
  private patternsMatch(a: TypePattern, b: TypePattern): boolean {
    if (a.kind !== b.kind) return false;

    switch (a.kind) {
      case 'primitive':
        return (a as PrimitiveTypePattern).type === (b as PrimitiveTypePattern).type;
      case 'literal':
        return (a as LiteralTypePattern).value === (b as LiteralTypePattern).value;
      default:
        // Simplified matching - could be expanded
        return JSON.stringify(a) === JSON.stringify(b);
    }
  }

  /**
   * Check if a name matches a naming convention
   */
  private matchesNamingConvention(name: string, convention: StyleConstraint['namingConvention']): boolean {
    if (!name || !convention) return true;

    switch (convention) {
      case 'camelCase':
        return /^[a-z][a-zA-Z0-9]*$/.test(name);
      case 'PascalCase':
        return /^[A-Z][a-zA-Z0-9]*$/.test(name);
      case 'snake_case':
        return /^[a-z][a-z0-9_]*$/.test(name);
      case 'UPPER_CASE':
        return /^[A-Z][A-Z0-9_]*$/.test(name);
      case 'kebab-case':
        return /^[a-z][a-z0-9-]*$/.test(name);
      default:
        return true;
    }
  }
}

/**
 * Create a constraint checker instance
 */
export function createConstraintChecker(): ConstraintChecker {
  return new ConstraintChecker();
}