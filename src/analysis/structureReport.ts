import type { MarkdownAnalysis, VaultAnalysisReport, FileCandidate } from "../types";

export function buildVaultAnalysisReport(candidates: FileCandidate[], markdown: MarkdownAnalysis[]): VaultAnalysisReport {
  const summary = {
    totalFiles: candidates.length,
    markdownCandidates: markdown.length,
    safeMarkdown: markdown.filter((item) => item.safetyStatus === "safe").length,
    flaggedMarkdown: markdown.filter((item) => item.safetyStatus === "flagged").length,
    excludedFiles: candidates.filter((item) => item.excluded).length,
    needsReviewMarkdown: markdown.filter((item) => item.safetyStatus === "needs-review").length,
  };

  const lines: string[] = [];
  lines.push("# Personal AI Base Vault Analysis");
  lines.push("");
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push("- Mode: read-only scan. Existing notes were not modified.");
  lines.push("- Safety: sensitive matches are reported by signal type only.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total visible files: ${summary.totalFiles}`);
  lines.push(`- Markdown candidates: ${summary.markdownCandidates}`);
  lines.push(`- Safe Markdown: ${summary.safeMarkdown}`);
  lines.push(`- Needs review Markdown: ${summary.needsReviewMarkdown}`);
  lines.push(`- Flagged Markdown: ${summary.flaggedMarkdown}`);
  lines.push(`- Excluded files: ${summary.excludedFiles}`);
  lines.push("");

  lines.push("## File Distribution");
  lines.push("");
  lines.push("| Top area | Files | Markdown | Safe | Needs review | Flagged |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  for (const area of sortedAreas(candidates, markdown)) {
    const files = candidates.filter((item) => item.topArea === area).length;
    const notes = markdown.filter((item) => item.topArea === area);
    lines.push(`| ${area} | ${files} | ${notes.length} | ${countStatus(notes, "safe")} | ${countStatus(notes, "needs-review")} | ${countStatus(notes, "flagged")} |`);
  }
  lines.push("");

  lines.push("## Flagged / Review Files");
  lines.push("");
  lines.push("| File | Status | Signals |");
  lines.push("|---|---|---|");
  for (const item of markdown.filter((note) => note.safetyStatus !== "safe")) {
    lines.push(`| ${item.path} | ${item.safetyStatus} | ${item.safetySignals.join(", ")} |`);
  }
  lines.push("");

  lines.push("## Proposed MVP Artifacts");
  lines.push("");
  lines.push("- `.llm-wiki/index.json`");
  lines.push("- `.llm-wiki/metadata-schema.json`");
  lines.push("- `.llm-wiki/change-proposals.md`");
  lines.push("- `.llm-wiki/reports/YYYY-MM-DD-vault-analysis.md`");
  lines.push("");
  lines.push("## Policy Notes");
  lines.push("");
  lines.push("- `safe` means passed local rules only; it is not approval for external LLM transmission.");
  lines.push("- Existing note bodies must remain read-only.");
  lines.push("- Generated output must stay under `.llm-wiki/`.");

  return {
    generatedAt: new Date().toISOString(),
    candidates,
    markdown,
    summary,
    markdownReport: lines.join("\n"),
  };
}

function sortedAreas(candidates: FileCandidate[], markdown: MarkdownAnalysis[]): string[] {
  const areas = new Set([...candidates.map((item) => item.topArea), ...markdown.map((item) => item.topArea)]);
  return [...areas].sort((left, right) => {
    const leftCount = candidates.filter((item) => item.topArea === left).length;
    const rightCount = candidates.filter((item) => item.topArea === right).length;
    return rightCount - leftCount;
  });
}

function countStatus(markdown: MarkdownAnalysis[], status: MarkdownAnalysis["safetyStatus"]): number {
  return markdown.filter((item) => item.safetyStatus === status).length;
}
