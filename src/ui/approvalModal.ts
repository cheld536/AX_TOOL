import { App, Modal, Setting } from "obsidian";

export class ApprovalModal extends Modal {
  private approved = false;

  constructor(app: App, private message: string, private onApprove: () => Promise<void>) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Approve Generated Artifacts" });
    contentEl.createEl("p", { text: this.message });
    contentEl.createEl("p", {
      text: "This will write generated files only under the configured .llm-wiki output folder.",
    });

    new Setting(contentEl)
      .addButton((button) => {
        button
          .setButtonText("Cancel")
          .onClick(() => this.close());
      })
      .addButton((button) => {
        button
          .setCta()
          .setButtonText("Approve and write")
          .onClick(async () => {
            if (this.approved) return;
            this.approved = true;
            await this.onApprove();
            this.close();
          });
      });
  }
}
