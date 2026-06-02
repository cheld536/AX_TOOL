import type { AgentRunResult } from "../types";

export function buildAgentRunMarkdown(result: AgentRunResult): string {
  return [
    `# ${result.provider} Agent Run`,
    "",
    `- Started: ${result.startedAt}`,
    `- Completed: ${result.completedAt}`,
    `- Command: \`${result.command}\``,
    `- Exit code: ${result.exitCode ?? "unknown"}`,
    "",
    "## Output",
    "",
    result.stdout.trim() || "_No stdout._",
    "",
    "## Diagnostics",
    "",
    result.stderr.trim() || "_No stderr._",
    "",
  ].join("\n");
}
