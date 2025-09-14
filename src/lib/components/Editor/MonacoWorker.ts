// Monaco EditorのWebWorker設定
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

export function setupMonacoEnvironment(): void {
  // WebWorkerの設定
  if (typeof window !== 'undefined') {
    (window as any).MonacoEnvironment = {
      getWorker: function (_: any, label: string) {
        if (label === 'typescript' || label === 'javascript') {
          return new TsWorker();
        }
        return new EditorWorker();
      }
    };
  }
}

export { monaco };