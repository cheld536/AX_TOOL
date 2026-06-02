import { App, Modal, Notice, Setting } from "obsidian";
import { buildAssistantMessages, LLMNotConfiguredError, sendChatCompletion } from "../llm/provider";
import type { PersonalAIBaseSettings, VaultAnalysisReport } from "../types";

export class ChatModal extends Modal {
  private historyEl: HTMLElement | null = null;
  private inputEl: HTMLTextAreaElement | null = null;

  constructor(
    app: App,
    private settings: PersonalAIBaseSettings,
    private getReport: () => VaultAnalysisReport | null,
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("personal-ai-base-chat");
    contentEl.createEl("h2", { text: "Personal AI Base Chat" });
    contentEl.createEl("p", {
      text: "Chat uses generated scan metadata only. Source note bodies are not sent by this MVP chat context.",
    });

    this.historyEl = contentEl.createDiv({ cls: "personal-ai-base-chat-history" });
    this.appendMessage("assistant", this.initialMessage());

    new Setting(contentEl)
      .setName("Ask Personal AI Base")
      .addTextArea((text) => {
        this.inputEl = text.inputEl;
        text.setPlaceholder("Ask about vault structure, safe files, index design, or next approval steps...");
      });

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText("Close")
          .onClick(() => this.close());
      })
      .addButton((button) => {
        button
          .setCta()
          .setButtonText("Send")
          .onClick(async () => {
            await this.sendCurrentMessage();
          });
      });
  }

  private initialMessage(): string {
    if (this.settings.llm.provider === "disabled") {
      return "LLM provider is disabled. Enable a local or external OpenAI-compatible provider in plugin settings first.";
    }
    if (!this.getReport()) {
      return "Run `Personal AI Base: Scan vault` first for vault-aware answers. You can still ask general questions.";
    }
    return "Ready. I can answer using the latest scan report metadata and safety policy.";
  }

  private async sendCurrentMessage(): Promise<void> {
    const input = this.inputEl?.value.trim() ?? "";
    if (!input) return;
    this.inputEl!.value = "";
    this.appendMessage("user", input);
    this.appendMessage("assistant", "Thinking...");

    try {
      const messages = buildAssistantMessages(this.getReport(), input, this.settings.llm);
      const answer = await sendChatCompletion(this.settings.llm, messages);
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
