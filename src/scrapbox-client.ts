import axios, { AxiosInstance } from 'axios';
import { ScrapboxPage, ScrapboxProject, ScrapboxExportData } from './types.js';

export class ScrapboxClient {
  private httpClient: AxiosInstance;
  private cache: Map<string, any>;
  private cacheExpiry: Map<string, number>;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分

  constructor() {
    this.httpClient = axios.create({
      baseURL: 'https://scrapbox.io',
      timeout: 10000,
      headers: {
        'User-Agent': 'ScrapboxMCPServer/1.0.0'
      }
    });
    
    this.cache = new Map();
    this.cacheExpiry = new Map();
  }

  /**
   * プロジェクトの全ページを取得
   */
  async getProjectPages(projectName: string, limit?: number): Promise<ScrapboxPage[]> {
    const cacheKey = `pages_${projectName}_${limit || 'all'}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const url = `/api/pages/${projectName}`;
      const params = limit ? { limit } : {};
      
      const response = await this.httpClient.get(url, { params });
      const pages = response.data.pages || [];
      
      // 詳細データの取得と変換
      const detailedPages = await Promise.all(
        pages.map((page: any) => this.enrichPageData(projectName, page))
      );

      this.setCache(cacheKey, detailedPages);
      return detailedPages;
    } catch (error) {
      console.error(`Failed to fetch project pages for ${projectName}:`, error);
      throw new Error(`Failed to fetch project pages: ${error}`);
    }
  }

  /**
   * 特定のページの詳細を取得
   */
  async getPage(projectName: string, pageTitle: string): Promise<ScrapboxPage | null> {
    const cacheKey = `page_${projectName}_${pageTitle}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const encodedTitle = encodeURIComponent(pageTitle);
      const response = await this.httpClient.get(`/api/pages/${projectName}/${encodedTitle}`);
      
      if (!response.data) {
        return null;
      }

      const page = await this.enrichPageData(projectName, response.data);
      this.setCache(cacheKey, page);
      return page;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error(`Failed to fetch page ${pageTitle} from ${projectName}:`, error);
      throw new Error(`Failed to fetch page: ${error}`);
    }
  }

  /**
   * ページテキストを取得
   */
  async getPageText(projectName: string, pageTitle: string): Promise<string | null> {
    try {
      const encodedTitle = encodeURIComponent(pageTitle);
      const response = await this.httpClient.get(`/api/pages/${projectName}/${encodedTitle}/text`);
      return response.data || null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error(`Failed to fetch page text for ${pageTitle}:`, error);
      return null;
    }
  }

  /**
   * プロジェクト内でページタイトルを検索
   */
  async searchPageTitles(projectName: string, query: string): Promise<string[]> {
    try {
      const response = await this.httpClient.get(`/api/pages/${projectName}/search/titles`, {
        params: { q: query }
      });
      return response.data?.titles || [];
    } catch (error) {
      console.error(`Failed to search page titles in ${projectName}:`, error);
      return [];
    }
  }

  /**
   * プロジェクト内で全文検索
   */
  async searchPages(projectName: string, query: string): Promise<any[]> {
    try {
      const response = await this.httpClient.get(`/api/pages/${projectName}/search/query`, {
        params: { q: query }
      });
      return response.data?.pages || [];
    } catch (error) {
      console.error(`Failed to search pages in ${projectName}:`, error);
      return [];
    }
  }

  /**
   * 複数の分割されたJSONファイルを順次読み込んでマージ
   */
  processMultipleExportFiles(exportPaths: string[], projectName: string): ScrapboxProject {
    console.log(`Loading ${exportPaths.length} export files for project ${projectName}...`);
    
    let mergedPages: ScrapboxPage[] = [];
    let projectData: any = null;
    
    for (let i = 0; i < exportPaths.length; i++) {
      const filePath = exportPaths[i];
      console.log(`Loading part ${i + 1}/${exportPaths.length}: ${filePath}`);
      
      try {
        const fs = require('fs');
        const partData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        // 最初のファイルからプロジェクト基本情報を取得
        if (i === 0) {
          projectData = {
            name: partData.name,
            displayName: partData.displayName,
            exported: partData.exported,
            users: partData.users
          };
        }
        
        // ページを変換してマージ
        const pages: ScrapboxPage[] = partData.pages.map((pageData: any) => {
          const tags = this.extractTags(pageData.lines);
          const links = this.extractLinks(pageData.lines);
          
          return {
            id: pageData.id,
            title: pageData.title,
            lines: pageData.lines,
            created: pageData.created,
            updated: pageData.updated,
            tags,
            links,
            backlinks: [], // 後で計算
            metadata: {
              wordCount: this.countWords(pageData.lines),
              linkCount: links.length,
              creativeType: this.detectCreativeType(pageData.lines)
            }
          };
        });
        
        mergedPages = mergedPages.concat(pages);
        console.log(`  Added ${pages.length} pages (total: ${mergedPages.length})`);
        
      } catch (error) {
        console.error(`Failed to load part ${filePath}:`, error);
        throw new Error(`Failed to load export file part: ${filePath}`);
      }
    }
    
    console.log(`Merged total: ${mergedPages.length} pages`);
    
    // バックリンクの計算
    console.log('Calculating backlinks...');
    this.calculateBacklinks(mergedPages);
    
    // インデックスの構築
    console.log('Building indexes...');
    const tagIndex = this.buildTagIndex(mergedPages);
    const linkGraph = this.buildLinkGraph(mergedPages);
    
    return {
      name: projectName,
      displayName: projectData?.displayName || projectName,
      pages: mergedPages,
      tagIndex,
      linkGraph,
      lastUpdated: Date.now()
    };
  }

  /**
   * JSONエクスポートデータを処理
   * （ローカルファイルまたはエクスポートされたデータ用）
   */
  processExportData(exportData: ScrapboxExportData, projectName: string): ScrapboxProject {
    const pages: ScrapboxPage[] = exportData.pages.map(pageData => {
      const tags = this.extractTags(pageData.lines);
      const links = this.extractLinks(pageData.lines);
      
      return {
        id: pageData.id,
        title: pageData.title,
        lines: pageData.lines,
        created: pageData.created,
        updated: pageData.updated,
        tags,
        links,
        backlinks: [], // 後で計算
        metadata: {
          wordCount: this.countWords(pageData.lines),
          linkCount: links.length,
          creativeType: this.detectCreativeType(pageData.lines)
        }
      };
    });

    // バックリンクの計算
    this.calculateBacklinks(pages);

    // インデックスの構築
    const tagIndex = this.buildTagIndex(pages);
    const linkGraph = this.buildLinkGraph(pages);

    return {
      name: projectName,
      displayName: projectName,
      pages,
      tagIndex,
      linkGraph,
      lastUpdated: Date.now()
    };
  }

  /**
   * ページデータを詳細情報で拡張
   */
  private async enrichPageData(projectName: string, pageData: any): Promise<ScrapboxPage> {
    const tags = this.extractTags(pageData.lines || []);
    const links = this.extractLinks(pageData.lines || []);
    
    return {
      id: pageData.id || pageData.title,
      title: pageData.title,
      lines: pageData.lines || [],
      created: pageData.created || 0,
      updated: pageData.updated || 0,
      tags,
      links,
      backlinks: [], // 必要に応じて別途計算
      metadata: {
        wordCount: this.countWords(pageData.lines || []),
        linkCount: links.length,
        creativeType: this.detectCreativeType(pageData.lines || [])
      }
    };
  }

  /**
   * ページ内容からタグを抽出
   */
  private extractTags(lines: string[]): string[] {
    const tags = new Set<string>();
    const tagRegex = /#(\S+)/g;
    
    lines.forEach(line => {
      let match;
      while ((match = tagRegex.exec(line)) !== null) {
        tags.add(match[1]);
      }
    });
    
    return Array.from(tags);
  }

  /**
   * ページ内容からリンクを抽出
   */
  private extractLinks(lines: string[]): string[] {
    const links = new Set<string>();
    const linkRegex = /\[([^\]]+)\]/g;
    
    lines.forEach(line => {
      let match;
      while ((match = linkRegex.exec(line)) !== null) {
        links.add(match[1]);
      }
    });
    
    return Array.from(links);
  }

  /**
   * 文字数をカウント
   */
  private countWords(lines: string[]): number {
    return lines.join('\n').length;
  }

  /**
   * 創作タイプを検出
   */
  private detectCreativeType(lines: string[]): 'poetry' | 'essay' | 'criticism' | 'note' | 'diary' | undefined {
    const content = lines.join('\n').toLowerCase();
    
    if (content.includes('詩') || content.includes('poem')) return 'poetry';
    if (content.includes('批評') || content.includes('criticism')) return 'criticism';
    if (content.includes('エッセイ') || content.includes('essay')) return 'essay';
    if (content.includes('日記') || content.includes('diary')) return 'diary';
    
    return 'note';
  }

  /**
   * バックリンクを計算
   */
  private calculateBacklinks(pages: ScrapboxPage[]): void {
    const titleToBacklinks = new Map<string, string[]>();
    
    pages.forEach(page => {
      page.links.forEach(linkedTitle => {
        if (!titleToBacklinks.has(linkedTitle)) {
          titleToBacklinks.set(linkedTitle, []);
        }
        titleToBacklinks.get(linkedTitle)!.push(page.title);
      });
    });

    pages.forEach(page => {
      page.backlinks = titleToBacklinks.get(page.title) || [];
    });
  }

  /**
   * タグインデックスを構築
   */
  private buildTagIndex(pages: ScrapboxPage[]): Map<string, string[]> {
    const tagIndex = new Map<string, string[]>();
    
    pages.forEach(page => {
      page.tags.forEach(tag => {
        if (!tagIndex.has(tag)) {
          tagIndex.set(tag, []);
        }
        tagIndex.get(tag)!.push(page.title);
      });
    });
    
    return tagIndex;
  }

  /**
   * リンクグラフを構築
   */
  private buildLinkGraph(pages: ScrapboxPage[]): Map<string, string[]> {
    const linkGraph = new Map<string, string[]>();
    
    pages.forEach(page => {
      linkGraph.set(page.title, [...page.links, ...page.backlinks]);
    });
    
    return linkGraph;
  }

  /**
   * キャッシュの有効性を確認
   */
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return false;
    }
    return this.cache.has(key);
  }

  /**
   * キャッシュに値を設定
   */
  private setCache(key: string, value: any): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }
}