import type { EditorMarker } from '$types/editor';

/**
 * Monaco Editor のヘルパー関数群
 */
export class MonacoHelper {
  /**
   * 現在のエディタモデルから診断情報を取得
   */
  static async getDiagnosticsForModel(
    monaco: typeof import('monaco-editor'),
    model: import('monaco-editor').editor.ITextModel
  ): Promise<EditorMarker[]> {
    const markers: EditorMarker[] = [];
    
    try {
      // Monaco の組み込みマーカーを使用
      const monacoMarkers = monaco.editor.getModelMarkers({ resource: model.uri });
      
      monacoMarkers.forEach(marker => {
        const editorMarker: EditorMarker = {
          severity: getSeverity(marker.severity),
          startLineNumber: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLineNumber: marker.endLineNumber,
          endColumn: marker.endColumn,
          message: marker.message,
          source: marker.source || 'TypeScript',
        };
        
        if (marker.code) {
          editorMarker.code = typeof marker.code === 'object' 
            ? marker.code.value 
            : marker.code.toString();
        }
        
        markers.push(editorMarker);
      });
    } catch (error) {
      console.error('Failed to get diagnostics:', error);
    }
    
    return markers;
  }
  
  /**
   * エディタにマーカーを設定
   */
  static setModelMarkers(
    monaco: typeof import('monaco-editor'),
    model: import('monaco-editor').editor.ITextModel,
    owner: string,
    markers: EditorMarker[]
  ): void {
    const monacoMarkers = markers.map(marker => {
      const monacoMarker: import('monaco-editor').editor.IMarkerData = {
        severity: getMonacoSeverity(monaco, marker.severity),
        startLineNumber: marker.startLineNumber,
        startColumn: marker.startColumn,
        endLineNumber: marker.endLineNumber,
        endColumn: marker.endColumn,
        message: marker.message,
        source: marker.source,
      };
      
      if (marker.code) {
        monacoMarker.code = marker.code;
      }
      
      return monacoMarker;
    });
    
    monaco.editor.setModelMarkers(model, owner, monacoMarkers);
  }
}

function getSeverity(monacoSeverity: number): EditorMarker['severity'] {
  switch (monacoSeverity) {
    case 8: // Error
      return 'error';
    case 4: // Warning
      return 'warning';
    case 2: // Info
      return 'info';
    case 1: // Hint
      return 'hint';
    default:
      return 'info';
  }
}

function getMonacoSeverity(
  monaco: typeof import('monaco-editor'),
  severity: EditorMarker['severity']
): number {
  switch (severity) {
    case 'error':
      return monaco.MarkerSeverity.Error;
    case 'warning':
      return monaco.MarkerSeverity.Warning;
    case 'info':
      return monaco.MarkerSeverity.Info;
    case 'hint':
      return monaco.MarkerSeverity.Hint;
    default:
      return monaco.MarkerSeverity.Info;
  }
}