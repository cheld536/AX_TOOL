import type { PersonalAIBaseSettings, SafetyStatus } from "../types";

const SENSITIVE_PATTERNS: Array<[string, RegExp]> = [
  ["api-key-token-secret", /api[_ -]?key|secret|access[_ -]?token|refresh[_ -]?token|bearer\s+[a-z0-9._-]+|sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}/i],
  ["password-credential", /password|passwd|credential|credentials|비밀번호|암호/i],
  ["private-key", /-----BEGIN (RSA |OPENSSH |EC |DSA |)PRIVATE KEY-----/],
  ["email", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["phone-kr", /(?<!\d)(010[- .]?\d{4}[- .]?\d{4})(?!\d)/],
  ["rrn-kr", /(?<!\d)\d{6}-[1-4]\d{6}(?!\d)/],
  ["card-like", /(?<!\d)(?:\d[ -]*?){13,16}(?!\d)/],
];

export function classifyText(text: string, settings: PersonalAIBaseSettings): {
  status: SafetyStatus;
  signals: string[];
} {
  const signals = SENSITIVE_PATTERNS
    .filter(([, pattern]) => pattern.test(text))
    .map(([name]) => name);

  if (signals.length === 0) return { status: "safe", signals };
  if (signals.some((signal) => settings.hardStopSignals.includes(signal))) {
    return { status: "flagged", signals };
  }
  if (signals.some((signal) => settings.reviewOnlySignals.includes(signal))) {
    return { status: "needs-review", signals };
  }
  return { status: "flagged", signals };
}

export function extractHeadings(text: string): string[] {
  return [...text.matchAll(/^(#{1,4})\s+(.+)$/gm)]
    .slice(0, 30)
    .map((match) => `${match[1]} ${match[2].trim()}`);
}

export function extractTags(text: string): string[] {
  const tags = new Set<string>();
  for (const match of text.matchAll(/(^|\s)#([A-Za-z0-9가-힣/_-]+)/g)) {
    tags.add(match[2]);
  }
  return [...tags].slice(0, 40);
}

export function extractWikiLinks(text: string): string[] {
  const links = new Set<string>();
  for (const match of text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)) {
    links.add(match[1].trim());
  }
  return [...links].slice(0, 80);
}

export function extractFrontmatterKeys(text: string): string[] {
  if (!text.startsWith("---")) return [];
  const end = text.indexOf("\n---", 3);
  if (end === -1) return [];
  const block = text.slice(3, end);
  return [...block.matchAll(/^([A-Za-z0-9_-]+):/gm)].map((match) => match[1]);
}
