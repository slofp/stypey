/**
 * Advanced type checking service with structural type comparison
 * This service provides more accurate type comparison than simple string matching
 */

import type { TypeAssertion } from '$types/problem';

/**
 * Type comparison modes
 */
export type ComparisonMode = 'exact' | 'structural' | 'assignable' | 'type-alias';

/**
 * Type information extracted from TypeScript
 */
export interface ExtractedType {
  readonly raw: string;           // Raw type string from TypeScript
  readonly normalized: string;    // Normalized for comparison
  readonly structure?: TypeStructure; // Parsed structure for deep comparison
  readonly aliasName?: string;    // Type alias or interface name if available
}

/**
 * Structured representation of a type for comparison
 */
export interface TypeStructure {
  readonly kind: 'primitive' | 'object' | 'array' | 'function' | 'union' | 'intersection' | 'literal' | 'tuple' | 'generic';
  readonly base?: string;         // Base type name
  readonly properties?: Map<string, TypeStructure>; // For objects
  readonly elementType?: TypeStructure;  // For arrays
  readonly parameters?: TypeStructure[]; // For functions/generics
  readonly returnType?: TypeStructure;   // For functions
  readonly types?: TypeStructure[];      // For unions/intersections/tuples
  readonly value?: string | number | boolean; // For literals
  readonly typeParameters?: Map<string, TypeStructure>; // For generics
}

/**
 * Result of type comparison
 */
export interface ComparisonResult {
  readonly matches: boolean;
  readonly mode: ComparisonMode;
  readonly details?: string;
  readonly differences?: TypeDifference[];
}

/**
 * Describes a difference between two types
 */
export interface TypeDifference {
  readonly path: string;
  readonly expected: string;
  readonly actual: string;
  readonly reason: string;
}

/**
 * Enhanced type assertion with comparison mode
 */
export interface EnhancedTypeAssertion extends TypeAssertion {
  readonly comparisonMode?: ComparisonMode;
  readonly allowSubtypes?: boolean;
  readonly ignoreOptional?: boolean;
}

export class AdvancedTypeChecker {
  private static monaco: typeof import('monaco-editor') | null = null;
  private static typeCache = new Map<string, ExtractedType>();
  
  /**
   * Initialize the advanced type checker
   */
  static async initialize(): Promise<void> {
    if (!this.monaco) {
      const { setupMonacoEnvironment, monaco } = await import('$lib/components/Editor/MonacoWorker');
      setupMonacoEnvironment();
      this.monaco = monaco;
    }
  }
  
  /**
   * Extract type information from code using Monaco Editor's TypeScript service
   */
  static async extractTypes(code: string): Promise<Map<string, ExtractedType>> {
    await this.initialize();
    if (!this.monaco) throw new Error('Monaco not initialized');
    
    const types = new Map<string, ExtractedType>();
    const monaco = this.monaco;
    
    // Create a temporary model for analysis
    // Don't add 'export {}' as it causes Variable Redeclaration Error
    const uri = monaco.Uri.parse(`inmemory://type-extraction/${Date.now()}.ts`);
    const model = monaco.editor.createModel(code, 'typescript', uri);
    
    try {
      // Get TypeScript worker
      const worker = await monaco.languages.typescript.getTypeScriptWorker();
      const client = await worker(model.uri);
      
      // Get emit output to extract type declarations
      const emitOutput = await client.getEmitOutput(model.uri.toString());
      
      // Parse the code to find symbols
      const symbols = await this.extractSymbolsWithTypes(code, client, model);
      
      // Process each symbol
      for (const [name, extractedType] of symbols) {
        types.set(name, extractedType);
      }
      
      // Also process emit output for more accurate type information
      if (emitOutput.outputFiles && emitOutput.outputFiles.length > 0) {
        const dtsFile = emitOutput.outputFiles.find(f => f.name.endsWith('.d.ts'));
        if (dtsFile) {
          const additionalTypes = this.extractTypesFromDTS(dtsFile.text);
          for (const [name, type] of additionalTypes) {
            if (!types.has(name)) {
              types.set(name, type);
            }
          }
        }
      }
      
    } finally {
      model.dispose();
    }
    
    return types;
  }
  
  /**
   * Extract symbols with their types from the code
   */
  private static async extractSymbolsWithTypes(
    code: string,
    client: any,
    model: import('monaco-editor').editor.ITextModel
  ): Promise<Map<string, ExtractedType>> {
    const symbols = new Map<string, ExtractedType>();
    
    // Use regex to find all symbols in the code
    
    // Extract symbols using regex patterns
    const patterns = [
      /(?:const|let|var)\s+(\w+)(?:\s*:\s*([^=;]+))?/g,
      /function\s+(\w+)\s*\([^)]*\)(?:\s*:\s*([^{]+))?/g,
      /interface\s+(\w+)\s*{([^}]+)}/g,
      /type\s+(\w+)\s*=\s*([^;]+);/g
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const name = match[1];
        if (name && !symbols.has(name)) {
          const position = model.getPositionAt(match.index);
          const offset = model.getOffsetAt({
            lineNumber: position.lineNumber,
            column: position.column + match[0].indexOf(name) + name.length
          });
          
          try {
            const quickInfo = await client.getQuickInfoAtPosition(
              model.uri.toString(),
              offset
            );
            
            if (quickInfo?.displayParts) {
              const extractedType = this.extractTypeFromQuickInfo(quickInfo.displayParts);
              if (extractedType) {
                symbols.set(name, extractedType);
              }
            }
          } catch {
            // Ignore errors for individual symbols
          }
        }
      }
    }
    
    return symbols;
  }
  
  /**
   * Extract type from QuickInfo display parts
   */
  private static extractTypeFromQuickInfo(displayParts: any[]): ExtractedType | null {
    const text = displayParts
      .map((part: any) => part.text)
      .join('')
      .trim()
      // Remove overload notation (e.g., "(+1 overload)" or "(+2 overloads)")
      .replace(/\s*\(\+\d+\s+overloads?\)/g, '');
    
    // Check for type alias or interface names
    let aliasName: string | undefined;
    let typeStr: string = text;
    
    // Pattern for const/let/var declarations with inferred literal types
    // Example: "const userName: \"Alice\""
    const literalPattern = /(?:const|let|var)\s+\w+:\s+(["'][^"']*["']|\d+|true|false)$/;
    const literalMatch = text.match(literalPattern);
    
    if (literalMatch && literalMatch[1]) {
      // This is a literal type from const declaration
      typeStr = literalMatch[1];
    } else {
      // Pattern 1: const/let/var with explicit type annotation: "const user: User"
      const varPattern = /(?:const|let|var)\s+\w+\s*:\s*([\w<>\[\]]+)(?:\s|$)/;
      const varMatch = text.match(varPattern);
      if (varMatch && varMatch[1]) {
        // Check if it's a simple type name (not generic or array)
        const typeName = varMatch[1];
        if (/^[A-Z][\w]*$/.test(typeName)) {
          aliasName = typeName;
        }
        typeStr = varMatch[1];
      } else {
        // Pattern 2: Full type definition extraction
        const patterns = [
          /(?:const|let|var)\s+\w+\s*:\s*([\s\S]+)/,
          /function\s+\w+(\([^)]*\)(?:\s*:\s*[\s\S]+)?)/,
          /(?:interface|type)\s+\w+\s*([\s\S]+)/
        ];
        
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            typeStr = match[1].trim();
            break;
          }
        }
      }
    }
    
    const structure = this.parseTypeStructure(typeStr);
    return {
      raw: typeStr,
      normalized: this.normalizeType(typeStr),
      structure,
      ...(aliasName && { aliasName })
    };
  }
  
  /**
   * Extract types from .d.ts output
   */
  private static extractTypesFromDTS(dtsContent: string): Map<string, ExtractedType> {
    const types = new Map<string, ExtractedType>();
    
    // Parse declare statements
    const declarePattern = /declare\s+(?:const|let|var|function)\s+(\w+)\s*:\s*([^;]+);/g;
    let match;
    
    while ((match = declarePattern.exec(dtsContent)) !== null) {
      const name = match[1];
      const typeStr = match[2];
      if (name && typeStr) {
        const structure = this.parseTypeStructure(typeStr.trim());
        types.set(name, {
          raw: typeStr.trim(),
          normalized: this.normalizeType(typeStr.trim()),
          structure
        });
      }
    }
    
    return types;
  }
  
  /**
   * Parse a type string into a structured representation
   */
  static parseTypeStructure(typeStr: string): TypeStructure {
    const trimmed = typeStr.trim();
    
    // Primitive types
    if (['string', 'number', 'boolean', 'any', 'unknown', 'void', 'null', 'undefined', 'never'].includes(trimmed)) {
      return { kind: 'primitive', base: trimmed };
    }
    
    // Literal types
    // Handle escaped quotes too (e.g., \"Alice\" from Monaco QuickInfo)
    const literalStringPattern = /^(\\"|\\')(.*)(\\"|\\')$|^["'].*["']$/;
    if (literalStringPattern.test(trimmed) || /^\d+$/.test(trimmed) || /^true|false$/.test(trimmed)) {
      // Remove quotes (both regular and escaped)
      const value = trimmed
        .replace(/^(\\"|\\')/, '')
        .replace(/(\\"|\\')$/, '')
        .replace(/^["']|["']$/g, '');
      return { 
        kind: 'literal', 
        value
      };
    }
    
    // Array types
    if (trimmed.endsWith('[]')) {
      const elementType = trimmed.slice(0, -2);
      return {
        kind: 'array',
        elementType: this.parseTypeStructure(elementType)
      };
    }
    
    // Array<T> syntax
    if (trimmed.startsWith('Array<') && trimmed.endsWith('>')) {
      const elementType = trimmed.slice(6, -1);
      return {
        kind: 'array',
        elementType: this.parseTypeStructure(elementType)
      };
    }
    
    // Tuple types
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const elements = this.splitTypeList(trimmed.slice(1, -1));
      return {
        kind: 'tuple',
        types: elements.map(e => this.parseTypeStructure(e))
      };
    }
    
    // Function types
    if (trimmed.includes('=>')) {
      const arrowIndex = trimmed.indexOf('=>');
      const params = trimmed.slice(0, arrowIndex).trim();
      const returnType = trimmed.slice(arrowIndex + 2).trim();
      
      // Parse parameters
      const parameters: TypeStructure[] = [];
      if (params.startsWith('(') && params.endsWith(')')) {
        const paramList = this.splitTypeList(params.slice(1, -1));
        for (const param of paramList) {
          const colonIndex = param.indexOf(':');
          if (colonIndex > 0) {
            parameters.push(this.parseTypeStructure(param.slice(colonIndex + 1).trim()));
          }
        }
      }
      
      return {
        kind: 'function',
        parameters,
        returnType: this.parseTypeStructure(returnType)
      };
    }
    
    // Object types
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const properties = new Map<string, TypeStructure>();
      const content = trimmed.slice(1, -1).trim();
      
      if (content) {
        const props = this.splitObjectProperties(content);
        for (const prop of props) {
          const colonIndex = prop.indexOf(':');
          if (colonIndex > 0) {
            const propName = prop.slice(0, colonIndex).trim().replace(/[?'"]/g, '');
            const propType = prop.slice(colonIndex + 1).trim();
            properties.set(propName, this.parseTypeStructure(propType));
          }
        }
      }
      
      return {
        kind: 'object',
        properties
      };
    }
    
    // Union types
    if (trimmed.includes('|')) {
      const types = this.splitUnionTypes(trimmed);
      if (types.length > 1) {
        return {
          kind: 'union',
          types: types.map(t => this.parseTypeStructure(t))
        };
      }
    }
    
    // Intersection types
    if (trimmed.includes('&')) {
      const types = trimmed.split('&').map(t => t.trim());
      if (types.length > 1) {
        return {
          kind: 'intersection',
          types: types.map(t => this.parseTypeStructure(t))
        };
      }
    }
    
    // Generic types
    if (trimmed.includes('<') && trimmed.endsWith('>')) {
      const openIndex = trimmed.indexOf('<');
      const base = trimmed.slice(0, openIndex);
      const typeParams = trimmed.slice(openIndex + 1, -1);
      const params = this.splitTypeList(typeParams);
      
      return {
        kind: 'generic',
        base,
        parameters: params.map(p => this.parseTypeStructure(p))
      };
    }
    
    // Default: treat as primitive or type reference
    return { kind: 'primitive', base: trimmed };
  }
  
  /**
   * Split a type list (handling nested structures)
   */
  private static splitTypeList(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && str[i - 1] !== '\\') {
        inString = false;
      }
      
      if (!inString) {
        if (char === '(' || char === '[' || char === '{' || char === '<') {
          depth++;
        } else if (char === ')' || char === ']' || char === '}' || char === '>') {
          depth--;
        } else if (char === ',' && depth === 0) {
          result.push(current.trim());
          current = '';
          continue;
        }
      }
      
      current += char;
    }
    
    if (current.trim()) {
      result.push(current.trim());
    }
    
    return result;
  }
  
  /**
   * Split object properties (handling nested objects)
   */
  private static splitObjectProperties(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      if (char === '{' || char === '[' || char === '(') {
        depth++;
      } else if (char === '}' || char === ']' || char === ')') {
        depth--;
      } else if ((char === ',' || char === ';') && depth === 0) {
        if (current.trim()) {
          result.push(current.trim());
        }
        current = '';
        continue;
      }
      
      current += char;
    }
    
    if (current.trim()) {
      result.push(current.trim());
    }
    
    return result;
  }
  
  /**
   * Split union types (handling nested structures)
   */
  private static splitUnionTypes(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      if (char === '(' || char === '[' || char === '{' || char === '<') {
        depth++;
      } else if (char === ')' || char === ']' || char === '}' || char === '>') {
        depth--;
      } else if (char === '|' && depth === 0) {
        if (current.trim()) {
          result.push(current.trim());
        }
        current = '';
        continue;
      }
      
      current += char;
    }
    
    if (current.trim()) {
      result.push(current.trim());
    }
    
    return result;
  }
  
  /**
   * Normalize a type string for comparison
   */
  private static normalizeType(type: string): string {
    let normalized = type
      .replace(/\s+/g, ' ')
      .replace(/\s*([:|,;(){}[\]<>])\s*/g, '$1')
      .replace(/;/g, ',')
      // Remove overload notation (e.g., "(+1 overload)" or "(+2 overloads)")
      .replace(/\s*\(\+\d+\s+overloads?\)/g, '')
      .trim();
    
    // Normalize function syntax - handle both formats
    // Convert (params): returnType to (params) => returnType
    normalized = normalized.replace(/(\([^)]*\)):\s*([^,}]+)/g, '$1 => $2');
    
    // Also ensure arrow functions are in consistent format
    // Convert (params)=>returnType to (params) => returnType (add spaces)
    normalized = normalized.replace(/(\([^)]*\))=>\s*/g, '$1 => ');
    
    // Remove 'function' keyword prefix
    normalized = normalized.replace(/^function\s+/, '');
    
    // Remove trailing commas
    normalized = normalized.replace(/,(\s*[}\]])/g, '$1');
    
    return normalized;
  }
  
  /**
   * Compare two types with various comparison modes
   */
  static compareTypes(
    expected: ExtractedType,
    actual: ExtractedType,
    mode: ComparisonMode = 'structural'
  ): ComparisonResult {
    switch (mode) {
      case 'exact':
        return this.compareExact(expected, actual);
      case 'structural':
        return this.compareStructural(expected, actual);
      case 'assignable':
        return this.compareAssignable(expected, actual);
      case 'type-alias':
        return this.compareTypeAlias(expected, actual);
      default:
        return { matches: false, mode, details: '不明な比較モードです' };
    }
  }
  
  /**
   * Type alias comparison (checks alias names first, then falls back to structural)
   */
  private static compareTypeAlias(expected: ExtractedType, actual: ExtractedType): ComparisonResult {
    // First, check if actual has an alias name that matches the expected type
    if (actual.aliasName) {
      // Compare the alias name with the expected raw type
      if (actual.aliasName === expected.raw || actual.aliasName === expected.aliasName) {
        return {
          matches: true,
          mode: 'type-alias',
          details: `Type alias '${actual.aliasName}' matches`
        };
      }
    }
    
    // If expected is a type alias like "Partial<User>", try to match it
    if (expected.raw.includes('<') && actual.raw.includes('<')) {
      // Extract the base types and compare
      const expectedBase = expected.raw.split('<')[0];
      const actualBase = actual.raw.split('<')[0];
      if (expectedBase === actualBase) {
        // For utility types, do structural comparison
        return this.compareStructural(expected, actual);
      }
    }
    
    // Fall back to structural comparison
    const structuralResult = this.compareStructural(expected, actual);
    return {
      ...structuralResult,
      mode: 'type-alias',
      details: structuralResult.matches 
        ? '型は構造的に等価です（エイリアス名は一致しませんでした）'
        : `期待される型エイリアス: '${expected.raw}' 実際: '${actual.aliasName || actual.raw}'`
    };
  }
  
  /**
   * Exact string comparison (with normalization)
   */
  private static compareExact(expected: ExtractedType, actual: ExtractedType): ComparisonResult {
    const matches = expected.normalized === actual.normalized;
    return {
      matches,
      mode: 'exact',
      details: matches ? '型が完全に一致します' : `期待値: "${expected.normalized}" 実際: "${actual.normalized}"`
    };
  }
  
  /**
   * Structural comparison (property order doesn't matter)
   */
  private static compareStructural(expected: ExtractedType, actual: ExtractedType): ComparisonResult {
    if (!expected.structure || !actual.structure) {
      // Fallback to normalized comparison
      return this.compareExact(expected, actual);
    }
    
    const differences: TypeDifference[] = [];
    const matches = this.compareStructures(expected.structure, actual.structure, '', differences);
    
    const result: ComparisonResult = {
      matches,
      mode: 'structural',
      details: matches ? '型は構造的に等価です' : '型が構造的に異なります',
      ...(differences.length > 0 && { differences })
    };
    
    return result;
  }
  
  /**
   * Compare two type structures recursively
   */
  private static compareStructures(
    expected: TypeStructure,
    actual: TypeStructure,
    path: string,
    differences: TypeDifference[]
  ): boolean {
    // Different kinds of types
    if (expected.kind !== actual.kind) {
      // No special cases for structural comparison - types must match exactly
      // Special cases for literal types are only in isAssignable method
      differences.push({
        path,
        expected: expected.kind,
        actual: actual.kind,
        reason: '型の種類が一致しません'
      });
      return false;
    }
    
    // Compare based on kind
    switch (expected.kind) {
      case 'primitive':
        if (expected.base !== actual.base) {
          // Special case: any matches everything
          if (expected.base === 'any' || actual.base === 'any') {
            return true;
          }
          differences.push({
            path,
            expected: expected.base || '',
            actual: actual.base || '',
            reason: 'プリミティブ型が一致しません'
          });
          return false;
        }
        return true;
      
      case 'literal':
        if (expected.value !== actual.value) {
          differences.push({
            path,
            expected: String(expected.value),
            actual: String(actual.value),
            reason: 'リテラル値が一致しません'
          });
          return false;
        }
        return true;
      
      case 'array':
        if (!expected.elementType || !actual.elementType) {
          return false;
        }
        return this.compareStructures(
          expected.elementType,
          actual.elementType,
          `${path}[]`,
          differences
        );
      
      case 'tuple':
        if (!expected.types || !actual.types) {
          return false;
        }
        if (expected.types.length !== actual.types.length) {
          differences.push({
            path,
            expected: `tuple of length ${expected.types.length}`,
            actual: `tuple of length ${actual.types.length}`,
            reason: 'タプルの長さが一致しません'
          });
          return false;
        }
        for (let i = 0; i < expected.types.length; i++) {
          if (!this.compareStructures(
            expected.types[i]!,
            actual.types[i]!,
            `${path}[${i}]`,
            differences
          )) {
            return false;
          }
        }
        return true;
      
      case 'object':
        if (!expected.properties || !actual.properties) {
          return false;
        }
        
        // Check all expected properties exist in actual
        for (const [key, expectedProp] of expected.properties) {
          const actualProp = actual.properties.get(key);
          if (!actualProp) {
            differences.push({
              path: `${path}.${key}`,
              expected: 'property exists',
              actual: 'property missing',
              reason: `プロパティ "${key}" が不足しています`
            });
            return false;
          }
          if (!this.compareStructures(expectedProp, actualProp, `${path}.${key}`, differences)) {
            return false;
          }
        }
        
        // Check for extra properties in actual (for exact match)
        for (const [key] of actual.properties) {
          if (!expected.properties.has(key)) {
            differences.push({
              path: `${path}.${key}`,
              expected: 'no property',
              actual: 'property exists',
              reason: `予期しないプロパティ "${key}" があります`
            });
            // Note: This might be acceptable in structural typing
            // For now, we'll allow extra properties
          }
        }
        
        return differences.length === 0 || 
               differences.every(d => d.reason.startsWith('Unexpected property'));
      
      case 'function':
        // Compare parameters
        if (expected.parameters && actual.parameters) {
          if (expected.parameters.length !== actual.parameters.length) {
            differences.push({
              path: `${path}(params)`,
              expected: `${expected.parameters.length} parameters`,
              actual: `${actual.parameters.length} parameters`,
              reason: '引数の数が一致しません'
            });
            return false;
          }
          for (let i = 0; i < expected.parameters.length; i++) {
            if (!this.compareStructures(
              expected.parameters[i]!,
              actual.parameters[i]!,
              `${path}(param${i})`,
              differences
            )) {
              return false;
            }
          }
        }
        
        // Compare return type
        if (expected.returnType && actual.returnType) {
          return this.compareStructures(
            expected.returnType,
            actual.returnType,
            `${path}(return)`,
            differences
          );
        }
        
        return true;
      
      case 'union':
        // For union types, actual must match at least one of the expected types
        if (!expected.types || !actual.types) {
          return false;
        }
        
        // Check if actual union is subset of expected union
        for (const actualType of actual.types) {
          let matchFound = false;
          for (const expectedType of expected.types) {
            const tempDiffs: TypeDifference[] = [];
            if (this.compareStructures(expectedType, actualType, path, tempDiffs)) {
              matchFound = true;
              break;
            }
          }
          if (!matchFound) {
            differences.push({
              path,
              expected: 'union member match',
              actual: 'no match',
              reason: 'Union型のメンバーが期待される型と一致しません'
            });
            return false;
          }
        }
        return true;
      
      case 'intersection':
        // For intersection types, actual must match all expected types
        if (!expected.types || !actual.types) {
          return false;
        }
        
        for (const expectedType of expected.types) {
          let matchFound = false;
          for (const actualType of actual.types) {
            const tempDiffs: TypeDifference[] = [];
            if (this.compareStructures(expectedType, actualType, path, tempDiffs)) {
              matchFound = true;
              break;
            }
          }
          if (!matchFound) {
            differences.push({
              path,
              expected: 'intersection member',
              actual: 'missing',
              reason: 'Intersection型に必要な型が不足しています'
            });
            return false;
          }
        }
        return true;
      
      case 'generic':
        // Compare base and parameters
        if (expected.base !== actual.base) {
          differences.push({
            path,
            expected: expected.base || '',
            actual: actual.base || '',
            reason: 'ジェネリックの基本型が一致しません'
          });
          return false;
        }
        
        if (expected.parameters && actual.parameters) {
          if (expected.parameters.length !== actual.parameters.length) {
            differences.push({
              path,
              expected: `${expected.parameters.length} type parameters`,
              actual: `${actual.parameters.length} type parameters`,
              reason: '型パラメータの数が一致しません'
            });
            return false;
          }
          
          for (let i = 0; i < expected.parameters.length; i++) {
            if (!this.compareStructures(
              expected.parameters[i]!,
              actual.parameters[i]!,
              `${path}<${i}>`,
              differences
            )) {
              return false;
            }
          }
        }
        
        return true;
      
      default:
        return false;
    }
  }
  
  /**
   * Assignability comparison (structural subtyping)
   */
  private static compareAssignable(expected: ExtractedType, actual: ExtractedType): ComparisonResult {
    if (!expected.structure || !actual.structure) {
      return this.compareExact(expected, actual);
    }
    
    const differences: TypeDifference[] = [];
    const matches = this.isAssignable(actual.structure, expected.structure, '', differences);
    
    const result: ComparisonResult = {
      matches,
      mode: 'assignable',
      details: matches ? '型は代入可能です' : '型は代入できません',
      ...(differences.length > 0 && { differences })
    };
    
    return result;
  }
  
  /**
   * Check if actual type is assignable to expected type
   */
  private static isAssignable(
    actual: TypeStructure,
    expected: TypeStructure,
    path: string,
    differences: TypeDifference[]
  ): boolean {
    // Any is assignable to and from anything
    if (expected.kind === 'primitive' && expected.base === 'any') {
      return true;
    }
    if (actual.kind === 'primitive' && actual.base === 'any') {
      return true;
    }
    
    // Unknown is assignable from anything but not to anything (except any and unknown)
    if (expected.kind === 'primitive' && expected.base === 'unknown') {
      return true;
    }
    
    // Literals are assignable to their base types
    if (actual.kind === 'literal' && expected.kind === 'primitive') {
      const literalType = typeof actual.value === 'string' ? 'string' :
                         typeof actual.value === 'number' ? 'number' :
                         typeof actual.value === 'boolean' ? 'boolean' : '';
      return literalType === expected.base;
    }
    
    // For objects, actual must have at least all properties of expected
    if (expected.kind === 'object' && actual.kind === 'object') {
      if (!expected.properties || !actual.properties) {
        return false;
      }
      
      // Check all expected properties exist in actual and are assignable
      for (const [key, expectedProp] of expected.properties) {
        const actualProp = actual.properties.get(key);
        if (!actualProp) {
          differences.push({
            path: `${path}.${key}`,
            expected: 'property exists',
            actual: 'property missing',
            reason: `Required property "${key}" is missing`
          });
          return false;
        }
        if (!this.isAssignable(actualProp, expectedProp, `${path}.${key}`, differences)) {
          return false;
        }
      }
      
      // Extra properties in actual are allowed (structural subtyping)
      return true;
    }
    
    // Otherwise use structural comparison
    return this.compareStructures(expected, actual, path, differences);
  }
  
  /**
   * Validate type assertions with enhanced comparison
   */
  static async validateAssertions(
    code: string,
    assertions: EnhancedTypeAssertion[]
  ): Promise<{
    passed: boolean;
    results: Array<{
      assertion: EnhancedTypeAssertion;
      result: ComparisonResult;
      actualType?: string;
    }>;
  }> {
    const extractedTypes = await this.extractTypes(code);
    const results: Array<{
      assertion: EnhancedTypeAssertion;
      result: ComparisonResult;
      actualType?: string;
    }> = [];
    
    for (const assertion of assertions) {
      const actualType = extractedTypes.get(assertion.symbol);
      
      if (!actualType) {
        results.push({
          assertion,
          result: {
            matches: false,
            mode: assertion.comparisonMode || 'structural',
            details: `シンボル "${assertion.symbol}" がコード内に見つかりません`
          }
        });
        continue;
      }
      
      const expectedType: ExtractedType = {
        raw: assertion.expectedType,
        normalized: this.normalizeType(assertion.expectedType),
        structure: this.parseTypeStructure(assertion.expectedType)
      };
      
      const result = this.compareTypes(
        expectedType,
        actualType,
        assertion.comparisonMode || 'structural'
      );
      
      results.push({
        assertion,
        result,
        actualType: actualType.raw
      });
    }
    
    const passed = results.every(r => r.result.matches);
    return { passed, results };
  }
}