# 🤖 Scrapbox AI Assistant

**Scrapbox を Claude Code で活用するための MCP サーバ**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io/)

あなたの Scrapbox の知識・創作・内省データを Claude Code と連携させ、AI による高度な知識管理と創作支援を実現します。

## ✨ 特徴

- 🔍 **知的検索**: Scrapbox データの高度な検索・フィルタリング
- 🔗 **関連性分析**: ページ間のつながりと知識ネットワークの可視化
- 📝 **創作支援**: 文学的分析と創作継続のための AI プロンプト
- 🎯 **テーマ抽出**: 大量のデータから潜在的なパターンとテーマを発見
- 📊 **大容量対応**: 数万ページのデータも分割処理で高速化
- 🛡️ **プライバシー保護**: 個人データの安全な管理とGit除外

## 🚀 クイックスタート

### 📦 デモでの体験

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/scrapbox-ai-assistant.git
cd scrapbox-ai-assistant

# 依存関係のインストール
npm install

# ビルド
npm run build

# デモ設定をコピー
cp scrapbox-config.example.json scrapbox-config.json

# デモサーバー起動
npm start
```

詳細なデモ手順は [DEMO.md](./DEMO.md) をご覧ください。

## 🛠️ 実際のデータでのセットアップ

### 1. Scrapbox データの準備

1. Scrapbox の「設定」→「ページデータ」→「ページをエクスポート」
2. JSON ファイルをダウンロード
3. `./data/` ディレクトリに配置

### 2. 設定ファイルの作成

```bash
cp scrapbox-config.example.json scrapbox-config.json
```

設定例：
```json
{
  "projects": [
    {
      "name": "my-knowledge-base",
      "exportDataPath": "./data/my-export.json",
      "description": "私の知識ベース"
    }
  ]
}
```

### 3. 大容量データの分割（オプション）

```bash
# 15個のファイルに分割
node scripts/split-json.js ./data/my-export.json ./data/parts 15
```

## 🎯 主な機能

### MCP リソース
- `scrapbox://projects` - プロジェクト一覧
- `scrapbox://projects/{project}/pages` - ページ一覧  
- `scrapbox://projects/{project}/pages/{page}` - 個別ページ詳細
- `scrapbox://projects/{project}/tags` - タグ一覧

### MCP ツール
- `search_pages` - 高度な検索・フィルタリング
- `analyze_connections` - ページ間関連性分析
- `extract_themes` - テーマ・パターン抽出

### MCP プロンプト
- `literary_analysis` - 文学的分析支援
- `creative_continuation` - 創作継続支援
- `knowledge_synthesis` - 知識統合支援

## 🛡️ プライバシーとセキュリティ

### ⚠️ 重要な注意事項

このツールは個人的な Scrapbox データを処理します：

- **個人データファイルは絶対に Git リポジトリにコミットしないでください**
- **`.gitignore` により `data/` ディレクトリは自動的に除外されます**
- **設定ファイル `scrapbox-config.json` も Git 管理から除外されます**
- **デモ用サンプルデータは安全な架空データです**

### 保護されるファイル
```
data/                    # 個人のScrapboxデータ
scrapbox-config.json     # 個人設定
*-analysis-results.json  # 分析結果
```

## 🔧 Claude Code との連携

### MCP サーバーの設定

Claude Code の設定に以下を追加：

```json
{
  "mcpServers": {
    "scrapbox": {
      "command": "node",
      "args": ["/path/to/scrapbox-ai-assistant/dist/index.js"],
      "env": {
        "SCRAPBOX_CONFIG_PATH": "/path/to/scrapbox-config.json"
      }
    }
  }
}
```

### 使用例

#### 知識検索
```
search_pages クエリ:"創作について" プロジェクト:["my-knowledge"] タグ:["詩", "エッセイ"]
```

#### 関連性分析
```  
analyze_connections プロジェクト:"knowledge-base" ページ:"哲学について" 深度:3
```

#### テーマ抽出
```
extract_themes プロジェクト:"reading-notes" 期間:{開始:"2024-01-01", 終了:"2024-12-31"}
```

#### 文学的分析
```
@literary_analysis テキスト:"[創作断片]" 視点:"ポストモダン文学"
```

## 💻 開発とカスタマイズ

### プロジェクト構造

```
src/
├── types.ts           # 型定義
├── scrapbox-client.ts # Scrapbox API クライアント
├── mcp-server.ts      # MCP サーバ実装
└── index.ts           # エントリーポイント

scripts/
├── split-json.js      # データ分割スクリプト
└── analyze-tags.js    # タグ分析スクリプト

data/
├── sample-export.json      # デモ用サンプルデータ
└── parts-sample/          # 分割デモデータ
    ├── demo-part1.json
    ├── demo-part2.json
    └── demo-part3.json
```

### 開発モード

```bash
# 開発サーバー起動
npm run dev

# スタンドアロン実行
npm start

# ビルド
npm run build
```

### 新機能の追加

1. **型定義**: `src/types.ts` に必要な型を追加
2. **データ処理**: `src/scrapbox-client.ts` に処理ロジック実装
3. **MCP エンドポイント**: `src/mcp-server.ts` に API 追加

### カスタムプロンプトの作成

```typescript
// 新しいプロンプトの追加例
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: "custom_analysis",
      description: "カスタム分析プロンプト",
      arguments: [
        { name: "content", description: "分析対象テキスト", required: true },
        { name: "perspective", description: "分析視点", required: false }
      ]
    }
  ]
}));
```

## 🤝 コントリビューション

このプロジェクトへの貢献を歓迎します！

### 貢献方法

1. **Issue の報告**: バグ報告や機能要望
2. **Pull Request**: コード改善や新機能の追加
3. **ドキュメント**: 使用例や説明の改善
4. **フィードバック**: 使用感や改善提案

### 開発に参加する

```bash
# フォークしてクローン
git clone https://github.com/yourusername/scrapbox-ai-assistant.git
cd scrapbox-ai-assistant

# 依存関係をインストール
npm install

# 開発開始
npm run dev
```

### ガイドライン

- **プライバシー重視**: 個人データの保護を最優先
- **型安全**: TypeScript を活用した堅牢な実装
- **MCP標準準拠**: Model Context Protocol の仕様に従った実装
- **テスト**: 新機能には適切なテストを追加

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルをご覧ください。

## 🙏 謝辞

- [Scrapbox](https://scrapbox.io/) - 素晴らしい知識管理プラットフォーム
- [Claude Code](https://claude.ai/code) - AI駆動の開発環境
- [Model Context Protocol](https://modelcontextprotocol.io/) - AI統合の標準化

## 📞 サポート

- **Issues**: [GitHub Issues](https://github.com/yourusername/scrapbox-ai-assistant/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/scrapbox-ai-assistant/discussions)
- **Documentation**: [Wiki](https://github.com/yourusername/scrapbox-ai-assistant/wiki)

---

**⚠️ 注意**: このツールは個人の知識管理を支援する目的で開発されています。個人データの取り扱いには十分ご注意ください。