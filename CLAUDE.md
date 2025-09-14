# TypeMaster - TypeScript型学習プラットフォーム開発記録

## プロジェクト概要

TypeScriptの型システムを実践的に学習できるWebアプリケーション「TypeMaster」の開発記録です。

### 主要な要件
- **学習形式**: 実際にTypeScriptコードを書いて、推論された型や記述内容で正答を判定
- **技術スタック**: Svelte 5, Monaco Editor, TypeScript (厳格モード), vanilla-extract, Vite
- **特徴**: any/unknown型の使用を完全に禁止した型安全な実装

## 開発タイムライン

### Phase 1: プロジェクト初期化とTypeScript設定

#### 1. SvelteKit 5プロジェクトの作成
```bash
pnpm create svelte@latest stypy  # 最初は古いコマンドで失敗
pnpx sv create stypy              # 新しいコマンドも対話式で中断
mkdir -p stypy && cd stypy && pnpm init  # 手動で初期化
```

#### 2. 依存関係の定義
- **フレームワーク**: Svelte 5, SvelteKit 2, Vite 6
- **型チェック**: TypeScript 5.9 (strict mode)
- **スタイリング**: vanilla-extract, CSS Modules
- **エディタ**: Monaco Editor
- **アイコン**: @tabler/icons-svelte → 後に絵文字に変更

#### 3. TypeScript厳格設定 (tsconfig.json)
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**重要な決定**: any型とunknown型の使用を完全に禁止し、すべての値に明確な型を付ける方針を採用。

### Phase 2: プロジェクト構造の構築

#### ディレクトリ構造
```
stypy/
├── src/
│   ├── lib/
│   │   ├── components/  # UIコンポーネント
│   │   ├── styles/      # デザインシステム
│   │   ├── services/    # ビジネスロジック
│   │   ├── stores/      # 状態管理 (Svelte 5 Runes)
│   │   └── types/       # 型定義
│   └── routes/          # ページコンポーネント
└── problems/            # 問題定義ファイル
```

### Phase 3: 型定義ファイルの作成

#### 主要な型定義
1. **problem.ts**: 問題定義、難易度、テスト結果の型
2. **editor.ts**: Monaco Editor設定、カーソル位置、マーカーの型
3. **theme.ts**: テーマシステム、カラーパレットの型
4. **storage.ts**: LocalStorage管理、進捗データの型

#### 型ガード関数の実装
```typescript
export function isProblemDefinition(value: unknown): value is ProblemDefinition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  const obj = value as Record<string, unknown>;
  
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['title'] === 'string' &&
    isDifficultyLevel(obj['difficulty']) &&
    // ...
  );
}
```

**注意点**: `noUncheckedIndexedAccess`により、オブジェクトプロパティへのアクセスは `obj['key']` 形式を使用。

### Phase 4: デザインシステムの実装

#### スタイリング戦略の変更
**当初**: Tailwind CSS → **最終**: vanilla-extract + CSS Modules

**理由**: Tailwind CSSをアンチパターンと判断し、より保守性の高いCSS-in-JS方式を採用。

#### vanilla-extractによるデザイントークン
```typescript
export const vars = createGlobalTheme(':root', {
  color: {
    primary: { /* カラースケール */ },
    semantic: { success, error, warning, info }
  },
  spacing: { xs, sm, md, lg, xl },
  typography: { fontFamily, fontSize, fontWeight }
});
```

#### テーマシステム
- CSS変数によるライト/ダークテーマ切り替え
- `prefers-color-scheme`対応
- LocalStorageでの設定永続化

### Phase 5: Svelte 5 Runesによる状態管理

#### ストアの実装
1. **theme.svelte.ts**: テーマ管理
2. **editor.svelte.ts**: エディタ設定管理
3. **progress.svelte.ts**: 学習進捗管理

```typescript
class ThemeStore {
  private theme = $state<Theme>('light');
  
  get current(): Theme {
    return this.theme;
  }
  
  toggle(): void {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
  }
}
```

### Phase 6: Monaco Editor統合の課題と解決

#### 問題1: SSRエラー
**エラー**: `Failed to resolve entry for package "monaco-editor"`

**原因**: Monaco EditorはブラウザのみでDOMに依存するため、SSRでは動作しない。

**解決策**:
1. 動的インポートの使用
2. `browser` 環境チェック
3. Vite設定でSSR除外

```typescript
// クライアントサイドでのみ読み込み
if (browser && !MonacoEditor) {
  import('$components/Editor/MonacoEditor.svelte').then((module) => {
    MonacoEditor = module.default;
  });
}
```

#### 問題2: parentNodeエラー
**エラー**: `Cannot read properties of undefined (reading 'parentNode')`

**原因**: DOM要素が存在する前にMonaco Editorを初期化しようとした。

**解決策**: Svelteの`use:action`ディレクティブを使用
```typescript
function initializeEditor(node: HTMLDivElement) {
  editorContainer = node;  // DOM要素が確実に存在
  setupEditor();
  
  return {
    destroy() { /* クリーンアップ */ }
  };
}
```

```svelte
<div use:initializeEditor class="monaco-editor-container"></div>
```

### Phase 7: アイコンライブラリの問題

#### @tabler/icons-svelteのインポートエラー
**問題**: パスが変更されており、正しいインポートパスの特定が困難。

**解決策**: 絵文字による代替
```typescript
const IconSettings = '⚙️';
const IconSun = '☀️';
const IconMoon = '🌙';
```

### Phase 8: パッケージ名の変更
**問題**: package.jsonのnameフィールドが自動的に`stypey`に変更された。

**影響**: 特になし（プライベートパッケージのため）

## 技術的な学び

### 1. TypeScript厳格モードの徹底
- `any`/`unknown`を使わない実装は可能
- 型ガード関数による安全な型の絞り込み
- `exactOptionalPropertyTypes`による厳密なオプショナルプロパティ

### 2. Svelte 5 Runesの活用
- `$state()`による反応的な状態管理
- `$derived()`による計算値
- `$effect()`による副作用の処理
- クラスベースのストアパターン

### 3. Monaco EditorのSSR対策
- 動的インポートは必須
- DOM要素の存在確認が重要
- WebWorkerの設定が必要

### 4. vanilla-extractの利点
- 型安全なCSS-in-JS
- ゼロランタイム
- デザイントークンの一元管理

## 今後の課題

### 残りのタスク
1. **基本UIコンポーネント**: Button, Card, Badgeの実装
2. **問題定義システム**: TOML形式での問題管理
3. **型チェックエンジン**: TypeScript Compiler APIの統合

### 改善点
1. **パフォーマンス**: Monaco Editorの初期化速度改善
2. **アクセシビリティ**: キーボードナビゲーション強化
3. **テスト**: 単体テスト・E2Eテストの追加

## コマンドリファレンス

```bash
# 開発サーバー起動
pnpm run dev --host

# 型チェック
pnpm run check

# ビルド
pnpm run build

# プレビュー
pnpm run preview
```

## 注意事項

1. **型の安全性**: どんな理由があってもany/unknown型は使用しない
2. **SSR互換性**: ブラウザ依存のコードは必ず動的インポートまたはbrowserチェック
3. **エラーハンドリング**: ユーザーフレンドリーなエラーメッセージとリカバリー方法の提供

## 成果

✅ **完全に型安全なTypeScript実装**
✅ **Monaco Editorの統合成功**
✅ **テーマシステムの実装**
✅ **Svelte 5 Runesの活用**
✅ **モダンCSS（vanilla-extract）の採用**

## 次回の作業時の注意点

1. Monaco Editorは必ずクライアントサイドで初期化
2. 型定義は先に作成してから実装
3. CSS変数でテーマを管理（Tailwindは使わない）
4. Svelte 5のRunesを積極的に活用
5. エラーは具体的なメッセージと解決方法を提示

---

最終更新: 2024年のプロジェクト初期構築完了時点