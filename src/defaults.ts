import type { PersonalAIBaseSettings } from "./types";

export const DEFAULT_SETTINGS: PersonalAIBaseSettings = {
  outputFolder: ".llm-wiki",
  excludedFolders: [
    ".git",
    ".obsidian",
    ".claude",
    ".oc-cache",
    ".omc",
    "images",
    "attachments",
    "private",
  ],
  excludedFilePatterns: [
    "*.env",
    "*secret*",
    "*password*",
    "*credential*",
    "*token*",
    "*key*",
  ],
  hardStopSignals: [
    "api-key-token-secret",
    "password-credential",
    "private-key",
    "email",
    "phone-kr",
  ],
  reviewOnlySignals: [
    "card-like",
  ],
};
