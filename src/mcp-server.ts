import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListResourcesRequestSchema, ReadResourceRequestSchema, ListToolsRequestSchema, CallToolRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ScrapboxClient } from './scrapbox-client.js';
import { ScrapboxPage, ScrapboxProject, SearchResult, ConnectionAnalysis, ThemeExtraction } from './types.js';

export class ScrapboxMCPServer {
  private server: Server;
  private scrapboxClient: ScrapboxClient;
  private projects: Map<string, ScrapboxProject>;

  constructor() {
    this.server = new Server(
      {
        name: 'scrapbox-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {}
        }
      }
    );
    
    this.scrapboxClient = new ScrapboxClient();
    this.projects = new Map();
    
    this.setupResources();
    this.setupTools();
    this.setupPrompts();
  }

  /**
   * MCPリソースの設定
   */
  private setupResources(): void {
    // プロジェクト一覧
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'scrapbox://projects',
          name: 'Available Scrapbox Projects',
          description: 'List of all available Scrapbox projects',
          mimeType: 'application/json'
        }
      ]
    }));

    // リソースの読み取り
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      if (uri === 'scrapbox://projects') {
        const projectList = Array.from(this.projects.keys()).map(name => ({
          name,
          displayName: this.projects.get(name)?.displayName || name,
          description: this.projects.get(name)?.description,
          lastUpdated: this.projects.get(name)?.lastUpdated,
          pageCount: this.projects.get(name)?.pages.length || 0
        }));
        
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(projectList, null, 2)
          }]
        };
      }

      // プロジェクト内ページ一覧
      const projectPagesMatch = uri.match(/^scrapbox:\/\/projects\/([^\/]+)\/pages$/);
      if (projectPagesMatch) {
        const projectName = projectPagesMatch[1];
        const project = this.projects.get(projectName);
        
        if (!project) {
          throw new Error(`Project ${projectName} not found`);
        }

        const pageList = project.pages.map(page => ({
          title: page.title,
          created: new Date(page.created * 1000).toISOString(),
          updated: new Date(page.updated * 1000).toISOString(),
          tags: page.tags,
          wordCount: page.metadata.wordCount,
          creativeType: page.metadata.creativeType
        }));

        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(pageList, null, 2)
          }]
        };
      }

      // 個別ページ
      const pageMatch = uri.match(/^scrapbox:\/\/projects\/([^\/]+)\/pages\/(.+)$/);
      if (pageMatch) {
        const projectName = pageMatch[1];
        const pageTitle = decodeURIComponent(pageMatch[2]);
        const project = this.projects.get(projectName);
        
        if (!project) {
          throw new Error(`Project ${projectName} not found`);
        }

        const page = project.pages.find(p => p.title === pageTitle);
        if (!page) {
          throw new Error(`Page ${pageTitle} not found in project ${projectName}`);
        }

        return {
          contents: [{
            uri,
            mimeType: 'text/plain',
            text: page.lines.join('\n')
          }]
        };
      }

      // タグ一覧
      const tagsMatch = uri.match(/^scrapbox:\/\/projects\/([^\/]+)\/tags$/);
      if (tagsMatch) {
        const projectName = tagsMatch[1];
        const project = this.projects.get(projectName);
        
        if (!project) {
          throw new Error(`Project ${projectName} not found`);
        }

        const tagList = Array.from(project.tagIndex.entries()).map(([tag, pages]) => ({
          tag,
          pageCount: pages.length,
          pages: pages.slice(0, 10) // 最初の10ページのみ
        }));

        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(tagList, null, 2)
          }]
        };
      }

      throw new Error(`Unknown resource URI: ${uri}`);
    });
  }

  /**
   * MCPツールの設定
   */
  private setupTools(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_pages',
          description: 'Search pages across Scrapbox projects with intelligent filtering',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              projects: { type: 'array', items: { type: 'string' }, description: 'Project names to search in' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
              creativeType: { type: 'string', enum: ['poetry', 'essay', 'criticism', 'note', 'diary'], description: 'Filter by creative type' },
              limit: { type: 'number', description: 'Maximum number of results', default: 10 }
            },
            required: ['query']
          }
        },
        {
          name: 'analyze_connections',
          description: 'Analyze connections and relationships between pages',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', description: 'Project name' },
              pageTitle: { type: 'string', description: 'Starting page title' },
              depth: { type: 'number', description: 'Connection depth to analyze', default: 2 },
              connectionTypes: { type: 'array', items: { type: 'string', enum: ['direct_link', 'tag_similarity', 'content_similarity'] } }
            },
            required: ['projectName', 'pageTitle']
          }
        },
        {
          name: 'extract_themes',
          description: 'Extract themes and patterns from pages',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', description: 'Project name' },
              dateRange: {
                type: 'object',
                properties: {
                  start: { type: 'string', format: 'date' },
                  end: { type: 'string', format: 'date' }
                }
              },
              tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
              limit: { type: 'number', description: 'Maximum number of themes', default: 10 }
            },
            required: ['projectName']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'search_pages':
          return await this.handleSearchPages(args as any);
        case 'analyze_connections':
          return await this.handleAnalyzeConnections(args as any);
        case 'extract_themes':
          return await this.handleExtractThemes(args as any);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  /**
   * MCPプロンプトの設定
   */
  private setupPrompts(): void {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'literary_analysis',
          description: 'Analyze text from a literary criticism perspective',
          arguments: [
            { name: 'text', description: 'Text to analyze', required: true },
            { name: 'perspective', description: 'Analytical perspective or theory to apply', required: false }
          ]
        },
        {
          name: 'creative_continuation',
          description: 'Continue or develop creative writing',
          arguments: [
            { name: 'fragment', description: 'Creative fragment to continue', required: true },
            { name: 'style', description: 'Desired style or direction', required: false }
          ]
        },
        {
          name: 'knowledge_synthesis',
          description: 'Synthesize knowledge from multiple sources',
          arguments: [
            { name: 'pages', description: 'Page titles to synthesize', required: true },
            { name: 'focus', description: 'Synthesis focus or theme', required: false }
          ]
        }
      ]
    }));

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'literary_analysis':
          return this.generateLiteraryAnalysisPrompt(args?.text, args?.perspective);
        case 'creative_continuation':
          return this.generateCreativeContinuationPrompt(args?.fragment, args?.style);
        case 'knowledge_synthesis':
          return this.generateKnowledgeSynthesisPrompt(args?.pages, args?.focus);
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  /**
   * ページ検索の処理
   */
  private async handleSearchPages(args: {
    query: string;
    projects?: string[];
    tags?: string[];
    creativeType?: string;
    limit?: number;
  }): Promise<any> {
    const results: SearchResult[] = [];
    const projectsToSearch = args.projects || Array.from(this.projects.keys());
    
    for (const projectName of projectsToSearch) {
      const project = this.projects.get(projectName);
      if (!project) continue;

      for (const page of project.pages) {
        // フィルタリング
        if (args.tags && !args.tags.some(tag => page.tags.includes(tag))) {
          continue;
        }
        if (args.creativeType && page.metadata.creativeType !== args.creativeType) {
          continue;
        }

        // 簡単な関連度計算
        const relevanceScore = this.calculateRelevance(page, args.query);
        if (relevanceScore > 0) {
          results.push({
            page,
            relevanceScore,
            matchedContext: this.extractMatchedContext(page, args.query)
          });
        }
      }
    }

    // スコア順にソートして制限
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const limitedResults = results.slice(0, args.limit || 10);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          query: args.query,
          totalResults: results.length,
          results: limitedResults.map(r => ({
            title: r.page.title,
            relevanceScore: r.relevanceScore,
            tags: r.page.tags,
            creativeType: r.page.metadata.creativeType,
            context: r.matchedContext.slice(0, 3), // 最初の3つのコンテキストのみ
            wordCount: r.page.metadata.wordCount
          }))
        }, null, 2)
      }]
    };
  }

  /**
   * 接続分析の処理
   */
  private async handleAnalyzeConnections(args: {
    projectName: string;
    pageTitle: string;
    depth?: number;
    connectionTypes?: string[];
  }): Promise<any> {
    const project = this.projects.get(args.projectName);
    if (!project) {
      throw new Error(`Project ${args.projectName} not found`);
    }

    const page = project.pages.find(p => p.title === args.pageTitle);
    if (!page) {
      throw new Error(`Page ${args.pageTitle} not found`);
    }

    const connections: ConnectionAnalysis[] = [];
    const depth = args.depth || 2;

    // 直接リンクの分析
    page.links.forEach(linkedTitle => {
      connections.push({
        source: page.title,
        target: linkedTitle,
        connectionType: 'direct_link',
        strength: 1.0
      });
    });

    // タグ類似性の分析
    project.pages.forEach(otherPage => {
      if (otherPage.title === page.title) return;
      
      const sharedTags = page.tags.filter(tag => otherPage.tags.includes(tag));
      if (sharedTags.length > 0) {
        connections.push({
          source: page.title,
          target: otherPage.title,
          connectionType: 'tag_similarity',
          strength: sharedTags.length / Math.max(page.tags.length, otherPage.tags.length)
        });
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          sourcePage: args.pageTitle,
          totalConnections: connections.length,
          connections: connections.slice(0, 20) // 最初の20接続のみ
        }, null, 2)
      }]
    };
  }

  /**
   * テーマ抽出の処理
   */
  private async handleExtractThemes(args: {
    projectName: string;
    dateRange?: { start: string; end: string };
    tags?: string[];
    limit?: number;
  }): Promise<any> {
    const project = this.projects.get(args.projectName);
    if (!project) {
      throw new Error(`Project ${args.projectName} not found`);
    }

    let pages = project.pages;

    // 日付フィルタリング
    if (args.dateRange) {
      const startTime = new Date(args.dateRange.start).getTime() / 1000;
      const endTime = new Date(args.dateRange.end).getTime() / 1000;
      pages = pages.filter(page => page.updated >= startTime && page.updated <= endTime);
    }

    // タグフィルタリング
    if (args.tags) {
      pages = pages.filter(page => args.tags!.some(tag => page.tags.includes(tag)));
    }

    // テーマ抽出（簡単な実装）
    const themes = new Map<string, ThemeExtraction>();
    
    pages.forEach(page => {
      page.tags.forEach(tag => {
        if (!themes.has(tag)) {
          themes.set(tag, {
            theme: tag,
            frequency: 0,
            relatedPages: [],
            keywords: []
          });
        }
        const theme = themes.get(tag)!;
        theme.frequency++;
        theme.relatedPages.push(page.title);
      });
    });

    const themeList = Array.from(themes.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, args.limit || 10);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          projectName: args.projectName,
          analyzedPages: pages.length,
          themes: themeList
        }, null, 2)
      }]
    };
  }

  /**
   * 関連度計算
   */
  private calculateRelevance(page: ScrapboxPage, query: string): number {
    const lowerQuery = query.toLowerCase();
    const content = page.lines.join(' ').toLowerCase();
    
    let score = 0;
    
    // タイトルマッチ
    if (page.title.toLowerCase().includes(lowerQuery)) {
      score += 3;
    }
    
    // タグマッチ
    if (page.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
      score += 2;
    }
    
    // 内容マッチ
    const queryWords = lowerQuery.split(/\s+/);
    queryWords.forEach(word => {
      const matches = (content.match(new RegExp(word, 'gi')) || []).length;
      score += matches * 0.1;
    });
    
    return score;
  }

  /**
   * マッチしたコンテキストを抽出
   */
  private extractMatchedContext(page: ScrapboxPage, query: string): string[] {
    const contexts: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    page.lines.forEach(line => {
      if (line.toLowerCase().includes(lowerQuery)) {
        contexts.push(line);
      }
    });
    
    return contexts.slice(0, 5); // 最大5つのコンテキスト
  }

  /**
   * プロンプト生成メソッド
   */
  private generateLiteraryAnalysisPrompt(text?: string, perspective?: string) {
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `以下のテキストを文学批評の観点から分析してください${perspective ? `（特に${perspective}の視点から）` : ''}。

テキスト:
${text || '[テキストが提供されていません]'}

分析の観点:
- 文体・修辞技法
- テーマ・モチーフ
- 文学史的位置づけ
- 特徴的な表現や構造
${perspective ? `- ${perspective}による読解` : ''}

詳細な分析をお願いします。`
          }
        }
      ]
    };
  }

  private generateCreativeContinuationPrompt(fragment?: string, style?: string) {
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `以下の創作断片を${style ? `${style}のスタイルで` : ''}続けるか発展させてください。

断片:
${fragment || '[断片が提供されていません]'}

${style ? `求められるスタイル: ${style}` : ''}

元の文体やトーン、テーマを継承しつつ、創造的に発展させてください。複数のバリエーションがあれば提示してください。`
          }
        }
      ]
    };
  }

  private generateKnowledgeSynthesisPrompt(pages?: string, focus?: string) {
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `以下のページから得られる知識を${focus ? `${focus}の観点から` : ''}統合・体系化してください。

対象ページ: ${pages || '[ページが指定されていません]'}
${focus ? `統合の焦点: ${focus}` : ''}

以下の点を含めて統合してください:
- 共通するテーマや概念
- 相互の関連性や対立点
- 新たな洞察や気づき
- 体系的な整理・分類
- 今後の探求方向の提案`
          }
        }
      ]
    };
  }

  /**
   * プロジェクトを追加
   */
  async addProject(projectName: string, exportData?: any, exportPaths?: string[]): Promise<void> {
    if (exportPaths && exportPaths.length > 0) {
      // 複数の分割ファイルから処理
      console.log(`Adding project ${projectName} from ${exportPaths.length} split files`);
      const project = this.scrapboxClient.processMultipleExportFiles(exportPaths, projectName);
      this.projects.set(projectName, project);
    } else if (exportData) {
      // エクスポートデータから処理
      const project = this.scrapboxClient.processExportData(exportData, projectName);
      this.projects.set(projectName, project);
    } else {
      // APIから取得
      try {
        const pages = await this.scrapboxClient.getProjectPages(projectName);
        const project: ScrapboxProject = {
          name: projectName,
          displayName: projectName,
          pages,
          tagIndex: new Map(),
          linkGraph: new Map(),
          lastUpdated: Date.now()
        };
        
        // インデックスの構築（ScrapboxClientの内部メソッドを使用）
        this.projects.set(projectName, project);
      } catch (error) {
        console.error(`Failed to add project ${projectName}:`, error);
        throw error;
      }
    }
  }

  /**
   * サーバーを開始
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Scrapbox MCP Server started');
  }
}