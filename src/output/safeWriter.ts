import type { App } from "obsidian";

export class SafeGeneratedWriter {
  constructor(private app: App, private outputFolder: string) {}

  async writeText(path: string, content: string): Promise<void> {
    const normalized = normalizePath(path);
    const root = normalizePath(this.outputFolder);
    if (normalized !== root && !normalized.startsWith(`${root}/`)) {
      throw new Error(`Refusing to write outside generated output folder: ${path}`);
    }
    await this.ensureParentFolder(normalized);
    await this.app.vault.adapter.write(normalized, content);
  }

  private async ensureParentFolder(path: string): Promise<void> {
    const parts = path.split("/");
    parts.pop();
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!(await this.app.vault.adapter.exists(current))) {
        await this.app.vault.adapter.mkdir(current);
      }
    }
  }
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}
