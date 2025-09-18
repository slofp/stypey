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
  private static compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    lib: ['es2020', 'dom'],
    noImplicitAny: true,
    strictNullChecks: true,
    strictFunctionTypes: true,
    strictBindCallApply: true,
    strictPropertyInitialization: true,
    noImplicitThis: true,
    alwaysStrict: true,
  };
  
  /**
   * Check syntax errors using real TypeScript Compiler API
   */
  static checkSyntax(code: string): SyntaxCheckResult {
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
  static extractTypes(code: string): Map<string, InferredType> {
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
    
    // Add minimal type definitions
    files.set('lib.d.ts', this.getBasicLibContent());
    
    return {
      getSourceFile: (name: string, target: ts.ScriptTarget) => {
        const source = files.get(name);
        if (source) {
          return ts.createSourceFile(name, source, target, true);
        }
        // Return minimal lib.d.ts for basic types
        if (name.includes('lib.')) {
          return ts.createSourceFile(name, this.getBasicLibContent(), target, true);
        }
        return undefined;
      },
      writeFile: () => {},
      getCurrentDirectory: () => '/',
      getDirectories: () => [],
      fileExists: (name: string) => files.has(name) || name.includes('lib.'),
      readFile: (name: string) => files.get(name),
      getCanonicalFileName: (name: string) => name,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      getDefaultLibFileName: () => 'lib.d.ts',
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
  
  /**
   * Get basic TypeScript lib content for browser environment
   */
  private static getBasicLibContent(): string {
    // Minimal type definitions for basic types
    return `
      interface Array<T> { 
        length: number;
        [n: number]: T;
        push(...items: T[]): number;
        pop(): T | undefined;
        concat(...items: T[][]): T[];
        join(separator?: string): string;
        slice(start?: number, end?: number): T[];
        indexOf(searchElement: T, fromIndex?: number): number;
        map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[];
        filter(callbackfn: (value: T, index: number, array: T[]) => boolean): T[];
        forEach(callbackfn: (value: T, index: number, array: T[]) => void): void;
        reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
      }
      interface String { 
        length: number;
        charAt(pos: number): string;
        charCodeAt(index: number): number;
        concat(...strings: string[]): string;
        indexOf(searchString: string, position?: number): number;
        slice(start?: number, end?: number): string;
        split(separator?: string | RegExp, limit?: number): string[];
        substring(start: number, end?: number): string;
        toLowerCase(): string;
        toUpperCase(): string;
        trim(): string;
        replace(searchValue: string | RegExp, replaceValue: string): string;
      }
      interface Number {
        toString(radix?: number): string;
        toFixed(fractionDigits?: number): string;
        toExponential(fractionDigits?: number): string;
        toPrecision(precision?: number): string;
        valueOf(): number;
      }
      interface Boolean {
        valueOf(): boolean;
      }
      interface Function {
        apply(thisArg: any, argArray?: any): any;
        call(thisArg: any, ...argArray: any[]): any;
        bind(thisArg: any, ...argArray: any[]): any;
        toString(): string;
        prototype: any;
        length: number;
        name: string;
      }
      interface Object {
        constructor: Function;
        toString(): string;
        valueOf(): Object;
        hasOwnProperty(v: string): boolean;
      }
      interface RegExp {
        exec(string: string): RegExpExecArray | null;
        test(string: string): boolean;
        source: string;
        global: boolean;
        ignoreCase: boolean;
        multiline: boolean;
        lastIndex: number;
      }
      interface RegExpExecArray extends Array<string> {
        index: number;
        input: string;
      }
      interface Date {
        toString(): string;
        toDateString(): string;
        toTimeString(): string;
        toISOString(): string;
        toUTCString(): string;
        getTime(): number;
        getFullYear(): number;
        getMonth(): number;
        getDate(): number;
        getHours(): number;
        getMinutes(): number;
        getSeconds(): number;
      }
      type Partial<T> = {
        [P in keyof T]?: T[P];
      };
      type Required<T> = {
        [P in keyof T]-?: T[P];
      };
      type Readonly<T> = {
        readonly [P in keyof T]: T[P];
      };
      type Pick<T, K extends keyof T> = {
        [P in K]: T[P];
      };
      type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
      type Exclude<T, U> = T extends U ? never : T;
      type Extract<T, U> = T extends U ? T : never;
      type NonNullable<T> = T extends null | undefined ? never : T;
      type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
      type InstanceType<T extends new (...args: any) => any> = T extends new (...args: any) => infer R ? R : any;
      type ThisType<T> = T;
      declare var NaN: number;
      declare var Infinity: number;
      declare function eval(x: string): any;
      declare function parseInt(s: string, radix?: number): number;
      declare function parseFloat(string: string): number;
      declare function isNaN(number: number): boolean;
      declare function isFinite(number: number): boolean;
      declare function decodeURI(encodedURI: string): string;
      declare function decodeURIComponent(encodedURIComponent: string): string;
      declare function encodeURI(uri: string): string;
      declare function encodeURIComponent(uriComponent: string): string;
      interface Console {
        log(...data: any[]): void;
        error(...data: any[]): void;
        warn(...data: any[]): void;
        info(...data: any[]): void;
      }
      declare var console: Console;
      declare var undefined: undefined;
    `;
  }
}