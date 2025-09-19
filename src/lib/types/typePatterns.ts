/**
 * Type Pattern Matching and Builder Utilities
 * 
 * This module provides helper functions for creating and working with
 * AST-based type patterns.
 */

import type {
  TypePattern,
  PrimitiveTypePattern,
  LiteralTypePattern,
  ArrayTypePattern,
  TupleTypePattern,
  ObjectTypePattern,
  PropertyPattern,
  IndexSignaturePattern,
  UnionTypePattern,
  IntersectionTypePattern,
  FunctionTypePattern,
  ParameterPattern,
  TypeParameterPattern,
  GenericTypePattern,
  TypeReferencePattern,
  ConditionalTypePattern,
  MappedTypePattern,
  TemplateLiteralTypePattern,
  InterfacePattern,
  MethodPattern,
  ClassPattern,
  EnumPattern,
  EnumMemberPattern,
  TypeAliasPattern,
  NamespacePattern,
  ExportPattern,
  WildcardPattern
} from './astSchema.js';

// ============================================================================
// Pattern Builders
// ============================================================================

/**
 * Builder functions for creating type patterns
 */
export const pattern = {
  /**
   * Create a primitive type pattern
   */
  primitive(type: PrimitiveTypePattern['type'], options?: {
    optional?: boolean;
    nullable?: boolean;
    readonly?: boolean;
  }): PrimitiveTypePattern {
    return {
      kind: 'primitive',
      type,
      ...options
    };
  },

  /**
   * Create a literal type pattern
   */
  literal(value: string | number | boolean, options?: {
    optional?: boolean;
    readonly?: boolean;
  }): LiteralTypePattern {
    return {
      kind: 'literal',
      value,
      ...options
    };
  },

  /**
   * Create an array type pattern
   */
  array(elementType: TypePattern, options?: {
    minLength?: number;
    maxLength?: number;
    exactLength?: number;
    optional?: boolean;
    readonly?: boolean;
  }): ArrayTypePattern {
    return {
      kind: 'array',
      elementType,
      ...options
    };
  },

  /**
   * Create a tuple type pattern
   */
  tuple(elements: readonly TypePattern[], options?: {
    restType?: TypePattern;
    optional?: boolean;
    readonly?: boolean;
  }): TupleTypePattern {
    return {
      kind: 'tuple',
      elements,
      ...options
    };
  },

  /**
   * Create an object type pattern
   */
  object(properties: readonly PropertyPattern[], options?: {
    indexSignature?: IndexSignaturePattern;
    allowExtraProperties?: boolean;
    optional?: boolean;
    readonly?: boolean;
  }): ObjectTypePattern {
    return {
      kind: 'object',
      properties,
      ...options
    };
  },

  /**
   * Create a property pattern
   */
  property(name: string, type: TypePattern, options?: {
    optional?: boolean;
    readonly?: boolean;
    description?: string;
  }): PropertyPattern {
    return {
      name,
      type,
      ...options
    };
  },

  /**
   * Create an index signature pattern
   */
  indexSignature(keyType: 'string' | 'number' | 'symbol', valueType: TypePattern, options?: {
    readonly?: boolean;
  }): IndexSignaturePattern {
    return {
      keyType,
      valueType,
      ...options
    };
  },

  /**
   * Create a union type pattern
   */
  union(types: readonly TypePattern[], options?: {
    discriminator?: string;
    optional?: boolean;
    readonly?: boolean;
  }): UnionTypePattern {
    return {
      kind: 'union',
      types,
      ...options
    };
  },

  /**
   * Create an intersection type pattern
   */
  intersection(types: readonly TypePattern[], options?: {
    optional?: boolean;
    readonly?: boolean;
  }): IntersectionTypePattern {
    return {
      kind: 'intersection',
      types,
      ...options
    };
  },

  /**
   * Create a function type pattern
   */
  function(
    parameters: readonly ParameterPattern[],
    returnType: TypePattern,
    options?: {
      typeParameters?: readonly TypeParameterPattern[];
      restParameter?: ParameterPattern;
      isAsync?: boolean;
      isGenerator?: boolean;
      optional?: boolean;
      readonly?: boolean;
    }
  ): FunctionTypePattern {
    return {
      kind: 'function',
      parameters,
      returnType,
      ...options
    };
  },

  /**
   * Create a parameter pattern
   */
  parameter(type: TypePattern, options?: {
    name?: string;
    optional?: boolean;
    defaultValue?: string;
  }): ParameterPattern {
    return {
      type,
      ...options
    };
  },

  /**
   * Create a type parameter pattern
   */
  typeParameter(name: string, options?: {
    constraint?: TypePattern;
    default?: TypePattern;
  }): TypeParameterPattern {
    return {
      name,
      ...options
    };
  },

  /**
   * Create a generic type pattern
   */
  generic(typeName: string, typeArguments?: readonly TypePattern[], options?: {
    optional?: boolean;
    readonly?: boolean;
  }): GenericTypePattern {
    return {
      kind: 'generic',
      typeName,
      typeArguments,
      ...options
    };
  },

  /**
   * Create a type reference pattern
   */
  typeReference(name: string, options?: {
    optional?: boolean;
    readonly?: boolean;
  }): TypeReferencePattern {
    return {
      kind: 'typeReference',
      name,
      ...options
    };
  },

  /**
   * Create a conditional type pattern
   */
  conditional(
    checkType: TypePattern,
    extendsType: TypePattern,
    trueType: TypePattern,
    falseType: TypePattern,
    options?: {
      optional?: boolean;
      readonly?: boolean;
    }
  ): ConditionalTypePattern {
    return {
      kind: 'conditional',
      checkType,
      extendsType,
      trueType,
      falseType,
      ...options
    };
  },

  /**
   * Create a mapped type pattern
   */
  mapped(
    keyType: TypePattern,
    valueType: TypePattern,
    options?: {
      optionalModifier?: '+' | '-' | undefined;
      readonlyModifier?: '+' | '-' | undefined;
      optional?: boolean;
      readonly?: boolean;
    }
  ): MappedTypePattern {
    return {
      kind: 'mapped',
      keyType,
      valueType,
      ...options
    };
  },

  /**
   * Create a template literal type pattern
   */
  templateLiteral(parts: readonly (string | TypePattern)[], options?: {
    optional?: boolean;
    readonly?: boolean;
  }): TemplateLiteralTypePattern {
    return {
      kind: 'templateLiteral',
      parts,
      ...options
    };
  },

  /**
   * Create an interface pattern
   */
  interface(
    name: string,
    properties: readonly PropertyPattern[],
    options?: {
      typeParameters?: readonly TypeParameterPattern[];
      extends?: readonly TypePattern[];
      methods?: readonly MethodPattern[];
      indexSignature?: IndexSignaturePattern;
      optional?: boolean;
      readonly?: boolean;
    }
  ): InterfacePattern {
    return {
      kind: 'interface',
      name,
      properties,
      ...options
    };
  },

  /**
   * Create a method pattern
   */
  method(name: string, signature: FunctionTypePattern, options?: {
    optional?: boolean;
  }): MethodPattern {
    return {
      name,
      signature,
      ...options
    };
  },

  /**
   * Create a class pattern
   */
  class(
    name: string,
    options?: {
      typeParameters?: readonly TypeParameterPattern[];
      extends?: TypePattern;
      implements?: readonly TypePattern[];
      constructorPattern?: FunctionTypePattern;
      properties?: readonly PropertyPattern[];
      methods?: readonly MethodPattern[];
      abstract?: boolean;
      optional?: boolean;
      readonly?: boolean;
    }
  ): ClassPattern {
    return {
      kind: 'class',
      name,
      ...options
    };
  },

  /**
   * Create an enum pattern
   */
  enum(name: string, members: readonly EnumMemberPattern[], options?: {
    const?: boolean;
    optional?: boolean;
    readonly?: boolean;
  }): EnumPattern {
    return {
      kind: 'enum',
      name,
      members,
      ...options
    };
  },

  /**
   * Create an enum member pattern
   */
  enumMember(name: string, value?: string | number): EnumMemberPattern {
    return {
      name,
      value
    };
  },

  /**
   * Create a type alias pattern
   */
  typeAlias(
    name: string,
    type: TypePattern,
    options?: {
      typeParameters?: readonly TypeParameterPattern[];
      optional?: boolean;
      readonly?: boolean;
    }
  ): TypeAliasPattern {
    return {
      kind: 'typeAlias',
      name,
      type,
      ...options
    };
  },

  /**
   * Create a namespace pattern
   */
  namespace(name: string, exports: readonly ExportPattern[], options?: {
    optional?: boolean;
    readonly?: boolean;
  }): NamespacePattern {
    return {
      kind: 'namespace',
      name,
      exports,
      ...options
    };
  },

  /**
   * Create an export pattern
   */
  export(name: string, type: TypePattern, options?: {
    isType?: boolean;
  }): ExportPattern {
    return {
      name,
      type,
      ...options
    };
  },

  /**
   * Create a wildcard pattern
   */
  wildcard(options?: {
    constraint?: TypePattern;
    description?: string;
    optional?: boolean;
    readonly?: boolean;
  }): WildcardPattern {
    return {
      kind: 'wildcard',
      ...options
    };
  }
} as const;

// ============================================================================
// Common Pattern Shortcuts
// ============================================================================

/**
 * Common TypeScript utility type patterns
 */
export const utilityPatterns = {
  /**
   * Partial<T> pattern
   */
  partial(type: TypePattern): GenericTypePattern {
    return pattern.generic('Partial', [type]);
  },

  /**
   * Required<T> pattern
   */
  required(type: TypePattern): GenericTypePattern {
    return pattern.generic('Required', [type]);
  },

  /**
   * Readonly<T> pattern
   */
  readonly(type: TypePattern): GenericTypePattern {
    return pattern.generic('Readonly', [type]);
  },

  /**
   * Record<K, V> pattern
   */
  record(keyType: TypePattern, valueType: TypePattern): GenericTypePattern {
    return pattern.generic('Record', [keyType, valueType]);
  },

  /**
   * Pick<T, K> pattern
   */
  pick(type: TypePattern, keys: TypePattern): GenericTypePattern {
    return pattern.generic('Pick', [type, keys]);
  },

  /**
   * Omit<T, K> pattern
   */
  omit(type: TypePattern, keys: TypePattern): GenericTypePattern {
    return pattern.generic('Omit', [type, keys]);
  },

  /**
   * Exclude<T, U> pattern
   */
  exclude(type: TypePattern, excludedType: TypePattern): GenericTypePattern {
    return pattern.generic('Exclude', [type, excludedType]);
  },

  /**
   * Extract<T, U> pattern
   */
  extract(type: TypePattern, extractedType: TypePattern): GenericTypePattern {
    return pattern.generic('Extract', [type, extractedType]);
  },

  /**
   * NonNullable<T> pattern
   */
  nonNullable(type: TypePattern): GenericTypePattern {
    return pattern.generic('NonNullable', [type]);
  },

  /**
   * ReturnType<T> pattern
   */
  returnType(type: TypePattern): GenericTypePattern {
    return pattern.generic('ReturnType', [type]);
  },

  /**
   * Parameters<T> pattern
   */
  parameters(type: TypePattern): GenericTypePattern {
    return pattern.generic('Parameters', [type]);
  },

  /**
   * ConstructorParameters<T> pattern
   */
  constructorParameters(type: TypePattern): GenericTypePattern {
    return pattern.generic('ConstructorParameters', [type]);
  },

  /**
   * Promise<T> pattern
   */
  promise(type: TypePattern): GenericTypePattern {
    return pattern.generic('Promise', [type]);
  },

  /**
   * Array<T> pattern (alternative to T[])
   */
  arrayGeneric(type: TypePattern): GenericTypePattern {
    return pattern.generic('Array', [type]);
  },

  /**
   * Map<K, V> pattern
   */
  map(keyType: TypePattern, valueType: TypePattern): GenericTypePattern {
    return pattern.generic('Map', [keyType, valueType]);
  },

  /**
   * Set<T> pattern
   */
  set(type: TypePattern): GenericTypePattern {
    return pattern.generic('Set', [type]);
  },

  /**
   * WeakMap<K, V> pattern
   */
  weakMap(keyType: TypePattern, valueType: TypePattern): GenericTypePattern {
    return pattern.generic('WeakMap', [keyType, valueType]);
  },

  /**
   * WeakSet<T> pattern
   */
  weakSet(type: TypePattern): GenericTypePattern {
    return pattern.generic('WeakSet', [type]);
  }
} as const;

// ============================================================================
// Common Primitive Patterns
// ============================================================================

/**
 * Shortcuts for common primitive patterns
 */
export const primitives = {
  string: pattern.primitive('string'),
  number: pattern.primitive('number'),
  boolean: pattern.primitive('boolean'),
  symbol: pattern.primitive('symbol'),
  undefined: pattern.primitive('undefined'),
  null: pattern.primitive('null'),
  void: pattern.primitive('void'),
  never: pattern.primitive('never'),
  any: pattern.primitive('any'),
  unknown: pattern.primitive('unknown'),
  bigint: pattern.primitive('bigint')
} as const;

// ============================================================================
// Pattern Matching Utilities
// ============================================================================

/**
 * Check if a pattern matches a specific kind
 */
export function isPatternKind<K extends TypePattern['kind']>(
  pattern: TypePattern,
  kind: K
): pattern is Extract<TypePattern, { kind: K }> {
  return pattern.kind === kind;
}

/**
 * Deep clone a type pattern
 */
export function clonePattern<T extends TypePattern>(pattern: T): T {
  return JSON.parse(JSON.stringify(pattern)) as T;
}

/**
 * Check if two patterns are structurally equal
 */
export function patternsEqual(a: TypePattern, b: TypePattern): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ============================================================================
// Pattern Transformation Utilities
// ============================================================================

/**
 * Make all properties in an object pattern optional
 */
export function makePropertiesOptional(pattern: ObjectTypePattern): ObjectTypePattern {
  return {
    ...pattern,
    properties: pattern.properties.map(prop => ({
      ...prop,
      optional: true
    }))
  };
}

/**
 * Make all properties in an object pattern required
 */
export function makePropertiesRequired(pattern: ObjectTypePattern): ObjectTypePattern {
  return {
    ...pattern,
    properties: pattern.properties.map(prop => ({
      ...prop,
      optional: false
    }))
  };
}

/**
 * Make all properties in an object pattern readonly
 */
export function makePropertiesReadonly(pattern: ObjectTypePattern): ObjectTypePattern {
  return {
    ...pattern,
    properties: pattern.properties.map(prop => ({
      ...prop,
      readonly: true
    }))
  };
}

/**
 * Extract property names from an object pattern
 */
export function getPropertyNames(pattern: ObjectTypePattern): string[] {
  return pattern.properties.map(prop => prop.name);
}

/**
 * Find a property by name in an object pattern
 */
export function findProperty(
  pattern: ObjectTypePattern,
  name: string
): PropertyPattern | undefined {
  return pattern.properties.find(prop => prop.name === name);
}

/**
 * Add or update a property in an object pattern
 */
export function setProperty(
  pattern: ObjectTypePattern,
  property: PropertyPattern
): ObjectTypePattern {
  const existingIndex = pattern.properties.findIndex(
    prop => prop.name === property.name
  );
  
  const newProperties = [...pattern.properties];
  if (existingIndex >= 0) {
    newProperties[existingIndex] = property;
  } else {
    newProperties.push(property);
  }
  
  return {
    ...pattern,
    properties: newProperties
  };
}

/**
 * Remove a property from an object pattern
 */
export function removeProperty(
  pattern: ObjectTypePattern,
  name: string
): ObjectTypePattern {
  return {
    ...pattern,
    properties: pattern.properties.filter(prop => prop.name !== name)
  };
}

// ============================================================================
// Pattern Visitor
// ============================================================================

/**
 * Visitor function for traversing type patterns
 */
export type PatternVisitor<T> = (pattern: TypePattern, path: string[]) => T | undefined;

/**
 * Visit all patterns in a tree
 */
export function visitPattern<T>(
  pattern: TypePattern,
  visitor: PatternVisitor<T>,
  path: string[] = []
): T | undefined {
  const result = visitor(pattern, path);
  if (result !== undefined) {
    return result;
  }

  switch (pattern.kind) {
    case 'array':
      return visitPattern(pattern.elementType, visitor, [...path, 'element']);
      
    case 'tuple':
      for (let i = 0; i < pattern.elements.length; i++) {
        const result = visitPattern(pattern.elements[i]!, visitor, [...path, `[${i}]`]);
        if (result !== undefined) return result;
      }
      if (pattern.restType) {
        return visitPattern(pattern.restType, visitor, [...path, '...']);
      }
      break;
      
    case 'object':
      for (const prop of pattern.properties) {
        const result = visitPattern(prop.type, visitor, [...path, prop.name]);
        if (result !== undefined) return result;
      }
      if (pattern.indexSignature) {
        return visitPattern(pattern.indexSignature.valueType, visitor, [...path, '[index]']);
      }
      break;
      
    case 'union':
    case 'intersection':
      for (let i = 0; i < pattern.types.length; i++) {
        const result = visitPattern(pattern.types[i]!, visitor, [...path, `|${i}|`]);
        if (result !== undefined) return result;
      }
      break;
      
    case 'function':
      for (let i = 0; i < pattern.parameters.length; i++) {
        const param = pattern.parameters[i]!;
        const result = visitPattern(param.type, visitor, [...path, `param${i}`]);
        if (result !== undefined) return result;
      }
      if (pattern.restParameter) {
        const result = visitPattern(pattern.restParameter.type, visitor, [...path, '...params']);
        if (result !== undefined) return result;
      }
      return visitPattern(pattern.returnType, visitor, [...path, 'return']);
      
    case 'generic':
      if (pattern.typeArguments) {
        for (let i = 0; i < pattern.typeArguments.length; i++) {
          const result = visitPattern(pattern.typeArguments[i]!, visitor, [...path, `<${i}>`]);
          if (result !== undefined) return result;
        }
      }
      break;
      
    case 'conditional':
      const checkResult = visitPattern(pattern.checkType, visitor, [...path, 'check']);
      if (checkResult !== undefined) return checkResult;
      const extendsResult = visitPattern(pattern.extendsType, visitor, [...path, 'extends']);
      if (extendsResult !== undefined) return extendsResult;
      const trueResult = visitPattern(pattern.trueType, visitor, [...path, 'true']);
      if (trueResult !== undefined) return trueResult;
      return visitPattern(pattern.falseType, visitor, [...path, 'false']);
      
    case 'mapped':
      const keyResult = visitPattern(pattern.keyType, visitor, [...path, 'key']);
      if (keyResult !== undefined) return keyResult;
      return visitPattern(pattern.valueType, visitor, [...path, 'value']);
      
    // Add more cases as needed
  }
  
  return undefined;
}

// ============================================================================
// Pattern Serialization
// ============================================================================

/**
 * Convert a pattern to a human-readable string representation
 */
export function patternToString(pattern: TypePattern): string {
  switch (pattern.kind) {
    case 'primitive':
      return pattern.type;
      
    case 'literal':
      return typeof pattern.value === 'string' ? `"${pattern.value}"` : String(pattern.value);
      
    case 'array':
      return `${patternToString(pattern.elementType)}[]`;
      
    case 'tuple':
      const elements = pattern.elements.map(patternToString).join(', ');
      const rest = pattern.restType ? `, ...${patternToString(pattern.restType)}[]` : '';
      return `[${elements}${rest}]`;
      
    case 'object':
      const props = pattern.properties.map(prop => {
        const optional = prop.optional ? '?' : '';
        const readonly = prop.readonly ? 'readonly ' : '';
        return `${readonly}${prop.name}${optional}: ${patternToString(prop.type)}`;
      }).join('; ');
      return `{ ${props} }`;
      
    case 'union':
      return pattern.types.map(patternToString).join(' | ');
      
    case 'intersection':
      return pattern.types.map(patternToString).join(' & ');
      
    case 'function':
      const params = pattern.parameters.map(param => {
        const optional = param.optional ? '?' : '';
        const name = param.name || '_';
        return `${name}${optional}: ${patternToString(param.type)}`;
      }).join(', ');
      return `(${params}) => ${patternToString(pattern.returnType)}`;
      
    case 'generic':
      if (pattern.typeArguments && pattern.typeArguments.length > 0) {
        const args = pattern.typeArguments.map(patternToString).join(', ');
        return `${pattern.typeName}<${args}>`;
      }
      return pattern.typeName;
      
    case 'typeReference':
      return pattern.name;
      
    case 'wildcard':
      return pattern.description || '*';
    
    case 'interface':
      const interfacePattern = pattern as InterfacePattern;
      const iProps = interfacePattern.properties.map(prop => {
        const optional = prop.optional ? '?' : '';
        const readonly = prop.readonly ? 'readonly ' : '';
        return `${readonly}${prop.name}${optional}: ${patternToString(prop.type)}`;
      }).join('; ');
      return `interface ${interfacePattern.name} { ${iProps} }`;
    
    case 'class':
      const classPattern = pattern as ClassPattern;
      return `class ${classPattern.name}`;
    
    case 'typeAlias':
      const aliasPattern = pattern as TypeAliasPattern;
      return `type ${aliasPattern.name} = ${patternToString(aliasPattern.type)}`;
    
    case 'enum':
      const enumPattern = pattern as EnumPattern;
      const members = enumPattern.members.map(m => 
        m.value !== undefined ? `${m.name} = ${m.value}` : m.name
      ).join(', ');
      return `enum ${enumPattern.name} { ${members} }`;
    
    case 'conditional':
      const condPattern = pattern as ConditionalTypePattern;
      return `${patternToString(condPattern.checkType)} extends ${patternToString(condPattern.extendsType)} ? ${patternToString(condPattern.trueType)} : ${patternToString(condPattern.falseType)}`;
    
    case 'mapped':
      const mappedPattern = pattern as MappedTypePattern;
      const readonly = mappedPattern.readonlyModifier === '+' ? 'readonly ' : '';
      const optional = mappedPattern.optionalModifier === '+' ? '?' : '';
      return `{ [K in ${patternToString(mappedPattern.keyType)}]${optional}: ${patternToString(mappedPattern.valueType)} }`;
    
    case 'templateLiteral':
      const templatePattern = pattern as TemplateLiteralTypePattern;
      return '`' + templatePattern.parts.map(part => 
        typeof part === 'string' ? part : `\${${patternToString(part)}}`
      ).join('') + '`';
    
    case 'namespace':
      const namespacePattern = pattern as NamespacePattern;
      return `namespace ${namespacePattern.name}`;
      
    default:
      return '<complex type>';
  }
}

// ============================================================================
// Export all types from astSchema for convenience
// ============================================================================

export type {
  TypePattern,
  PrimitiveTypePattern,
  LiteralTypePattern,
  ArrayTypePattern,
  TupleTypePattern,
  ObjectTypePattern,
  PropertyPattern,
  IndexSignaturePattern,
  UnionTypePattern,
  IntersectionTypePattern,
  FunctionTypePattern,
  ParameterPattern,
  TypeParameterPattern,
  GenericTypePattern,
  TypeReferencePattern,
  ConditionalTypePattern,
  MappedTypePattern,
  TemplateLiteralTypePattern,
  InterfacePattern,
  MethodPattern,
  ClassPattern,
  EnumPattern,
  EnumMemberPattern,
  TypeAliasPattern,
  NamespacePattern,
  ExportPattern,
  WildcardPattern,
  ASTTypePattern,
  ComparisonMode,
  ASTTypeAssertion,
  SymbolKind,
  AssertionMetadata,
  ScopePattern,
  ModifierPattern,
  DecoratorPattern,
  JSDocPattern,
  JSDocParamPattern,
  JSDocTagPattern,
  ASTAssertionResult,
  ExtractedTypeInfo,
  ASTNodeInfo,
  SourceLocation,
  ValidationError,
  ValidationWarning,
  TypeDifference,
  DifferenceKind,
  ASTValidationConfig
} from './astSchema.js';