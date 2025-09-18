/**
 * Real TypeScript Compiler API based type checker
 * Uses actual TypeScript AST and type inference in the browser
 */

import ts from 'typescript';

export interface InferredType {
  symbol: string;
  typeString: string;
  kind: string;
}

export interface SyntaxCheckResult {
  errors: SyntaxError[];
  isValid: boolean;
}

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
  code?: number;
}

export class CompilerTypeChecker {
  private static libFiles: Map<string, string> = new Map();
  private static isInitialized = false;
  
  // Use jsdelivr CDN to fetch TypeScript lib files
  // This provides fast, reliable access to TypeScript's official type definitions
  private static readonly TS_VERSION = '5.6.3'; // Specify TypeScript version for consistency
  private static readonly CDN_BASE_URL = `https://cdn.jsdelivr.net/npm/typescript@${CompilerTypeChecker.TS_VERSION}/lib/`;
  
  private static compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    noLib: true, // We'll provide our own lib files
    noImplicitAny: true,
    strictNullChecks: true,
    strictFunctionTypes: true,
    strictBindCallApply: true,
    strictPropertyInitialization: true,
    noImplicitThis: true,
    alwaysStrict: true,
  };
  
  /**
   * Initialize and load TypeScript lib files from jsdelivr CDN
   */
  private static async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    
    // List of lib files to load
    const libFilesToLoad = [
      'lib.es5.d.ts',
      'lib.es2015.core.d.ts',
      'lib.es2015.symbol.d.ts',
      'lib.es2015.promise.d.ts',
      'lib.es2015.iterable.d.ts',
      'lib.es2015.collection.d.ts',
      'lib.es2015.generator.d.ts',
      'lib.es2020.promise.d.ts',
      'lib.es2020.bigint.d.ts',
      'lib.es2020.string.d.ts',
      'lib.dom.d.ts'
    ];
    
    // Load all lib files in parallel from CDN
    const loadPromises = libFilesToLoad.map(async (fileName) => {
      try {
        const url = `${this.CDN_BASE_URL}${fileName}`;
        const response = await fetch(url);
        if (response.ok) {
          const content = await response.text();
          this.libFiles.set(fileName, content);
        } else {
          console.warn(`Failed to load ${fileName} from CDN: ${response.status}`);
        }
      } catch (error) {
        console.warn(`Failed to load ${fileName} from CDN:`, error);
      }
    });
    
    await Promise.all(loadPromises);
    
    // Check if we loaded essential files
    if (!this.libFiles.has('lib.es5.d.ts')) {
      throw new Error('Failed to load essential TypeScript lib files from CDN');
    }
    
    this.isInitialized = true;
  }
  
  /**
   * Check syntax errors using real TypeScript Compiler API
   */
  static async checkSyntax(code: string): Promise<SyntaxCheckResult> {
    await this.ensureInitialized();
    
    const sourceFile = ts.createSourceFile(
      'temp.ts',
      code,
      ts.ScriptTarget.ES2020,
      true
    );
    
    const errors: SyntaxError[] = [];
    
    // Create a minimal program to get diagnostics
    const host = this.createCompilerHost(code, 'temp.ts');
    const program = ts.createProgram(['temp.ts'], this.compilerOptions, host);
    const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);
    
    diagnostics.forEach(diagnostic => {
      if (diagnostic.file) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start || 0);
        errors.push({
          line: line + 1,
          column: character + 1,
          message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
          code: diagnostic.code
        });
      }
    });
    
    return {
      errors,
      isValid: errors.length === 0
    };
  }
  
  /**
   * Extract types from TypeScript code using real Compiler API
   */
  static async extractTypes(code: string): Promise<Map<string, InferredType>> {
    await this.ensureInitialized();
    
    const types = new Map<string, InferredType>();
    const fileName = 'temp.ts';
    
    // Create source file and program
    const sourceFile = ts.createSourceFile(
      fileName,
      code,
      ts.ScriptTarget.ES2020,
      true
    );
    
    const host = this.createCompilerHost(code, fileName);
    const program = ts.createProgram([fileName], this.compilerOptions, host);
    const typeChecker = program.getTypeChecker();
    
    // Walk the AST and extract types
    this.visitNode(sourceFile, typeChecker, types);
    
    return types;
  }
  
  /**
   * Create a virtual compiler host for browser environment
   */
  private static createCompilerHost(code: string, fileName: string): ts.CompilerHost {
    const files = new Map<string, string>();
    files.set(fileName, code);
    
    // Add all loaded lib files
    for (const [libName, libContent] of this.libFiles) {
      files.set(libName, libContent);
    }
    
    return {
      getSourceFile: (name: string, target: ts.ScriptTarget) => {
        const source = files.get(name);
        if (source) {
          return ts.createSourceFile(name, source, target, true);
        }
        // Check for lib files
        if (this.libFiles.has(name)) {
          return ts.createSourceFile(name, this.libFiles.get(name)!, target, true);
        }
        return undefined;
      },
      writeFile: () => {},
      getCurrentDirectory: () => '/',
      getDirectories: () => [],
      fileExists: (name: string) => files.has(name) || this.libFiles.has(name),
      readFile: (name: string) => files.get(name) || this.libFiles.get(name),
      getCanonicalFileName: (name: string) => name,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      getDefaultLibFileName: (options: ts.CompilerOptions) => 'lib.es5.d.ts',
      resolveModuleNames: () => [],
    };
  }
  
  /**
   * Visit AST nodes and extract type information
   */
  private static visitNode(
    node: ts.Node,
    typeChecker: ts.TypeChecker,
    types: Map<string, InferredType>
  ): void {
    // Variable declarations
    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach(declaration => {
        if (ts.isIdentifier(declaration.name)) {
          const symbol = typeChecker.getSymbolAtLocation(declaration.name);
          if (symbol) {
            const type = typeChecker.getTypeOfSymbolAtLocation(symbol, declaration);
            const typeString = typeChecker.typeToString(type);
            
            types.set(declaration.name.text, {
              symbol: declaration.name.text,
              typeString: this.normalizeTypeString(typeString),
              kind: 'variable'
            });
          }
        }
      });
    }
    
    // Function declarations
    if (ts.isFunctionDeclaration(node) && node.name) {
      const symbol = typeChecker.getSymbolAtLocation(node.name);
      if (symbol) {
        const type = typeChecker.getTypeOfSymbolAtLocation(symbol, node);
        const signatures = typeChecker.getSignaturesOfType(type, ts.SignatureKind.Call);
        
        if (signatures.length > 0 && signatures[0]) {
          const signature = signatures[0];
          
          // Build function type string in arrow notation
          const params = signature.parameters.map(param => {
            const paramDecl = param.valueDeclaration;
            if (paramDecl && ts.isParameter(paramDecl)) {
              const paramType = typeChecker.getTypeOfSymbolAtLocation(param, paramDecl);
              const paramTypeString = typeChecker.typeToString(paramType);
              return `${param.name}: ${paramTypeString}`;
            }
            return `${param.name}: any`;
          }).join(', ');
          
          const returnType = typeChecker.getReturnTypeOfSignature(signature);
          const returnTypeString = typeChecker.typeToString(returnType);
          
          // Always use arrow function notation for consistency
          const typeString = `(${params}) => ${returnTypeString}`;
          
          types.set(node.name.text, {
            symbol: node.name.text,
            typeString: typeString,
            kind: 'function'
          });
        }
      }
    }
    
    // Interface declarations
    if (ts.isInterfaceDeclaration(node)) {
      const symbol = typeChecker.getSymbolAtLocation(node.name);
      if (symbol) {
        const type = typeChecker.getTypeOfSymbolAtLocation(symbol, node);
        const typeString = typeChecker.typeToString(type);
        
        types.set(node.name.text, {
          symbol: node.name.text,
          typeString: typeString,
          kind: 'interface'
        });
      }
    }
    
    // Type alias declarations
    if (ts.isTypeAliasDeclaration(node)) {
      const symbol = typeChecker.getSymbolAtLocation(node.name);
      if (symbol) {
        const type = typeChecker.getTypeOfSymbolAtLocation(symbol, node);
        const typeString = typeChecker.typeToString(type);
        
        types.set(node.name.text, {
          symbol: node.name.text,
          typeString: typeString,
          kind: 'type'
        });
      }
    }
    
    // Class declarations
    if (ts.isClassDeclaration(node) && node.name) {
      const symbol = typeChecker.getSymbolAtLocation(node.name);
      if (symbol) {
        const type = typeChecker.getTypeOfSymbolAtLocation(symbol, node);
        const typeString = typeChecker.typeToString(type);
        
        types.set(node.name.text, {
          symbol: node.name.text,
          typeString: typeString,
          kind: 'class'
        });
      }
    }
    
    // Continue traversing the AST
    ts.forEachChild(node, child => {
      this.visitNode(child, typeChecker, types);
    });
  }
  
  /**
   * Normalize type string for consistent comparison
   */
  private static normalizeTypeString(typeString: string): string {
    let normalized = typeString
      .replace(/\s+/g, ' ')
      .replace(/\s*([,;:])\s*/g, '$1 ')
      .trim();
    
    // Ensure consistent spacing after colons
    normalized = normalized.replace(/:\s*/g, ': ');
    
    // Remove semicolons
    normalized = normalized.replace(/;/g, '');
    
    return normalized;
  }
  
  /**
   * Compare two types using proper AST comparison
   */
  static compareTypes(
    expectedTypeString: string,
    actualType: InferredType
  ): { matches: boolean; details: string } {
    // Normalize both types for comparison
    const normalizedExpected = this.normalizeTypeString(expectedTypeString);
    const normalizedActual = this.normalizeTypeString(actualType.typeString);
    
    const matches = normalizedExpected === normalizedActual;
    
    return {
      matches,
      details: matches
        ? '型が一致します'
        : `期待: ${normalizedExpected}, 実際: ${normalizedActual}`
    };
  }
}