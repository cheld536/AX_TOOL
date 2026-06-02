import type { App, TFile } from "obsidian";
import type { FileCandidate, MarkdownAnalysis, PersonalAIBaseSettings } from "../types";
import { extensionOf, isExcludedPath, topArea } from "./exclusions";
import {
  classifyText,
  extractFrontmatterKeys,
  extractHeadings,
  extractTags,
  extractWikiLinks,
} from "./safetyGate";

export async function collectVaultFiles(app: App, settings: PersonalAIBaseSettings): Promise<{
  candidates: FileCandidate[];
  markdown: MarkdownAnalysis[];
}> {
  const files = app.vault.getFiles();
  const candidates: FileCandidate[] = files.map((file) => {
    const reason = isExcludedPath(file.path, settings);
    return {
      path: file.path,
      extension: extensionOf(file.path),
      topArea: topArea(file.path),
      size: file.stat.size,
      excluded: reason !== null,
      exclusionReason: reason ?? undefined,
    };
  });

  const markdown: MarkdownAnalysis[] = [];
  for (const file of files) {
    const candidate = candidates.find((item) => item.path === file.path);
    if (!candidate || candidate.excluded || extensionOf(file.path) !== ".md") continue;
    markdown.push(await analyzeMarkdownFile(app, file, settings));
  }

  return { candidates, markdown };
}

async function analyzeMarkdownFile(app: App, file: TFile, settings: PersonalAIBaseSettings): Promise<MarkdownAnalysis> {
  const text = await app.vault.cachedRead(file);
  const classification = classifyText(text, settings);

  return {
    path: file.path,
    title: file.basename,
    topArea: topArea(file.path),
    size: file.stat.size,
    safetyStatus: classification.status,
    safetySignals: classification.signals,
    headings: extractHeadings(text),
    tags: extractTags(text),
    links: extractWikiLinks(text),
    frontmatterKeys: extractFrontmatterKeys(text),
  };
}
