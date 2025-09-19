/**
 * Type Pattern Matcher Service
 * 
 * Converts TypeScript Compiler API types to AST patterns and performs pattern matching
 */

import * as ts from 'typescript';
import type {
  TypePattern,
  PrimitiveTypePattern,
  LiteralTypePattern,
  ArrayTypePattern,
  TupleTypePattern,
  ObjectTypePattern,
  PropertyPattern,
  UnionTypePattern,
  IntersectionTypePattern,
  FunctionTypePattern,
  ParameterPattern,
  TypeParameterPattern,
  GenericTypePattern,
  TypeReferencePattern,
  InterfacePattern,
  ClassPattern,
  MethodPattern,
  EnumPattern,
  EnumMemberPattern,
  TypeAliasPattern,
  WildcardPattern,
  ExtractedTypeInfo,
  EnhancedExtractedTypeInfo,
  SymbolKind,
  ASTNodeInfo,
  SourceLocation,
  ModifierPattern
} from '../types/astSchema.js';

/**
 * Service for converting TypeScript types to AST patterns
 */
export class TypePatternMatcher {
  private readonly typeChecker: ts.TypeChecker;
  private readonly sourceFile: ts.SourceFile;
  private readonly processedTypes = new WeakMap<ts.Type, TypePattern>();
  private depth = 0;
  private readonly maxDepth = 50;

  constructor(typeChecker: ts.TypeChecker, sourceFile: ts.SourceFile) {
    this.typeChecker = typeChecker;
    this.sourceFile = sourceFile;
  }

  /**
   * Extract type information from a TypeScript node
   */
  public extractTypeInfo(node: ts.Node): ExtractedTypeInfo | undefined {
    const symbol = this.getSymbolFromNode(node);
    if (!symbol) return undefined;

    let type: ts.Type;
    let typePattern: TypePattern;
    
    // Special handling for interface and type alias declarations
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      // For interface and type alias declarations, get the declared type
      type = this.typeChecker.getDeclaredTypeOfSymbol(symbol);
      
      // Create appropriate pattern based on declaration type
      if (ts.isInterfaceDeclaration(node)) {
        typePattern = this.createInterfacePatternFromDeclaration(node, type);
      } else if (ts.isTypeAliasDeclaration(node)) {
        typePattern = this.createTypeAliasPatternFromDeclaration(node, type);
      } else {
        typePattern = this.typeToPattern(type, node);
      }
    } else {
      // For other nodes, use the regular approach
      type = this.typeChecker.getTypeOfSymbolAtLocation(symbol, node);
      typePattern = this.typeToPattern(type, node);
    }
    
    const symbolKind = this.getSymbolKind(node);
    const modifiers = this.getModifiers(node);
    const location = this.getSourceLocation(node);

    return {
      astNode: this.nodeToASTInfo(node),
      typePattern,
      symbolKind,
      modifiers,
      location,
      rawTypeString: this.typeChecker.typeToString(type)
    };
  }

  /**
   * Extract enhanced type information with creation method detection
   */
  public extractEnhancedTypeInfo(node: ts.Node): EnhancedExtractedTypeInfo | undefined {
    const basicInfo = this.extractTypeInfo(node);
    if (!basicInfo) return undefined;

    const typeCreationInfo = this.detectTypeCreationMethod(node);
    const complexity = this.calculateTypeComplexity(basicInfo.typePattern);
    const docInfo = this.extractDocumentation(node);

    return {
      ...basicInfo,
      typeSource: typeCreationInfo.typeSource,
      hasTypeAnnotation: typeCreationInfo.hasTypeAnnotation,
      hasAssertion: typeCreationInfo.hasAssertion,
      assertionChain: typeCreationInfo.assertionChain,
      isUnsafeCast: typeCreationInfo.isUnsafeCast,
      typeComplexity: complexity,
      hasDocumentation: docInfo.hasDocumentation,
      documentation: docInfo.documentation
    };
  }
  
  /**
   * Create interface pattern from interface declaration
   */
  private createInterfacePatternFromDeclaration(node: ts.InterfaceDeclaration, type: ts.Type): InterfacePattern {
    const name = node.name.text;
    const objectType = type as ts.ObjectType;
    const properties: PropertyPattern[] = [];
    const methods: MethodPattern[] = [];

    // Get properties and methods from the interface
    for (const prop of objectType.getProperties()) {
      const propType = this.typeChecker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration!);
      
      if (propType.getCallSignatures().length > 0) {
        // It's a method
        methods.push({
          name: prop.name,
          signature: this.createFunctionPattern(propType as ts.ObjectType),
          optional: !!(prop.flags & ts.SymbolFlags.Optional)
        });
      } else {
        // It's a property
        properties.push({
          name: prop.name,
          type: this.typeToPattern(propType),
          optional: !!(prop.flags & ts.SymbolFlags.Optional),
          readonly: !!(prop.flags & ts.SymbolFlags.Readonly)
        });
      }
    }

    return {
      kind: 'interface',
      name,
      properties,
      methods: methods.length > 0 ? methods : undefined
    };
  }
  
  /**
   * Create type alias pattern from type alias declaration
   */
  private createTypeAliasPatternFromDeclaration(node: ts.TypeAliasDeclaration, type: ts.Type): TypeAliasPattern {
    const name = node.name.text;
    
    // Get the aliased type
    const aliasedType = this.typeToPattern(type, node);
    
    return {
      kind: 'typeAlias',
      name,
      type: aliasedType
    };
  }

  /**
   * Detect how a type was created
   */
  private detectTypeCreationMethod(node: ts.Node): {
    typeSource: 'annotation' | 'assertion' | 'inference' | 'cast-chain';
    hasTypeAnnotation: boolean;
    hasAssertion: boolean;
    assertionChain?: string[];
    isUnsafeCast?: boolean;
  } {
    // Check for variable declarations with type annotations
    if (ts.isVariableDeclaration(node)) {
      const hasTypeAnnotation = !!node.type;
      
      if (node.initializer) {
        const assertionInfo = this.detectAssertions(node.initializer);
        
        if (assertionInfo.hasAssertion) {
          const typeSource = assertionInfo.assertionChain && assertionInfo.assertionChain.length > 1 
            ? 'cast-chain' as const
            : 'assertion' as const;
          
          return {
            typeSource,
            hasTypeAnnotation,
            hasAssertion: true,
            assertionChain: assertionInfo.assertionChain,
            isUnsafeCast: assertionInfo.isUnsafeCast
          };
        }
      }
      
      return {
        typeSource: hasTypeAnnotation ? 'annotation' : 'inference',
        hasTypeAnnotation,
        hasAssertion: false
      };
    }
    
    // Check for function declarations
    if (ts.isFunctionDeclaration(node)) {
      const hasReturnType = !!node.type;
      return {
        typeSource: hasReturnType ? 'annotation' : 'inference',
        hasTypeAnnotation: hasReturnType,
        hasAssertion: false
      };
    }
    
    // Check for class/interface declarations
    if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      return {
        typeSource: 'annotation',
        hasTypeAnnotation: true,
        hasAssertion: false
      };
    }
    
    // Default to inference
    return {
      typeSource: 'inference',
      hasTypeAnnotation: false,
      hasAssertion: false
    };
  }

  /**
   * Detect type assertions in an expression
   */
  private detectAssertions(node: ts.Node): {
    hasAssertion: boolean;
    assertionChain?: string[];
    isUnsafeCast?: boolean;
  } {
    const chain: string[] = [];
    let current: ts.Node = node;
    let hasUndefinedOrNull = false;
    
    // Walk up the assertion chain
    while (ts.isAsExpression(current) || ts.isTypeAssertionExpression(current)) {
      if (ts.isAsExpression(current)) {
        const typeString = current.type.getText();
        chain.push(typeString);
        current = current.expression;
      } else if (ts.isTypeAssertionExpression(current)) {
        const typeString = current.type.getText();
        chain.push(typeString);
        current = current.expression;
      }
    }
    
    // Check the base expression for unsafe patterns
    if (current) {
      const text = current.getText().toLowerCase();
      if (text.includes('undefined') || text.includes('null')) {
        hasUndefinedOrNull = true;
      }
    }
    
    // Detect unsafe casts (e.g., undefined as unknown as string)
    const isUnsafeCast = hasUndefinedOrNull && chain.length > 0;
    
    return {
      hasAssertion: chain.length > 0,
      assertionChain: chain.length > 0 ? chain.reverse() : undefined,
      isUnsafeCast
    };
  }

  /**
   * Calculate type complexity score
   */
  private calculateTypeComplexity(pattern: TypePattern, depth: number = 0): number {
    let score = 1 + depth * 0.5;
    
    switch (pattern.kind) {
      case 'primitive':
      case 'literal':
        return score;
      
      case 'array':
        return score + this.calculateTypeComplexity((pattern as ArrayTypePattern).elementType, depth + 1);
      
      case 'tuple':
        const tuplePattern = pattern as TupleTypePattern;
        return score + tuplePattern.elements.reduce(
          (sum, elem) => sum + this.calculateTypeComplexity(elem, depth + 1), 
          0
        );
      
      case 'object':
        const objPattern = pattern as ObjectTypePattern;
        return score + objPattern.properties.length * 2 + 
          objPattern.properties.reduce(
            (sum, prop) => sum + this.calculateTypeComplexity(prop.type, depth + 1),
            0
          );
      
      case 'union':
      case 'intersection':
        const unionPattern = pattern as UnionTypePattern | IntersectionTypePattern;
        return score + unionPattern.types.length + 
          unionPattern.types.reduce(
            (sum, type) => sum + this.calculateTypeComplexity(type, depth + 1),
            0
          );
      
      case 'function':
        const funcPattern = pattern as FunctionTypePattern;
        const paramScore = funcPattern.parameters.reduce(
          (sum, param) => sum + this.calculateTypeComplexity(param.type, depth + 1),
          0
        );
        const returnScore = this.calculateTypeComplexity(funcPattern.returnType, depth + 1);
        return score + paramScore + returnScore + 3;
      
      case 'generic':
        const genericPattern = pattern as GenericTypePattern;
        const argScore = genericPattern.typeArguments?.reduce(
          (sum, arg) => sum + this.calculateTypeComplexity(arg, depth + 1),
          0
        ) || 0;
        return score + argScore + 2;
      
      default:
        return score + 2;
    }
  }

  /**
   * Extract JSDoc documentation
   */
  private extractDocumentation(node: ts.Node): {
    hasDocumentation: boolean;
    documentation?: string;
  } {
    const symbol = this.getSymbolFromNode(node);
    if (!symbol) {
      return { hasDocumentation: false };
    }
    
    const docComment = symbol.getDocumentationComment(this.typeChecker);
    if (docComment && docComment.length > 0) {
      const documentation = docComment.map(comment => comment.text).join('\n');
      return {
        hasDocumentation: true,
        documentation
      };
    }
    
    // Check for JSDoc comments directly
    const jsDocTags = ts.getJSDocTags(node);
    if (jsDocTags && jsDocTags.length > 0) {
      const documentation = jsDocTags
        .map(tag => tag.getText())
        .join('\n');
      return {
        hasDocumentation: true,
        documentation
      };
    }
    
    return { hasDocumentation: false };
  }

  /**
   * Convert a TypeScript type to an AST pattern
   */
  public typeToPattern(type: ts.Type, node?: ts.Node): TypePattern {
    // Check cache first
    if (this.processedTypes.has(type)) {
      return this.processedTypes.get(type)!;
    }

    // Prevent infinite recursion
    if (this.depth > this.maxDepth) {
      return this.createWildcardPattern('Max depth reached');
    }

    this.depth++;
    let pattern: TypePattern;

    try {
      // Check for primitive types
      if (type.flags & ts.TypeFlags.String) {
        pattern = this.createPrimitivePattern('string');
      } else if (type.flags & ts.TypeFlags.Number) {
        pattern = this.createPrimitivePattern('number');
      } else if (type.flags & ts.TypeFlags.Boolean) {
        pattern = this.createPrimitivePattern('boolean');
      } else if (type.flags & ts.TypeFlags.BigInt) {
        pattern = this.createPrimitivePattern('bigint');
      } else if (type.flags & ts.TypeFlags.Symbol) {
        pattern = this.createPrimitivePattern('symbol');
      } else if (type.flags & ts.TypeFlags.Undefined) {
        pattern = this.createPrimitivePattern('undefined');
      } else if (type.flags & ts.TypeFlags.Null) {
        pattern = this.createPrimitivePattern('null');
      } else if (type.flags & ts.TypeFlags.Void) {
        pattern = this.createPrimitivePattern('void');
      } else if (type.flags & ts.TypeFlags.Never) {
        pattern = this.createPrimitivePattern('never');
      } else if (type.flags & ts.TypeFlags.Any) {
        pattern = this.createPrimitivePattern('any');
      } else if (type.flags & ts.TypeFlags.Unknown) {
        pattern = this.createPrimitivePattern('unknown');
      }
      // Check for literal types
      else if (type.flags & ts.TypeFlags.StringLiteral) {
        const literalType = type as ts.StringLiteralType;
        pattern = this.createLiteralPattern(literalType.value);
      } else if (type.flags & ts.TypeFlags.NumberLiteral) {
        const literalType = type as ts.NumberLiteralType;
        pattern = this.createLiteralPattern(literalType.value);
      } else if (type.flags & ts.TypeFlags.BooleanLiteral) {
        const literalType = type as ts.IntrinsicType;
        pattern = this.createLiteralPattern(literalType.intrinsicName === 'true');
      }
      // Check for union types
      else if (type.flags & ts.TypeFlags.Union) {
        pattern = this.createUnionPattern(type as ts.UnionType);
      }
      // Check for intersection types
      else if (type.flags & ts.TypeFlags.Intersection) {
        pattern = this.createIntersectionPattern(type as ts.IntersectionType);
      }
      // Check for object types
      else if (type.flags & ts.TypeFlags.Object) {
        const objectType = type as ts.ObjectType;
        
        // Check for array types
        if (this.isArrayType(objectType)) {
          pattern = this.createArrayPattern(objectType);
        }
        // Check for tuple types
        else if (this.isTupleType(objectType)) {
          pattern = this.createTuplePattern(objectType);
        }
        // Check for function types
        else if (this.isFunctionType(objectType)) {
          pattern = this.createFunctionPattern(objectType);
        }
        // Check for interface/class types
        else if (objectType.symbol && objectType.symbol.flags & ts.SymbolFlags.Interface) {
          pattern = this.createInterfacePattern(objectType);
        }
        else if (objectType.symbol && objectType.symbol.flags & ts.SymbolFlags.Class) {
          pattern = this.createClassPattern(objectType);
        }
        // Check for generic types
        else if (this.isGenericType(objectType)) {
          pattern = this.createGenericPattern(objectType);
        }
        // Default to object pattern
        else {
          pattern = this.createObjectPattern(objectType);
        }
      }
      // Check for type parameters
      else if (type.flags & ts.TypeFlags.TypeParameter) {
        const typeParam = type as ts.TypeParameter;
        pattern = this.createTypeReferencePattern(typeParam.symbol?.name ?? 'T');
      }
      // Check for enum types
      else if (type.flags & ts.TypeFlags.Enum) {
        pattern = this.createEnumPattern(type);
      }
      // Default case
      else {
        pattern = this.createWildcardPattern(this.typeChecker.typeToString(type));
      }

      // Cache the result
      this.processedTypes.set(type, pattern);
    } finally {
      this.depth--;
    }

    return pattern;
  }

  // ============================================================================
  // Pattern Creation Methods
  // ============================================================================

  private createPrimitivePattern(type: PrimitiveTypePattern['type']): PrimitiveTypePattern {
    return { kind: 'primitive', type };
  }

  private createLiteralPattern(value: string | number | boolean): LiteralTypePattern {
    return { kind: 'literal', value };
  }

  private createArrayPattern(type: ts.ObjectType): ArrayTypePattern {
    const typeArgs = (type as any).typeArguments;
    const elementType = typeArgs && typeArgs[0]
      ? this.typeToPattern(typeArgs[0])
      : this.createPrimitivePattern('any');
    
    return {
      kind: 'array',
      elementType
    };
  }

  private createTuplePattern(type: ts.ObjectType): TupleTypePattern {
    const tupleType = type as ts.TupleType;
    const elements: TypePattern[] = [];
    
    if ((tupleType as any).typeArguments) {
      for (const elemType of (tupleType as any).typeArguments) {
        elements.push(this.typeToPattern(elemType));
      }
    }

    return {
      kind: 'tuple',
      elements
    };
  }

  private createObjectPattern(type: ts.ObjectType): ObjectTypePattern {
    const properties: PropertyPattern[] = [];
    const stringIndexType = this.typeChecker.getIndexTypeOfType(type, ts.IndexKind.String);
    const numberIndexType = this.typeChecker.getIndexTypeOfType(type, ts.IndexKind.Number);

    // Get all properties
    const props = type.getProperties();
    for (const prop of props) {
      const propType = this.typeChecker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration!);
      const propPattern: PropertyPattern = {
        name: prop.name,
        type: this.typeToPattern(propType),
        optional: !!(prop.flags & ts.SymbolFlags.Optional),
        readonly: !!(prop.flags & ts.SymbolFlags.Readonly)
      };
      properties.push(propPattern);
    }

    const pattern: ObjectTypePattern = {
      kind: 'object',
      properties
    };

    // Add index signature if present
    if (stringIndexType) {
      pattern.indexSignature = {
        keyType: 'string',
        valueType: this.typeToPattern(stringIndexType)
      };
    } else if (numberIndexType) {
      pattern.indexSignature = {
        keyType: 'number',
        valueType: this.typeToPattern(numberIndexType)
      };
    }

    return pattern;
  }

  private createUnionPattern(type: ts.UnionType): UnionTypePattern {
    const types = type.types.map(t => this.typeToPattern(t));
    
    // Check for discriminated union
    const discriminator = this.findDiscriminator(type);
    
    return {
      kind: 'union',
      types,
      discriminator
    };
  }

  private createIntersectionPattern(type: ts.IntersectionType): IntersectionTypePattern {
    const types = type.types.map(t => this.typeToPattern(t));
    
    return {
      kind: 'intersection',
      types
    };
  }

  private createFunctionPattern(type: ts.ObjectType): FunctionTypePattern {
    const signatures = type.getCallSignatures();
    if (signatures.length === 0) {
      return this.createDefaultFunctionPattern();
    }

    const signature = signatures[0]!;
    const parameters: ParameterPattern[] = [];
    const typeParameters: TypeParameterPattern[] = [];

    // Get parameters
    for (const param of signature.parameters) {
      const paramType = this.typeChecker.getTypeOfSymbolAtLocation(param, param.valueDeclaration!);
      parameters.push({
        name: param.name,
        type: this.typeToPattern(paramType),
        optional: !!(param.flags & ts.SymbolFlags.Optional)
      });
    }

    // Get type parameters
    const typeParams = signature.typeParameters;
    if (typeParams) {
      for (const tp of typeParams) {
        const constraint = tp.getConstraint();
        typeParameters.push({
          name: tp.symbol?.name ?? 'T',
          constraint: constraint ? this.typeToPattern(constraint) : undefined
        });
      }
    }

    // Get return type
    const returnType = this.typeToPattern(signature.getReturnType());

    return {
      kind: 'function',
      parameters,
      returnType,
      typeParameters: typeParameters.length > 0 ? typeParameters : undefined
    };
  }

  private createInterfacePattern(type: ts.ObjectType): InterfacePattern {
    const symbol = type.symbol;
    const properties: PropertyPattern[] = [];
    const methods: MethodPattern[] = [];

    // Get properties and methods
    for (const prop of type.getProperties()) {
      const propType = this.typeChecker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration!);
      
      if (propType.getCallSignatures().length > 0) {
        // It's a method
        methods.push({
          name: prop.name,
          signature: this.createFunctionPattern(propType as ts.ObjectType),
          optional: !!(prop.flags & ts.SymbolFlags.Optional)
        });
      } else {
        // It's a property
        properties.push({
          name: prop.name,
          type: this.typeToPattern(propType),
          optional: !!(prop.flags & ts.SymbolFlags.Optional),
          readonly: !!(prop.flags & ts.SymbolFlags.Readonly)
        });
      }
    }

    return {
      kind: 'interface',
      name: symbol?.name ?? 'Interface',
      properties,
      methods: methods.length > 0 ? methods : undefined
    };
  }

  private createClassPattern(type: ts.ObjectType): ClassPattern {
    const symbol = type.symbol;
    const properties: PropertyPattern[] = [];
    const methods: MethodPattern[] = [];

    // Get properties and methods
    for (const prop of type.getProperties()) {
      const propType = this.typeChecker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration!);
      
      if (propType.getCallSignatures().length > 0) {
        // It's a method
        methods.push({
          name: prop.name,
          signature: this.createFunctionPattern(propType as ts.ObjectType),
          optional: !!(prop.flags & ts.SymbolFlags.Optional)
        });
      } else {
        // It's a property
        properties.push({
          name: prop.name,
          type: this.typeToPattern(propType),
          optional: !!(prop.flags & ts.SymbolFlags.Optional),
          readonly: !!(prop.flags & ts.SymbolFlags.Readonly)
        });
      }
    }

    return {
      kind: 'class',
      name: symbol?.name ?? 'Class',
      properties: properties.length > 0 ? properties : undefined,
      methods: methods.length > 0 ? methods : undefined
    };
  }

  private createGenericPattern(type: ts.ObjectType): GenericTypePattern {
    const symbol = type.symbol;
    const typeArguments: TypePattern[] = [];
    
    // Get type arguments if this is an instantiated generic
    if ((type as any).typeArguments) {
      for (const arg of (type as any).typeArguments) {
        typeArguments.push(this.typeToPattern(arg));
      }
    }

    return {
      kind: 'generic',
      typeName: symbol?.name ?? 'Generic',
      typeArguments: typeArguments.length > 0 ? typeArguments : undefined
    };
  }

  private createEnumPattern(type: ts.Type): EnumPattern {
    const symbol = type.symbol;
    const members: EnumMemberPattern[] = [];

    if (symbol && symbol.exports) {
      symbol.exports.forEach((memberSymbol) => {
        const memberType = this.typeChecker.getTypeOfSymbolAtLocation(
          memberSymbol,
          memberSymbol.valueDeclaration!
        );
        
        members.push({
          name: memberSymbol.name,
          value: (memberSymbol.valueDeclaration as any)?.initializer?.text
        });
      });
    }

    return {
      kind: 'enum',
      name: symbol?.name ?? 'Enum',
      members
    };
  }

  private createTypeReferencePattern(name: string): TypeReferencePattern {
    return {
      kind: 'typeReference',
      name
    };
  }

  private createWildcardPattern(description?: string): WildcardPattern {
    return {
      kind: 'wildcard',
      description
    };
  }

  private createDefaultFunctionPattern(): FunctionTypePattern {
    return {
      kind: 'function',
      parameters: [],
      returnType: this.createPrimitivePattern('void')
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private isArrayType(type: ts.ObjectType): boolean {
    const symbol = type.symbol;
    if (!symbol) return false;
    
    // Check if it's Array<T> or T[]
    return symbol.name === 'Array' || 
           (this.typeChecker as any).isArrayType?.(type) || 
           false;
  }

  private isTupleType(type: ts.ObjectType): boolean {
    return (this.typeChecker as any).isTupleType?.(type) || false;
  }

  private isFunctionType(type: ts.ObjectType): boolean {
    return type.getCallSignatures().length > 0;
  }

  private isGenericType(type: ts.ObjectType): boolean {
    return !!(type as any).typeArguments || !!(type as any).typeParameters;
  }

  private findDiscriminator(type: ts.UnionType): string | undefined {
    // Try to find a common literal property that can serve as discriminator
    const commonProps = new Map<string, Set<string | number | boolean>>();
    
    for (const unionMember of type.types) {
      if (unionMember.flags & ts.TypeFlags.Object) {
        const objType = unionMember as ts.ObjectType;
        for (const prop of objType.getProperties()) {
          const propType = this.typeChecker.getTypeOfSymbolAtLocation(
            prop,
            prop.valueDeclaration!
          );
          
          if (propType.flags & (ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral | ts.TypeFlags.BooleanLiteral)) {
            if (!commonProps.has(prop.name)) {
              commonProps.set(prop.name, new Set());
            }
            
            let value: string | number | boolean;
            if (propType.flags & ts.TypeFlags.StringLiteral) {
              value = (propType as ts.StringLiteralType).value;
            } else if (propType.flags & ts.TypeFlags.NumberLiteral) {
              value = (propType as ts.NumberLiteralType).value;
            } else {
              value = (propType as ts.IntrinsicType).intrinsicName === 'true';
            }
            
            commonProps.get(prop.name)!.add(value);
          }
        }
      }
    }
    
    // Find a property that has different values for each union member
    for (const [propName, values] of commonProps) {
      if (values.size === type.types.length) {
        return propName;
      }
    }
    
    return undefined;
  }

  private getSymbolFromNode(node: ts.Node): ts.Symbol | undefined {
    if (ts.isIdentifier(node)) {
      return this.typeChecker.getSymbolAtLocation(node);
    }
    
    if (ts.isVariableDeclaration(node) && node.name) {
      return this.typeChecker.getSymbolAtLocation(node.name);
    }
    
    if (ts.isFunctionDeclaration(node) && node.name) {
      return this.typeChecker.getSymbolAtLocation(node.name);
    }
    
    if (ts.isClassDeclaration(node) && node.name) {
      return this.typeChecker.getSymbolAtLocation(node.name);
    }
    
    if (ts.isInterfaceDeclaration(node) && node.name) {
      return this.typeChecker.getSymbolAtLocation(node.name);
    }
    
    if (ts.isTypeAliasDeclaration(node) && node.name) {
      return this.typeChecker.getSymbolAtLocation(node.name);
    }
    
    if (ts.isEnumDeclaration(node) && node.name) {
      return this.typeChecker.getSymbolAtLocation(node.name);
    }
    
    return this.typeChecker.getSymbolAtLocation(node);
  }

  private getSymbolKind(node: ts.Node): SymbolKind {
    if (ts.isVariableDeclaration(node)) return 'variable';
    if (ts.isFunctionDeclaration(node)) return 'function';
    if (ts.isClassDeclaration(node)) return 'class';
    if (ts.isInterfaceDeclaration(node)) return 'interface';
    if (ts.isTypeAliasDeclaration(node)) return 'type';
    if (ts.isEnumDeclaration(node)) return 'enum';
    if (ts.isModuleDeclaration(node)) return 'namespace';
    if (ts.isParameter(node)) return 'parameter';
    if (ts.isPropertyDeclaration(node)) return 'property';
    if (ts.isMethodDeclaration(node)) return 'method';
    if (ts.isGetAccessorDeclaration(node)) return 'getter';
    if (ts.isSetAccessorDeclaration(node)) return 'setter';
    if (ts.isExportAssignment(node)) return 'export';
    if (ts.isImportDeclaration(node)) return 'import';
    
    return 'variable';
  }

  private getModifiers(node: ts.Node): ModifierPattern[] | undefined {
    const modifiers: ModifierPattern[] = [];
    
    if (!ts.canHaveModifiers(node)) {
      return undefined;
    }
    
    const nodeModifiers = ts.getModifiers(node);
    if (!nodeModifiers) {
      return undefined;
    }
    
    for (const modifier of nodeModifiers) {
      switch (modifier.kind) {
        case ts.SyntaxKind.PublicKeyword:
          modifiers.push('public');
          break;
        case ts.SyntaxKind.PrivateKeyword:
          modifiers.push('private');
          break;
        case ts.SyntaxKind.ProtectedKeyword:
          modifiers.push('protected');
          break;
        case ts.SyntaxKind.StaticKeyword:
          modifiers.push('static');
          break;
        case ts.SyntaxKind.ReadonlyKeyword:
          modifiers.push('readonly');
          break;
        case ts.SyntaxKind.AbstractKeyword:
          modifiers.push('abstract');
          break;
        case ts.SyntaxKind.AsyncKeyword:
          modifiers.push('async');
          break;
        case ts.SyntaxKind.ConstKeyword:
          modifiers.push('const');
          break;
        case ts.SyntaxKind.ExportKeyword:
          modifiers.push('export');
          break;
        case ts.SyntaxKind.DefaultKeyword:
          modifiers.push('default');
          break;
      }
    }
    
    return modifiers.length > 0 ? modifiers : undefined;
  }

  private getSourceLocation(node: ts.Node): SourceLocation {
    const { line, character } = this.sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const { line: endLine, character: endCharacter } = this.sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    
    return {
      file: this.sourceFile.fileName,
      line: line + 1,
      column: character + 1,
      endLine: endLine + 1,
      endColumn: endCharacter + 1
    };
  }

  private nodeToASTInfo(node: ts.Node): ASTNodeInfo {
    const kind = ts.SyntaxKind[node.kind] ?? 'Unknown';
    const text = node.getText ? node.getText() : undefined;
    const children: ASTNodeInfo[] = [];
    
    // Add important children (limit for performance)
    const maxChildren = 5;
    let childCount = 0;
    
    ts.forEachChild(node, (child) => {
      if (childCount < maxChildren) {
        children.push(this.nodeToASTInfo(child));
        childCount++;
      }
    });
    
    return {
      kind,
      text: text && text.length < 100 ? text : undefined,
      children: children.length > 0 ? children : undefined
    };
  }
}

/**
 * Create a type pattern matcher instance
 */
export function createPatternMatcher(
  typeChecker: ts.TypeChecker,
  sourceFile: ts.SourceFile
): TypePatternMatcher {
  return new TypePatternMatcher(typeChecker, sourceFile);
}