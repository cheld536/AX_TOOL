import { App, PluginSettingTab, Setting } from "obsidian";
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
  }
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
