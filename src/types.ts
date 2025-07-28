export interface ScrapboxPage {
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
    creativeType?: 'poetry' | 'essay' | 'criticism' | 'note' | 'diary';
  };
}

export interface ScrapboxProject {
  name: string;
  displayName: string;
  description?: string;
  pages: ScrapboxPage[];
  tagIndex: Map<string, string[]>;
  linkGraph: Map<string, string[]>;
  lastUpdated: number;
}

export interface ScrapboxExportData {
  pages: Array<{
    id: string;
    title: string;
    created: number;
    updated: number;
    lines: string[];
  }>;
}

export interface SearchResult {
  page: ScrapboxPage;
  relevanceScore: number;
  matchedContext: string[];
}

export interface ConnectionAnalysis {
  source: string;
  target: string;
  connectionType: 'direct_link' | 'tag_similarity' | 'content_similarity';
  strength: number;
}

export interface ThemeExtraction {
  theme: string;
  frequency: number;
  relatedPages: string[];
  keywords: string[];
}

export interface ProjectConfig {
  name: string;
  exportDataPath?: string;
  exportPaths?: string[];
  description?: string;
}

export interface ScrapboxConfig {
  projects: ProjectConfig[];
}