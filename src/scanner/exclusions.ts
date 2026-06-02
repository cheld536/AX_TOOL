import type { PersonalAIBaseSettings } from "../types";

export function topArea(path: string): string {
  return path.includes("/") ? path.split("/")[0] : "(root)";
}

export function extensionOf(path: string): string {
  const last = path.split("/").pop() ?? path;
  const dot = last.lastIndexOf(".");
  return dot >= 0 ? last.slice(dot).toLowerCase() : "(none)";
}

export function isExcludedPath(path: string, settings: PersonalAIBaseSettings): string | null {
  const parts = path.split("/");
  const folder = parts.find((part) => settings.excludedFolders.includes(part));
  if (folder) return `folder:${folder}`;

  const lowered = path.toLowerCase();
  for (const pattern of settings.excludedFilePatterns) {
    if (globLikeMatch(lowered, pattern.toLowerCase())) return `pattern:${pattern}`;
  }
  return null;
}

function globLikeMatch(value: string, pattern: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(value) || new RegExp(escaped).test(value);
}
