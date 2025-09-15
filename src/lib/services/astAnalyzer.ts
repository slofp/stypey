import type { TypeAssertion, TypeAssertionKind } from '$types/problem';

/**
 * 型推論結果
 */
export interface TypeInferenceResult {
  readonly symbols: Map<string, SymbolInfo>;
  readonly errors: ReadonlyArray<string>;
}

/**
 * シンボル情報
 */
export interface SymbolInfo {
  readonly name: string;
  readonly type: string;
  readonly kind: TypeAssertionKind;
  readonly position?: {
    readonly line: number;
    readonly column: number;
  };
}

/**
 * 検証結果
 */
export interface ValidationResult {
  readonly passed: boolean;
  readonly results: ReadonlyArray<AssertionResult>;
}

/**
 * 個別の検証結果
 */
export interface AssertionResult {
  readonly assertion: TypeAssertion;
  readonly actualType: string | null;
  readonly passed: boolean;
  readonly message: string;
}

/**
 * AST解析とTypeScript型推論を行うサービス
 */
export class ASTAnalyzer {
  private static monaco: typeof import('monaco-editor') | null = null;
  
  /**
   * 初期化
   */
  static async initialize(): Promise<void> {
    if (!this.monaco) {
      const { setupMonacoEnvironment, monaco } = await import('$lib/components/Editor/MonacoWorker');
      setupMonacoEnvironment();
      this.monaco = monaco;
    }
  }
  
  /**
   * コードを解析して型推論情報を取得
   */
  static async analyzeCode(code: string): Promise<TypeInferenceResult> {
    await this.initialize();
    
    if (!this.monaco) {
      return {
        symbols: new Map(),
        errors: ['Monaco Editor not initialized'],
      };
    }
    
    const monaco = this.monaco;
    const symbols = new Map<string, SymbolInfo>();
    const errors: string[] = [];
    
    try {
      // 一時的なモデルを作成
      const uri = monaco.Uri.file(`/ast-analysis-${Date.now()}.ts`);
      const model = monaco.editor.createModel(code, 'typescript', uri);
      
      // TypeScript Workerを取得
      const worker = await monaco.languages.typescript.getTypeScriptWorker();
      const client = await worker(model.uri);
      
      // コード内のシンボルを解析
      await this.extractSymbols(code, client, model, symbols);
      
      // モデルを破棄
      model.dispose();
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error during AST analysis');
    }
    
    return { symbols, errors };
  }
  
  /**
   * シンボル情報を抽出
   */
  private static async extractSymbols(
    code: string,
    client: any,
    model: import('monaco-editor').editor.ITextModel,
    symbols: Map<string, SymbolInfo>
  ): Promise<void> {
    // 変数宣言を検出
    const variablePattern = /(?:const|let|var)\s+(\w+)(?:\s*:\s*([^=;]+))?/g;
    let match;
    
    while ((match = variablePattern.exec(code)) !== null) {
      const varName = match[1];
      if (!varName) continue;
      
      const position = model.getPositionAt(match.index);
      
      try {
        // QuickInfoで型情報を取得
        const quickInfo = await client.getQuickInfoAtPosition(
          model.uri.toString(),
          model.getOffsetAt({
            lineNumber: position.lineNumber,
            column: position.column + match[0].indexOf(varName) + varName.length
          })
        );
        
        if (quickInfo?.displayParts) {
          const typeInfo = this.extractTypeFromQuickInfo(quickInfo.displayParts);
          symbols.set(varName, {
            name: varName,
            type: typeInfo,
            kind: 'variable',
            position: {
              line: position.lineNumber,
              column: position.column,
            },
          });
        }
      } catch {
        // エラーは無視
      }
    }
    
    // 関数宣言を検出
    const functionPattern = /function\s+(\w+)\s*\([^)]*\)(?:\s*:\s*([^{]+))?/g;
    while ((match = functionPattern.exec(code)) !== null) {
      const funcName = match[1];
      if (!funcName) continue;
      
      const position = model.getPositionAt(match.index);
      
      try {
        const quickInfo = await client.getQuickInfoAtPosition(
          model.uri.toString(),
          model.getOffsetAt({
            lineNumber: position.lineNumber,
            column: position.column + match[0].indexOf(funcName) + funcName.length
          })
        );
        
        if (quickInfo?.displayParts) {
          const typeInfo = this.extractTypeFromQuickInfo(quickInfo.displayParts);
          symbols.set(funcName, {
            name: funcName,
            type: typeInfo,
            kind: 'function',
            position: {
              line: position.lineNumber,
              column: position.column,
            },
          });
        }
      } catch {
        // エラーは無視
      }
    }
  }
  
  /**
   * QuickInfo から型情報を抽出
   */
  private static extractTypeFromQuickInfo(displayParts: any[]): string {
    const text = displayParts
      .map((part: any) => part.text)
      .join('')
      .trim();
    
    // "const varName: " や "let varName: " などのプレフィックスを削除
    const match = text.match(/(?:const|let|var|function)\s+\w+\s*:\s*(.+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // 関数の場合
    const funcMatch = text.match(/function\s+\w+(\([^)]*\)(?:\s*:\s*.+)?)/);
    if (funcMatch && funcMatch[1]) {
      return funcMatch[1].trim();
    }
    
    return text;
  }
  
  /**
   * 型推論要件を検証
   */
  static validateTypeAssertions(
    inferenceResult: TypeInferenceResult,
    assertions: ReadonlyArray<TypeAssertion>
  ): ValidationResult {
    const results: AssertionResult[] = [];
    
    for (const assertion of assertions) {
      const symbolInfo = inferenceResult.symbols.get(assertion.symbol);
      
      if (!symbolInfo) {
        results.push({
          assertion,
          actualType: null,
          passed: false,
          message: `シンボル '${assertion.symbol}' が見つかりません`,
        });
        continue;
      }
      
      // 型の正規化（スペースや改行を統一）
      const expectedType = this.normalizeType(assertion.expectedType);
      const actualType = this.normalizeType(symbolInfo.type);
      
      const passed = expectedType === actualType;
      
      results.push({
        assertion,
        actualType: symbolInfo.type,
        passed,
        message: passed
          ? `✅ ${assertion.symbol}: 正しい型です`
          : `❌ ${assertion.symbol}: 期待される型は '${assertion.expectedType}' ですが、実際は '${symbolInfo.type}' です`,
      });
    }
    
    const passed = results.every(r => r.passed);
    return { passed, results };
  }
  
  /**
   * 型文字列を正規化
   */
  private static normalizeType(type: string): string {
    return type
      .replace(/\s+/g, ' ')
      .replace(/\s*([:|,;(){}[\]])\s*/g, '$1')
      .trim();
  }
}