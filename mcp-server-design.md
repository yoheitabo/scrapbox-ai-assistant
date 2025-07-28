# Scrapbox MCP Server 設計書

## 概要
Scrapbox の知識・創作・内省データを Model Context Protocol (MCP) を通じて Claude に提供するサーバの設計。

## アーキテクチャ

### 基本構成
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Claude Code   │◄──►│  MCP Server      │◄──►│  Scrapbox API   │
│                 │    │  (TypeScript)    │    │  / JSON Export  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 主要コンポーネント

#### 1. ScrapboxMCPServer
- McpServer を継承したメインクラス
- Scrapbox プロジェクトへの接続管理
- リソース・ツール・プロンプトの登録

#### 2. ScrapboxClient
- Scrapbox API へのインターフェース
- プロジェクトデータの取得・キャッシュ
- レート制限の管理

#### 3. DataProcessor
- Scrapbox JSON データの解析・正規化
- タグ・リンク・引用の抽出
- 検索インデックスの構築

## MCP リソース設計

### Resources (データ露出)

#### 1. `scrapbox://projects`
- 利用可能なプロジェクト一覧
- プロジェクト名、説明、更新日時

#### 2. `scrapbox://projects/{project}/pages`  
- プロジェクト内の全ページ一覧
- ページタイトル、作成日、更新日、サマリー

#### 3. `scrapbox://projects/{project}/pages/{page}`
- 個別ページの完全なコンテンツ
- テキスト、タグ、リンク、メタデータ

#### 4. `scrapbox://projects/{project}/tags`
- プロジェクト内のタグ一覧
- 使用頻度、関連ページ数

#### 5. `scrapbox://projects/{project}/search?q={query}`
- 検索結果
- 関連度順でソート済み

## MCP ツール設計

### Tools (アクション実行)

#### 1. `search_pages`
- **目的**: 複数プロジェクトを横断した知的検索
- **入力**: クエリ、プロジェクト指定、フィルタ条件
- **出力**: 関連ページ、コンテキスト、類似度スコア

#### 2. `analyze_connections` 
- **目的**: ページ間の関連性・ネットワーク分析
- **入力**: 起点ページ、深度、関連タイプ
- **出力**: 関連グラフ、強い結びつき、未発見の接続

#### 3. `extract_themes`
- **目的**: テーマ・モチーフの抽出
- **入力**: 期間、タグフィルタ
- **出力**: 主要テーマ、頻出語、変遷パターン

#### 4. `suggest_tags`
- **目的**: 新しいタグの提案
- **入力**: ページコンテンツまたはテーマ
- **出力**: 推奨タグ、理由、既存タグとの関係

#### 5. `find_inspirations`
- **目的**: 創作・思考のインスピレーション発見
- **入力**: 現在の関心、創作ジャンル
- **出力**: 関連断片、未探索の接続、新しい視点

## MCP プロンプト設計

### Prompts (対話テンプレート)

#### 1. `literary_analysis`
- **目的**: 文学的分析・批評支援
- **引数**: ページ/テキスト、分析視点
- **テンプレート**: 批評理論を適用した分析フレームワーク

#### 2. `creative_continuation`
- **目的**: 創作の続き・発展支援  
- **引数**: 創作断片、ジャンル、方向性
- **テンプレート**: 文体・テーマを継承した創作支援

#### 3. `knowledge_synthesis`
- **目的**: 知識の統合・体系化
- **引数**: 関連ページ群、統合視点
- **テンプレート**: 散在する知識を体系的に整理

#### 4. `reflection_dialogue`
- **目的**: 内省・自己対話の促進
- **引数**: 日記・思考メモ、期間
- **テンプレート**: 過去の自分との対話形式

## データ構造

### ScrapboxPage
```typescript
interface ScrapboxPage {
  id: string;
  title: string;
  lines: string[];
  created: number;
  updated: number;
  tags: string[];
  links: string[];
  backlinks: string[];
  metadata: {
    wordCount: number;
    linkCount: number;
    creativeType?: 'poetry' | 'essay' | 'criticism' | 'note';
  };
}
```

### ScrapboxProject
```typescript
interface ScrapboxProject {
  name: string;
  displayName: string;
  description?: string;
  pages: ScrapboxPage[];
  tagIndex: Map<string, string[]>;
  linkGraph: Map<string, string[]>;
  lastUpdated: number;
}
```

## 実装フェーズ

### Phase 1: 基本インフラ
1. MCP Server の骨格実装
2. Scrapbox API クライアント
3. 基本的なリソース露出

### Phase 2: 検索・分析機能
1. 全文検索の実装
2. ページ関連性分析
3. タグ・テーマ抽出

### Phase 3: 高度な AI 支援機能
1. 創作支援プロンプト
2. 知識統合ツール
3. 内省・対話支援

### Phase 4: 最適化・拡張
1. パフォーマンス改善
2. リアルタイム更新
3. 追加分析機能

## 技術スタック
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5+
- **MCP SDK**: @modelcontextprotocol/sdk
- **HTTP Client**: axios または fetch
- **Caching**: node-cache
- **Search**: Fuse.js (ファジー検索)
- **Build**: tsc + esbuild