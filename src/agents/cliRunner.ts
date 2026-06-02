import { Platform } from "obsidian";
import type { AgentProvider, AgentRunResult, PersonalAIBaseSettings } from "../types";

export async function runAgentCli(
  provider: AgentProvider,
  prompt: string,
  settings: PersonalAIBaseSettings,
): Promise<AgentRunResult> {
  if (!Platform.isDesktopApp) {
    throw new Error("CLI agents are available only in the Obsidian desktop app.");
  }

  const startedAt = new Date().toISOString();
  const command = provider === "codex" ? settings.agents.codexCommand : settings.agents.claudeCommand;
  const argString = provider === "codex" ? settings.agents.codexArgs : settings.agents.claudeArgs;
  const args = parseArgs(argString);
  const timeoutMs = Math.max(10, settings.agents.timeoutSeconds) * 1000;

  const { spawn } = await import("child_process");

  return await new Promise<AgentRunResult>((resolve, reject) => {
    const child = spawn(command, args, {
      shell: Platform.isWin,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`${provider} CLI timed out after ${settings.agents.timeoutSeconds}s.`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      reject(error);
    });
    child.on("close", (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve({
        provider,
        command: [command, ...args].join(" "),
        exitCode,
        stdout,
        stderr,
        startedAt,
        completedAt: new Date().toISOString(),
      });
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function parseArgs(value: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: "'" | "\"" | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current) args.push(current);
  return args;
}
