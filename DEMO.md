# 🚀 デモ・クイックスタート

すぐに scrapbox-ai-assistant を試すためのデモ用データとセットアップ手順です。

## 📦 含まれるサンプルデータ

### 1. 単一ファイル版（`data/sample-export.json`）
- **6ページ** のサンプルScrapboxデータ
- プログラミング、書籍レビュー、技術ノートを含む
- タグ付けとページ間リンクの例

### 2. 分割ファイル版（`data/parts-sample/`）
- **6ページ** を3つのファイルに分割
- 大容量データ処理の動作確認用
- パート情報付きの分割メタデータ

## ⚡ クイックスタート

### 1. サンプルデータでのテスト

```bash
# リポジトリをクローン
git clone <repository-url>
cd scrapbox-ai-assistant

# 依存関係のインストール
npm install

# ビルド
npm run build

# サンプル設定をコピー
cp scrapbox-config.example.json scrapbox-config.json
```

### 2. サーバーの起動

```bash
# サーバー起動
npm start
```

サーバーが正常に起動すると以下のようなログが表示されます：

```
Loading project demo-knowledge-base from export data
Loading project demo-split-project from 3 split files
Loading 3 export files for project demo-split-project...
Loading part 1/3: ./data/parts-sample/demo-part1.json
  Added 2 pages (total: 2)
Loading part 2/3: ./data/parts-sample/demo-part2.json
  Added 2 pages (total: 4)
Loading part 3/3: ./data/parts-sample/demo-part3.json
  Added 2 pages (total: 6)
Merged total: 6 pages
Calculating backlinks...
Building indexes...
Loaded project demo-split-project from split files
Scrapbox MCP Server started
```

### 3. Claude Code での使用

Claude Code で以下のようなクエリを試すことができます：

#### MCP Resources の確認
```
scrapbox://projects で利用可能なプロジェクトを確認
```

#### ページ検索
```
search_pages を使って "programming" で検索
```

#### 既読タグの分析
```  
search_pages で #既読 タグを検索
```

## 📊 サンプルデータの内容

### テーマ
- **プログラミング**: TypeScript, Node.js, Clean Code
- **機械学習**: AI概要、アルゴリズム設計パターン
- **書籍レビュー**: The Pragmatic Programmer, Effective Java
- **システム設計**: データベース設計、システム設計基礎

### タグ例
- `#programming`, `#typescript`, `#javascript`
- `#book`, `#既読` (読了マーク)
- `#machine-learning`, `#artificial-intelligence`
- `#system-design`, `#database`

### ページ間リンク例
- `[TypeScript]` → `[JavaScript]` → `[Node.js]`
- `[Clean Code]` → `[The Pragmatic Programmer]`
- `[Database Design]` → `[System Design]`

## 🔧 設定のカスタマイズ

### 実際のデータを使用する場合

1. **Scrapboxからデータをエクスポート**
   - Scrapbox の「設定」→「ページデータ」→「ページをエクスポート」

2. **設定ファイルを更新**
   ```json
   {
     "projects": [
       {
         "name": "your-project",
         "exportDataPath": "./data/your-export.json",
         "description": "あなたのScrapboxプロジェクト"
       }
     ]
   }
   ```

3. **大容量データの場合は分割**
   ```bash
   # 15個のファイルに分割
   node scripts/split-json.js ./data/your-export.json ./data/parts 15
   ```

## 🛡️ プライバシー保護

- サンプルデータは架空の内容で、実際の個人情報は含まれていません
- あなたの実際のScrapboxデータは `.gitignore` により保護されます
- デモ後は必要に応じてサンプルデータを削除できます

## 🎯 次のステップ

1. **実データでのテスト**: 自分のScrapboxデータでの動作確認
2. **MCP機能の探索**: Resources, Tools, Promptsの詳細テスト
3. **カスタマイズ**: 独自の分析機能やプロンプトの追加
4. **パフォーマンス調整**: 大容量データでの最適化

## 📞 サポート

- **Issues**: バグ報告や機能要望
- **Discussions**: 使用方法の質問や共有
- **Wiki**: 詳細なドキュメント

---

**注意**: このデモは開発・テスト目的です。実際の利用では必ずプライバシー設定を確認してください。