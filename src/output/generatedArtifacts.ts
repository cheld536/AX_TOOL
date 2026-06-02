import type { VaultAnalysisReport } from "../types";

export function buildIndexJson(report: VaultAnalysisReport): string {
  return JSON.stringify({
    schema_version: "0.1.0",
    generated_at: report.generatedAt,
    policy: {
      existing_note_bodies_modified: false,
      safe_means_llm_approved: false,
    },
    summary: report.summary,
    notes: report.markdown.map((note) => ({
      source_path: note.path,
      title: note.title,
      source_area: note.topArea,
      safety_status: note.safetyStatus,
      safety_signals: note.safetySignals,
      headings: note.headings,
      tags: note.tags,
      links: note.links,
      frontmatter_keys: note.frontmatterKeys,
      body_modified: false,
    })),
  }, null, 2);
}

export function buildMetadataSchemaJson(): string {
  return JSON.stringify({
    schema_version: "0.1.0",
    fields: {
      source_path: "Vault-relative original path.",
      title: "Original file basename.",
      source_area: "Top-level vault folder.",
      safety_status: "safe | flagged | excluded | needs-review.",
      safety_signals: "Signal names only; matched values are never stored.",
      headings: "Markdown headings extracted from source.",
      tags: "Obsidian tags extracted from source.",
      links: "Wiki links extracted from source.",
      body_modified: "Always false for source notes.",
    },
  }, null, 2);
}

export function buildChangeProposals(report: VaultAnalysisReport): string {
  return [
    "# Personal AI Base Change Proposals",
    "",
    "No existing note bodies should be modified.",
    "",
    "## Immediate Proposals",
    "",
    "- Keep generated artifacts under `.llm-wiki/`.",
    "- Review `needs-review` files before any model use.",
    "- Keep `flagged` files out of LLM workflows.",
    "- Treat `card-like` as review-only unless the user changes policy.",
    "",
    "## Current Counts",
    "",
    `- Safe Markdown: ${report.summary.safeMarkdown}`,
    `- Needs review Markdown: ${report.summary.needsReviewMarkdown}`,
    `- Flagged Markdown: ${report.summary.flaggedMarkdown}`,
    "",
  ].join("\n");
}
