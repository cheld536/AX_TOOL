import { App, PluginSettingTab, Setting } from "obsidian";
import type { LLMProvider } from "./types";
import type PersonalAIBasePlugin from "./main";

export class PersonalAIBaseSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: PersonalAIBasePlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Personal AI Base" });

    new Setting(containerEl)
      .setName("Generated output folder")
      .setDesc("All generated files must stay under this folder.")
      .addText((text) => {
        text
          .setValue(this.plugin.settings.outputFolder)
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value.trim() || ".llm-wiki";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Excluded folders")
      .setDesc("Comma-separated folder names. These are skipped during scan.")
      .addTextArea((area) => {
        area
          .setValue(this.plugin.settings.excludedFolders.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.excludedFolders = splitList(value);
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Excluded file patterns")
      .setDesc("Comma-separated glob-like patterns.")
      .addTextArea((area) => {
        area
          .setValue(this.plugin.settings.excludedFilePatterns.join(", "))
          .onChange(async (value) => {
            this.plugin.settings.excludedFilePatterns = splitList(value);
            await this.plugin.saveSettings();
          });
      });

    containerEl.createEl("h3", { text: "LLM Chat" });
    containerEl.createEl("p", {
      text: "`safe` means passed local rules only. External model use still requires your explicit configuration.",
    });

    new Setting(containerEl)
      .setName("Provider")
      .setDesc("Local and external providers use OpenAI-compatible chat completions.")
      .addDropdown((dropdown) => {
        dropdown
          .addOption("disabled", "Disabled")
          .addOption("local-openai-compatible", "Local OpenAI-compatible")
          .addOption("external-openai-compatible", "External OpenAI-compatible")
          .setValue(this.plugin.settings.llm.provider)
          .onChange(async (value) => {
            this.plugin.settings.llm.provider = value as LLMProvider;
            await this.plugin.saveSettings();
            this.plugin.refreshStatusBar();
          });
      });

    new Setting(containerEl)
      .setName("Endpoint")
      .setDesc("Example local Ollama endpoint: http://localhost:11434/v1/chat/completions")
      .addText((text) => {
        text
          .setValue(this.plugin.settings.llm.endpoint)
          .onChange(async (value) => {
            this.plugin.settings.llm.endpoint = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Model")
      .setDesc("Example: llama3.1, qwen2.5, gpt-4o-mini, or another OpenAI-compatible model id.")
      .addText((text) => {
        text
          .setValue(this.plugin.settings.llm.model)
          .onChange(async (value) => {
            this.plugin.settings.llm.model = value.trim();
            await this.plugin.saveSettings();
            this.plugin.refreshStatusBar();
          });
      });

    new Setting(containerEl)
      .setName("API key")
      .setDesc("Stored in Obsidian plugin data. Leave empty for local providers that do not require a key.")
      .addText((text) => {
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.llm.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.llm.apiKey = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
      });

    new Setting(containerEl)
      .setName("Max context notes")
      .setDesc("Limits safe metadata records sent with each chat request. Source bodies are not included.")
      .addText((text) => {
        text
          .setValue(String(this.plugin.settings.llm.maxContextNotes))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            this.plugin.settings.llm.maxContextNotes = Number.isFinite(parsed) ? Math.max(0, parsed) : 40;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Use latest scan report as chat context")
      .setDesc("Sends generated metadata from the latest scan, not source note bodies.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.llm.allowReportContext)
          .onChange(async (value) => {
            this.plugin.settings.llm.allowReportContext = value;
            await this.plugin.saveSettings();
          });
      });

    containerEl.createEl("h3", { text: "CLI Agents" });
    containerEl.createEl("p", {
      text: "Codex and Claude planning commands receive generated scan metadata only. Existing note bodies are not included.",
    });

    new Setting(containerEl)
      .setName("Codex command")
      .setDesc("Command or executable name for Codex CLI.")
      .addText((text) => {
        text
          .setValue(this.plugin.settings.agents.codexCommand)
          .onChange(async (value) => {
            this.plugin.settings.agents.codexCommand = value.trim() || "codex";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Codex args")
      .setDesc("Default uses stdin prompt with Codex exec mode.")
      .addText((text) => {
        text
          .setValue(this.plugin.settings.agents.codexArgs)
          .onChange(async (value) => {
            this.plugin.settings.agents.codexArgs = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Claude command")
      .setDesc("Command or executable name for Claude Code CLI.")
      .addText((text) => {
        text
          .setValue(this.plugin.settings.agents.claudeCommand)
          .onChange(async (value) => {
            this.plugin.settings.agents.claudeCommand = value.trim() || "claude";
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Claude args")
      .setDesc("Default uses Claude Code print/headless mode.")
      .addText((text) => {
        text
          .setValue(this.plugin.settings.agents.claudeArgs)
          .onChange(async (value) => {
            this.plugin.settings.agents.claudeArgs = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Agent timeout seconds")
      .setDesc("CLI agent runs are killed after this timeout.")
      .addText((text) => {
        text
          .setValue(String(this.plugin.settings.agents.timeoutSeconds))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            this.plugin.settings.agents.timeoutSeconds = Number.isFinite(parsed) ? Math.max(10, parsed) : 180;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Agent max context notes")
      .setDesc("Limits safe metadata records passed to Codex/Claude planning prompts.")
      .addText((text) => {
        text
          .setValue(String(this.plugin.settings.agents.maxContextNotes))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            this.plugin.settings.agents.maxContextNotes = Number.isFinite(parsed) ? Math.max(0, parsed) : 80;
            await this.plugin.saveSettings();
          });
      });
  }
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
