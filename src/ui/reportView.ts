import { App, Modal } from "obsidian";
import type { VaultAnalysisReport } from "../types";

export class ReportModal extends Modal {
  constructor(app: App, private report: VaultAnalysisReport) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Personal AI Base Report" });

    const status = contentEl.createDiv({ cls: "personal-ai-base-status" });
    status.createEl("div", { text: `Safe: ${this.report.summary.safeMarkdown}` });
    status.createEl("div", { text: `Needs review: ${this.report.summary.needsReviewMarkdown}` });
    status.createEl("div", { text: `Flagged: ${this.report.summary.flaggedMarkdown}` });
    status.createEl("div", { text: `Excluded: ${this.report.summary.excludedFiles}` });

    const wrapper = contentEl.createDiv({ cls: "personal-ai-base-report" });
    wrapper.createEl("pre", { text: this.report.markdownReport });
  }
}
