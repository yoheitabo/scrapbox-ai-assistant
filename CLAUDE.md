# scrapbox-ai-assistant

Claude Code と Scrapbox ナレッジベースを接続する MCP（Model Context Protocol）サーバー。

## 開発

```bash
npm install
npm run dev      # tsx で直接実行
npm run build    # TypeScript コンパイル
npm run check    # Biome でlint + format チェック
npm run format   # Biome でフォーマット自動修正
```

## 技術スタック

- TypeScript (CommonJS, ES2022)
- @modelcontextprotocol/sdk
- axios (HTTP クライアント)
- Biome (lint/format)
- lefthook (pre-commit フック)

## 設定

`scrapbox-config.example.json` を参考に `scrapbox-config.json` を作成する。
MCP の設定は `.mcp.json` を参照。

## コード規約

- Biome の設定に従う（`biome.json`）
- コミット前に `npm run check` が自動実行される
