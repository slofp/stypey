import type { EditorMarker } from '$types/editor';

export interface TypeCheckResult {
  errors: TypeCheckError[];
  warnings: TypeCheckWarning[];
  hints: TypeCheckHint[];
  inferredTypes: Map<string, string>;
}

export interface TypeCheckError {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  code?: string;
}

export interface TypeCheckWarning {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  code?: string;
}

export interface TypeCheckHint {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  code?: string;
}

export class TypeChecker {
  private static monaco: typeof import('monaco-editor') | null = null;
  private static modelCounter = 0;
  
  static initialize(monaco: typeof import('monaco-editor')): void {
    this.monaco = monaco;
    
    // TypeScript診断オプションの設定
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    
    // TypeScriptコンパイラオプションの設定
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      lib: ['ESNext', 'DOM', 'DOM.Iterable'],
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      allowSyntheticDefaultImports: true,
      forceConsistentCasingInFileNames: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      resolveJsonModule: true,
      isolatedModules: true, // 各ファイルを独立したモジュールとして扱う
      noImplicitAny: true,
      strictNullChecks: true,
      strictFunctionTypes: true,
      strictBindCallApply: true,
      strictPropertyInitialization: true,
      noImplicitThis: true,
      alwaysStrict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      exactOptionalPropertyTypes: true,
      noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true,
    });
  }
  
  /**
   * 全てのinmemory://typecheck/モデルを破棄
   */
  private static disposeAllTypeCheckModels(): void {
    if (!this.monaco) return;
    
    const allModels = this.monaco.editor.getModels();
    allModels.forEach(model => {
      if (model.uri.toString().startsWith('inmemory://typecheck/')) {
        model.dispose();
      }
    });
  }
  
  static async checkCode(code: string, fileName: string = 'main.ts'): Promise<TypeCheckResult> {
    // 自動初期化
    if (!this.monaco) {
      try {
        const { setupMonacoEnvironment, monaco } = await import('$lib/components/Editor/MonacoWorker');
        setupMonacoEnvironment();
        this.initialize(monaco);
      } catch (error) {
        throw new Error('Failed to initialize TypeChecker: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
    
    const result: TypeCheckResult = {
      errors: [],
      warnings: [],
      hints: [],
      inferredTypes: new Map(),
    };
    
    // this.monacoは初期化済みなのでnon-nullと保証
    const monaco = this.monaco!;
    
    try {
      // 全ての既存typecheckモデルを破棄
      this.disposeAllTypeCheckModels();
      
      // ユニークなURIを作成（inmemory://スキームを使用）
      this.modelCounter++;
      const uri = monaco.Uri.parse(`inmemory://typecheck/${this.modelCounter}-${fileName}`);
      
      // 既存のモデルがあれば破棄（念のため）
      const existingModel = monaco.editor.getModel(uri);
      if (existingModel) {
        existingModel.dispose();
      }
      
      // コードをモジュールとして扱うために export {} を追加
      const moduleCode = code + '\nexport {};';
      
      // 新しいモデルを作成
      const model = monaco.editor.createModel(moduleCode, 'typescript', uri);
      
      // TypeScript Workerから診断情報を取得
      const worker = await monaco.languages.typescript.getTypeScriptWorker();
      const client = await worker(model.uri);
      
      // セマンティック診断を取得
      const semanticDiagnostics = await client.getSemanticDiagnostics(model.uri.toString());
      
      // 構文診断を取得
      const syntacticDiagnostics = await client.getSyntacticDiagnostics(model.uri.toString());
      
      // 診断情報を処理
      [...semanticDiagnostics, ...syntacticDiagnostics].forEach(diagnostic => {
        const item = {
          line: model.getPositionAt(diagnostic.start || 0).lineNumber,
          column: model.getPositionAt(diagnostic.start || 0).column,
          endLine: model.getPositionAt((diagnostic.start || 0) + (diagnostic.length || 0)).lineNumber,
          endColumn: model.getPositionAt((diagnostic.start || 0) + (diagnostic.length || 0)).column,
          message: diagnostic.messageText as string,
          code: diagnostic.code?.toString(),
        };
        
        // カテゴリに基づいて振り分け
        switch (diagnostic.category) {
          case 1: // Error
            result.errors.push(item);
            break;
          case 0: // Warning
            result.warnings.push(item);
            break;
          case 2: // Message
          case 3: // Suggestion
            result.hints.push(item);
            break;
        }
      });
      
      // 型推論情報を取得（簡易版）
      // 実際の実装では、ASTを解析して変数の型を抽出する必要があります
      const quickInfos = await this.getTypeInferences(client, model);
      quickInfos.forEach((type, name) => {
        result.inferredTypes.set(name, type);
      });
      
      // モデルを破棄
      model.dispose();
    } catch (error) {
      console.error('Type checking failed:', error);
    }
    
    return result;
  }
  
  private static async getTypeInferences(
    client: any,
    model: import('monaco-editor').editor.ITextModel
  ): Promise<Map<string, string>> {
    const inferences = new Map<string, string>();
    
    try {
      // 簡易的な型推論情報の取得
      const text = model.getValue();
      const lines = text.split('\n');
      
      for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        const line = lines[lineNumber];
        
        // 変数宣言を検出（const, let, var）
        const varMatch = line?.match(/(?:const|let|var)\s+(\w+)/);
        if (varMatch) {
          const varName = varMatch[1] as string;
          const offset = model.getOffsetAt({ lineNumber: lineNumber + 1, column: varMatch.index! + varMatch[0].length });
          
          try {
            const quickInfo = await client.getQuickInfoAtPosition(model.uri.toString(), offset);
            if (quickInfo?.displayParts) {
              const typeInfo = quickInfo.displayParts
                .map((part: any) => part.text)
                .join('')
                .replace(/^(const|let|var)\s+\w+:\s*/, '');
              
              if (typeInfo && typeof typeInfo === 'string') {
                inferences.set(varName, typeInfo);
              }
            }
          } catch {
            // 型情報が取得できない場合は無視
          }
        }
      }
    } catch (error) {
      console.error('Failed to get type inferences:', error);
    }
    
    return inferences;
  }
  
  static toEditorMarkers(result: TypeCheckResult): EditorMarker[] {
    const markers: EditorMarker[] = [];
    
    result.errors.forEach(error => {
      const marker: EditorMarker = {
        severity: 'error',
        startLineNumber: error.line,
        startColumn: error.column,
        endLineNumber: error.endLine,
        endColumn: error.endColumn,
        message: error.message,
        source: 'TypeScript',
        ...(error.code !== undefined && { code: error.code }),
      };
      markers.push(marker);
    });
    
    result.warnings.forEach(warning => {
      const marker: EditorMarker = {
        severity: 'warning',
        startLineNumber: warning.line,
        startColumn: warning.column,
        endLineNumber: warning.endLine,
        endColumn: warning.endColumn,
        message: warning.message,
        source: 'TypeScript',
        ...(warning.code !== undefined && { code: warning.code }),
      };
      markers.push(marker);
    });
    
    result.hints.forEach(hint => {
      const marker: EditorMarker = {
        severity: 'hint',
        startLineNumber: hint.line,
        startColumn: hint.column,
        endLineNumber: hint.endLine,
        endColumn: hint.endColumn,
        message: hint.message,
        source: 'TypeScript',
        ...(hint.code !== undefined && { code: hint.code }),
      };
      markers.push(marker);
    });
    
    return markers;
  }
}