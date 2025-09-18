/**
 * TypeScript Virtual File System based type checker
 * Uses @typescript/vfs for browser-based type checking
 */

import {
  createSystem,
  createVirtualTypeScriptEnvironment
} from '@typescript/vfs';
import type { VirtualTypeScriptEnvironment } from '@typescript/vfs';
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

export class VirtualTypeChecker {
  private static env: VirtualTypeScriptEnvironment | null = null;
  private static isInitialized = false;
  
  /**
   * Initialize virtual TypeScript environment
   */
  private static async ensureInitialized(): Promise<void> {
    if (this.isInitialized && this.env) return;
    
    console.log('Initializing Virtual TypeScript Environment...');
    
    try {
      // Create file system map manually
      const fsMap = new Map<string, string>();
      
      // List of essential TypeScript lib files
      const libFiles = [
        'lib.d.ts',
        'lib.es5.d.ts',
        'lib.es2015.d.ts',
        'lib.es2015.core.d.ts',
        'lib.es2015.collection.d.ts',
        'lib.es2015.generator.d.ts',
        'lib.es2015.iterable.d.ts',
        'lib.es2015.promise.d.ts',
        'lib.es2015.proxy.d.ts',
        'lib.es2015.reflect.d.ts',
        'lib.es2015.symbol.d.ts',
        'lib.es2015.symbol.wellknown.d.ts',
        'lib.es2016.d.ts',
        'lib.es2016.array.include.d.ts',
        'lib.es2017.d.ts',
        'lib.es2017.object.d.ts',
        'lib.es2017.sharedmemory.d.ts',
        'lib.es2017.string.d.ts',
        'lib.es2017.intl.d.ts',
        'lib.es2017.typedarrays.d.ts',
        'lib.es2018.d.ts',
        'lib.es2018.asyncgenerator.d.ts',
        'lib.es2018.asynciterable.d.ts',
        'lib.es2018.intl.d.ts',
        'lib.es2018.promise.d.ts',
        'lib.es2018.regexp.d.ts',
        'lib.es2019.d.ts',
        'lib.es2019.array.d.ts',
        'lib.es2019.object.d.ts',
        'lib.es2019.string.d.ts',
        'lib.es2019.symbol.d.ts',
        'lib.es2019.intl.d.ts',
        'lib.es2020.d.ts',
        'lib.es2020.bigint.d.ts',
        'lib.es2020.date.d.ts',
        'lib.es2020.promise.d.ts',
        'lib.es2020.sharedmemory.d.ts',
        'lib.es2020.string.d.ts',
        'lib.es2020.symbol.wellknown.d.ts',
        'lib.es2020.intl.d.ts',
        'lib.es2020.number.d.ts',
        'lib.es2020.full.d.ts',
        'lib.dom.d.ts',
        'lib.dom.iterable.d.ts',
        'lib.webworker.importscripts.d.ts',
        'lib.scripthost.d.ts',
        'lib.decorators.d.ts',
        'lib.decorators.legacy.d.ts'
      ];
      
      // Fetch lib files from jsdelivr CDN
      console.log('Loading TypeScript lib files from CDN...');
      let loadedCount = 0;
      
      // Try to load from localStorage first
      const cacheKey = 'ts-lib-files-5.6.3';
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          parsedCache.forEach((entry: { key: string; value: string }) => {
            fsMap.set(`/${entry.key}`, entry.value);
          });
          console.log(`Loaded ${fsMap.size} TypeScript lib files from cache`);
        } catch {
          // Cache corrupted, will re-fetch
        }
      }
      
      // If not fully cached, fetch from CDN
      if (fsMap.size < 5) {  // At minimum we need a few core lib files
        const fetchPromises = libFiles.map(async (file) => {
          try {
            const url = `https://cdn.jsdelivr.net/npm/typescript@5.6.3/lib/${file}`;
            const response = await fetch(url);
            
            if (response.ok) {
              const content = await response.text();
              fsMap.set(`/${file}`, content);
              loadedCount++;
              return { key: file, value: content };
            }
          } catch (error) {
            // Silently ignore individual file fetch failures
            console.debug(`Failed to load ${file}:`, error);
          }
          return null;
        });
        
        const results = await Promise.all(fetchPromises);
        const validResults = results.filter(r => r !== null);
        
        console.log(`Loaded ${loadedCount} TypeScript lib files from CDN`);
        
        // Cache for next time
        if (validResults.length > 0) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(validResults));
          } catch {
            // localStorage might be full, ignore
          }
        }
      }
      
      // Add a valid main file to the map
      fsMap.set('main.ts', 'export {}; // TypeScript module placeholder');
      
      // Create the virtual file system
      const system = createSystem(fsMap);
      
      // Compiler options
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        jsx: ts.JsxEmit.None,
      };
      
      // Create the virtual environment
      this.env = createVirtualTypeScriptEnvironment(
        system,
        ['main.ts'],
        ts,
        compilerOptions
      );
      
      this.isInitialized = true;
      console.log('Virtual TypeScript Environment initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Virtual TypeScript Environment:', error);
      throw error;
    }
  }
  
  /**
   * Check syntax errors using virtual environment
   */
  static async checkSyntax(code: string): Promise<SyntaxCheckResult> {
    await this.ensureInitialized();
    if (!this.env) throw new Error('Virtual environment not initialized');
    
    // Update the main file with new code
    this.env.updateFile('main.ts', code);
    
    // Get syntax diagnostics
    const syntacticDiagnostics = this.env.languageService.getSyntacticDiagnostics('main.ts');
    
    const errors: SyntaxError[] = syntacticDiagnostics.map(diagnostic => {
      const start = diagnostic.start || 0;
      const sourceFile = this.env!.getSourceFile('main.ts');
      if (!sourceFile) {
        return {
          line: 1,
          column: 1,
          message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
          code: diagnostic.code
        };
      }
      
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
      return {
        line: line + 1,
        column: character + 1,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        code: diagnostic.code
      };
    });
    
    return {
      errors,
      isValid: errors.length === 0
    };
  }
  
  /**
   * Extract types from TypeScript code using virtual environment
   */
  static async extractTypes(code: string): Promise<Map<string, InferredType>> {
    await this.ensureInitialized();
    if (!this.env) throw new Error('Virtual environment not initialized');
    
    const types = new Map<string, InferredType>();
    
    // Update the main file with new code
    this.env.updateFile('main.ts', code);
    
    // Get the program and type checker
    const program = this.env.languageService.getProgram();
    if (!program) {
      console.warn('Could not get program from language service');
      return types;
    }
    
    const typeChecker = program.getTypeChecker();
    const sourceFile = program.getSourceFile('main.ts');
    
    if (!sourceFile) {
      console.warn('Could not get source file');
      return types;
    }
    
    // Walk the AST and extract types
    this.visitNode(sourceFile, typeChecker, types);
    
    return types;
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
   * Compare two types
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
  
  /**
   * Get semantic diagnostics (type errors)
   */
  static async getSemanticDiagnostics(code: string): Promise<ts.Diagnostic[]> {
    await this.ensureInitialized();
    if (!this.env) throw new Error('Virtual environment not initialized');
    
    // Update the main file with new code
    this.env.updateFile('main.ts', code);
    
    // Get semantic diagnostics
    return this.env.languageService.getSemanticDiagnostics('main.ts');
  }
}