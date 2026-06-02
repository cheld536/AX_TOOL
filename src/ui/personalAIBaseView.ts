import { ItemView, Notice, setIcon, type WorkspaceLeaf } from "obsidian";
import { buildAssistantMessages, LLMNotConfiguredError, sendChatCompletion } from "../llm/provider";
import type PersonalAIBasePlugin from "../main";

export const VIEW_TYPE_PERSONAL_AI_BASE = "personal-ai-base-view";

export class PersonalAIBaseView extends ItemView {
  private historyEl: HTMLElement | null = null;
  private inputEl: HTMLTextAreaElement | null = null;

  constructor(leaf: WorkspaceLeaf, private plugin: PersonalAIBasePlugin) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_PERSONAL_AI_BASE;
  }

  getDisplayText(): string {
    return "Personal AI Base";
  }

  getIcon(): string {
    return "brain-circuit";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("personal-ai-base-view");

    const header = container.createDiv({ cls: "personal-ai-base-view-header" });
    this.buildHeader(header);

    const notice = container.createDiv({ cls: "personal-ai-base-view-notice" });
    notice.setText("Chat uses generated scan metadata only. Existing note bodies are not sent by this MVP view.");

    this.historyEl = container.createDiv({ cls: "personal-ai-base-chat-history personal-ai-base-view-history" });
    this.appendMessage("assistant", this.initialMessage());

    const inputWrapper = container.createDiv({ cls: "personal-ai-base-input-wrapper" });
    this.inputEl = inputWrapper.createEl("textarea", {
      cls: "personal-ai-base-input",
      attr: {
        placeholder: "Ask about vault structure, safe files, index design, Codex/Claude planning, or next approval steps...",
        rows: "4",
      },
    });

    const footer = container.createDiv({ cls: "personal-ai-base-input-actions" });
    const sendBtn = footer.createEl("button", { text: "Send" });
    sendBtn.addClass("mod-cta");
    sendBtn.addEventListener("click", async () => {
      await this.sendCurrentMessage();
    });
  }

  refresh(): void {
    if (!this.historyEl) return;
    this.appendMessage("assistant", this.initialMessage());
  }

  private buildHeader(header: HTMLElement): void {
    const title = header.createDiv({ cls: "personal-ai-base-title" });
    const logo = title.createSpan({ cls: "personal-ai-base-logo" });
    setIcon(logo, "brain-circuit");
    title.createEl("h4", { text: "Personal AI Base" });

    const actions = header.createDiv({ cls: "personal-ai-base-header-actions" });
    this.addHeaderButton(actions, "refresh-cw", "Scan vault", async () => this.plugin.scanVault());
    this.addHeaderButton(actions, "bot", "Run Codex planning", async () => this.plugin.runAgentPlanning("codex"));
    this.addHeaderButton(actions, "sparkles", "Run Claude planning", async () => this.plugin.runAgentPlanning("claude"));
    this.addHeaderButton(actions, "save", "Generate approved artifacts", async () => this.plugin.openGenerateArtifactsApproval());
    this.addHeaderButton(actions, "settings", "Open settings", () => {
      new Notice("Open Settings > Community plugins > Personal AI Base.");
    });
  }

  private addHeaderButton(actions: HTMLElement, icon: string, label: string, onClick: () => Promise<void> | void): void {
    const button = actions.createDiv({ cls: "personal-ai-base-header-btn" });
    setIcon(button, icon);
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.addEventListener("click", async () => {
      await onClick();
    });
  }

  private initialMessage(): string {
    const report = this.plugin.getLatestReport();
    const provider = this.plugin.settings.llm.provider;
    if (provider === "disabled") {
      return "LLM provider is disabled. Enable a local or external OpenAI-compatible provider in settings first. Codex and Claude planning commands are available from the header after a scan.";
    }
    if (!report) {
      return "Run the scan action first for vault-aware answers. You can still ask general setup questions.";
    }
    return `Ready. Latest scan has ${report.summary.safeMarkdown} safe, ${report.summary.needsReviewMarkdown} needs-review, and ${report.summary.flaggedMarkdown} flagged Markdown files.`;
  }

  private async sendCurrentMessage(): Promise<void> {
    const input = this.inputEl?.value.trim() ?? "";
    if (!input) return;
    this.inputEl!.value = "";
    this.appendMessage("user", input);
    this.appendMessage("assistant", "Thinking...");

    try {
      const messages = buildAssistantMessages(this.plugin.getLatestReport(), input, this.plugin.settings.llm);
      const answer = await sendChatCompletion(this.plugin.settings.llm, messages);
      this.replaceLastAssistantMessage(answer);
    } catch (error) {
      const message = error instanceof LLMNotConfiguredError
        ? error.message
        : `LLM request failed: ${error instanceof Error ? error.message : String(error)}`;
      this.replaceLastAssistantMessage(message);
      new Notice(message);
    }
  }

  private appendMessage(role: "user" | "assistant", text: string): void {
    if (!this.historyEl) return;
    const row = this.historyEl.createDiv({ cls: `personal-ai-base-chat-message personal-ai-base-chat-${role}` });
    row.createEl("strong", { text: role === "user" ? "You" : "Personal AI Base" });
    row.createEl("p", { text });
    this.historyEl.scrollTop = this.historyEl.scrollHeight;
  }

  private replaceLastAssistantMessage(text: string): void {
    if (!this.historyEl) return;
    const messages = this.historyEl.querySelectorAll(".personal-ai-base-chat-assistant p");
    const last = messages.item(messages.length - 1);
    if (last) last.textContent = text;
  }
}
