export type SafetyStatus = "safe" | "flagged" | "excluded" | "needs-review";

export interface PersonalAIBaseSettings {
  outputFolder: string;
  excludedFolders: string[];
  excludedFilePatterns: string[];
  hardStopSignals: string[];
  reviewOnlySignals: string[];
  llm: LLMSettings;
}

export type LLMProvider = "disabled" | "local-openai-compatible" | "external-openai-compatible";

export interface LLMSettings {
  provider: LLMProvider;
  endpoint: string;
  model: string;
  apiKey: string;
  temperature: number;
  maxContextNotes: number;
  allowReportContext: boolean;
}

export interface FileCandidate {
  path: string;
  extension: string;
  topArea: string;
  size: number;
  excluded: boolean;
  exclusionReason?: string;
}

export interface MarkdownAnalysis {
  path: string;
  title: string;
  topArea: string;
  size: number;
  safetyStatus: SafetyStatus;
  safetySignals: string[];
  headings: string[];
  tags: string[];
  links: string[];
  frontmatterKeys: string[];
}

export interface VaultAnalysisReport {
  generatedAt: string;
  candidates: FileCandidate[];
  markdown: MarkdownAnalysis[];
  summary: {
    totalFiles: number;
    markdownCandidates: number;
    safeMarkdown: number;
    flaggedMarkdown: number;
    excludedFiles: number;
    needsReviewMarkdown: number;
  };
  markdownReport: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
