#!/usr/bin/env node

import { ScrapboxMCPServer } from './mcp-server.js';
import { ScrapboxConfig, ProjectConfig } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const server = new ScrapboxMCPServer();
  
  // 環境変数から設定を読み込み
  const configPath = process.env.SCRAPBOX_CONFIG_PATH || './scrapbox-config.json';
  
  try {
    // 設定ファイルが存在すれば読み込み
    if (fs.existsSync(configPath)) {
      const config: ScrapboxConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      // プロジェクトの追加
      if (config.projects) {
        for (const projectConfig of config.projects) {
          if (projectConfig.exportPaths && projectConfig.exportPaths.length > 0) {
            // 複数の分割ファイルから読み込み
            console.error(`Loading project ${projectConfig.name} from ${projectConfig.exportPaths.length} split files...`);
            await server.addProject(projectConfig.name, undefined, projectConfig.exportPaths);
            console.error(`Loaded project ${projectConfig.name} from split files`);
          } else if (projectConfig.exportDataPath) {
            // 単一エクスポートファイルから読み込み
            const exportData = JSON.parse(fs.readFileSync(projectConfig.exportDataPath, 'utf-8'));
            await server.addProject(projectConfig.name, exportData);
            console.error(`Loaded project ${projectConfig.name} from export data`);
          } else if (projectConfig.name) {
            // APIから読み込み（設定されている場合）
            try {
              await server.addProject(projectConfig.name);
              console.error(`Loaded project ${projectConfig.name} from API`);
            } catch (error) {
              console.error(`Failed to load project ${projectConfig.name} from API:`, error);
            }
          }
        }
      }
    } else {
      console.error(`Config file not found: ${configPath}`);
      console.error('Create a config file with project settings, or set SCRAPBOX_CONFIG_PATH environment variable');
      
      // デフォルト設定ファイルの例を出力
      const exampleConfig = {
        projects: [
          {
            name: 'my-project',
            exportDataPath: './data/my-project-export.json'
          },
          {
            name: 'my-split-project',
            exportPaths: [
              './data/parts/my-project-part1.json',
              './data/parts/my-project-part2.json',
              './data/parts/my-project-part3.json'
            ]
          }
        ]
      };
      
      console.error('Example config file:');
      console.error(JSON.stringify(exampleConfig, null, 2));
    }
    
    // サーバー開始
    await server.start();
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// SIGINT/SIGTERMハンドリング
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

main().catch(error => {
  console.error('Server startup failed:', error);
  process.exit(1);
});