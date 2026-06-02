import { Notice, Plugin } from "obsidian";
import { runAgentCli } from "./agents/cliRunner";
import { buildAgentPlanningPrompt } from "./agents/prompt";
import { buildVaultAnalysisReport } from "./analysis/structureReport";
import { DEFAULT_SETTINGS } from "./defaults";
import {
  buildChangeProposals,
  buildIndexJson,
  buildMetadataSchemaJson,
} from "./output/generatedArtifacts";
import { buildAgentRunMarkdown } from "./output/agentRunArtifacts";
import { SafeGeneratedWriter } from "./output/safeWriter";
import { collectVaultFiles } from "./scanner/collectVaultFiles";
import { PersonalAIBaseSettingTab } from "./settings";
import { ApprovalModal } from "./ui/approvalModal";
import { PersonalAIBaseView, VIEW_TYPE_PERSONAL_AI_BASE } from "./ui/personalAIBaseView";
import { ReportModal } from "./ui/reportView";
import type { PersonalAIBaseSettings, VaultAnalysisReport } from "./types";
import type { AgentProvider, AgentRunResult } from "./types";

export default class PersonalAIBasePlugin extends Plugin {
  settings: PersonalAIBaseSettings = DEFAULT_SETTINGS;
  private latestReport: VaultAnalysisReport | null = null;
  private latestAgentRun: AgentRunResult | null = null;
  private statusBarEl: HTMLElement | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new PersonalAIBaseSettingTab(this.app, this));
    this.registerView(
      VIEW_TYPE_PERSONAL_AI_BASE,
      (leaf) => new PersonalAIBaseView(leaf, this),
    );
    this.addRibbonIcon("brain-circuit", "Open Personal AI Base", () => {
      void this.activateView();
    });
    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.setText(this.statusBarText());
    this.statusBarEl.addClass("personal-ai-base-statusbar");
    this.statusBarEl.onClickEvent(() => {
      void this.activateView();
    });

    this.addCommand({
      id: "scan-vault",
      name: "Scan vault",
      callback: async () => {
        await this.scanVault();
      },
    });

    this.addCommand({
      id: "open-chat",
      name: "Open chat",
      callback: () => {
        void this.activateView();
      },
    });

    this.addCommand({
      id: "review-latest-report",
      name: "Review latest report",
      callback: () => {
        if (!this.latestReport) {
          new Notice("No report yet. Run Personal AI Base: Scan vault first.");
          return;
        }
        new ReportModal(this.app, this.latestReport).open();
      },
    });

    this.addCommand({
      id: "generate-approved-artifacts",
      name: "Generate approved artifacts",
      callback: async () => {
        await this.openGenerateArtifactsApproval();
      },
    });

    this.addCommand({
      id: "run-codex-planning",
      name: "Run Codex planning",
      callback: async () => {
        await this.runAgentPlanning("codex");
      },
    });

    this.addCommand({
      id: "run-claude-planning",
      name: "Run Claude planning",
      callback: async () => {
        await this.runAgentPlanning("claude");
      },
    });

    this.addCommand({
      id: "review-latest-agent-result",
      name: "Review latest agent result",
      callback: () => {
        if (!this.latestAgentRun) {
          new Notice("No agent run yet.");
          return;
        }
        new ReportModal(this.app, {
          generatedAt: this.latestAgentRun.completedAt,
          candidates: [],
          markdown: [],
          summary: {
            totalFiles: 0,
            markdownCandidates: 0,
            safeMarkdown: 0,
            flaggedMarkdown: 0,
            excludedFiles: 0,
            needsReviewMarkdown: 0,
          },
          markdownReport: buildAgentRunMarkdown(this.latestAgentRun),
        }).open();
      },
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...(await this.loadData()),
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async scanVault(): Promise<void> {
    new Notice("Personal AI Base: scanning vault read-only...");
    const inventory = await collectVaultFiles(this.app, this.settings);
    this.latestReport = buildVaultAnalysisReport(inventory.candidates, inventory.markdown);
    this.refreshStatusBar();
    this.refreshViews();
    new ReportModal(this.app, this.latestReport).open();
    new Notice("Personal AI Base: scan complete. No files were modified.");
  }

  async openGenerateArtifactsApproval(): Promise<void> {
    if (!this.latestReport) {
      new Notice("No report yet. Run Personal AI Base: Scan vault first.");
      return;
    }
    new ApprovalModal(
      this.app,
      "Approve writing index, metadata schema, change proposals, and report files.",
      async () => this.writeApprovedArtifacts(this.latestReport as VaultAnalysisReport),
    ).open();
  }

  private async writeApprovedArtifacts(report: VaultAnalysisReport): Promise<void> {
    const writer = new SafeGeneratedWriter(this.app, this.settings.outputFolder);
    const date = new Date().toISOString().slice(0, 10);
    await writer.writeText(`${this.settings.outputFolder}/index.json`, buildIndexJson(report));
    await writer.writeText(`${this.settings.outputFolder}/metadata-schema.json`, buildMetadataSchemaJson());
    await writer.writeText(`${this.settings.outputFolder}/change-proposals.md`, buildChangeProposals(report));
    await writer.writeText(`${this.settings.outputFolder}/reports/${date}-vault-analysis.md`, report.markdownReport);
    new Notice("Personal AI Base: generated artifacts written under output folder.");
  }

  async runAgentPlanning(provider: AgentProvider): Promise<void> {
    if (!this.latestReport) {
      new Notice("Run Personal AI Base: Scan vault before agent planning.");
      return;
    }
    new ApprovalModal(
      this.app,
      `Approve running ${provider} CLI with generated scan metadata only. Existing note bodies are not included in the prompt.`,
      async () => {
        new Notice(`Personal AI Base: running ${provider} planning...`);
        const prompt = buildAgentPlanningPrompt(provider, this.latestReport as VaultAnalysisReport, this.settings.agents.maxContextNotes);
        const result = await runAgentCli(provider, prompt, this.settings);
        this.latestAgentRun = result;
        this.refreshViews();
        const writer = new SafeGeneratedWriter(this.app, this.settings.outputFolder);
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        await writer.writeText(`${this.settings.outputFolder}/agent-runs/${stamp}-${provider}-planning.md`, buildAgentRunMarkdown(result));
        new Notice(`Personal AI Base: ${provider} planning result saved.`);
      },
    ).open();
  }

  async activateView(): Promise<void> {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_PERSONAL_AI_BASE)[0];
    if (!leaf) {
      const rightLeaf = this.app.workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({
          type: VIEW_TYPE_PERSONAL_AI_BASE,
          active: true,
        });
        leaf = rightLeaf;
      }
    }
    if (leaf) this.app.workspace.revealLeaf(leaf);
  }

  getLatestReport(): VaultAnalysisReport | null {
    return this.latestReport;
  }

  private refreshViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_PERSONAL_AI_BASE)) {
      const view = leaf.view;
      if (view instanceof PersonalAIBaseView) view.refresh();
    }
  }

  refreshStatusBar(): void {
    if (!this.statusBarEl) return;
    this.statusBarEl.setText(this.statusBarText());
  }

  private statusBarText(): string {
    const provider = this.settings.llm.provider === "disabled" ? "LLM off" : this.settings.llm.model;
    const scan = this.latestReport ? `${this.latestReport.summary.safeMarkdown} safe` : "no scan";
    return `Personal AI Base: ${provider}, ${scan}`;
  }
}
