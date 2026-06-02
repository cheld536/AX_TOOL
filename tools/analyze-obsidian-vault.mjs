import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';

const vault = process.argv[2] || 'C:\\Users\\Evankim\\Documents\\my_obsidian';
const outPath = process.argv[3] || join(process.cwd(), 'reports', 'obsidian-vault-analysis.md');

const excludeDirs = new Set(['.git', '.obsidian', '.claude', '.oc-cache', '.omc', 'images', 'attachments', 'private']);
const excludeFilePatterns = [
  /\.env$/i,
  /secret/i,
  /password/i,
  /credential/i,
  /token/i,
  /key/i,
];

const sensitivePatterns = [
  ['api-key-token-secret', /api[_ -]?key|secret|access[_ -]?token|refresh[_ -]?token|bearer\s+[a-z0-9._-]+|sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}/i],
  ['password-credential', /password|passwd|credential|credentials|비밀번호|암호/i],
  ['private-key', /-----BEGIN (RSA |OPENSSH |EC |DSA |)PRIVATE KEY-----/],
  ['email', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ['phone-kr', /(?<!\d)(010[- .]?\d{4}[- .]?\d{4})(?!\d)/],
  ['rrn-kr', /(?<!\d)\d{6}-[1-4]\d{6}(?!\d)/],
  ['card-like', /(?<!\d)(?:\d[ -]*?){13,16}(?!\d)/],
];

const stopwords = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', '문서', '정리', '방법', '개요',
  '활용', '기능', '구현', '분석', '보고서', '작업', '모델', '데이터', '시스템',
  '옵시디언', '사용', '설정', '구조', '기술', '리포트', '프로젝트',
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(vault, full);
    const parts = rel.split(/[\\/]/);
    if (parts.some((part) => excludeDirs.has(part))) continue;
    if (entry.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function normalizeRel(path) {
  return relative(vault, path).replaceAll('\\', '/');
}

function topFolder(path) {
  const rel = normalizeRel(path);
  return rel.includes('/') ? rel.split('/')[0] : '(root)';
}

function shouldExcludeByName(path) {
  const rel = normalizeRel(path);
  return excludeFilePatterns.some((pattern) => pattern.test(rel));
}

function readText(path) {
  return readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
}

function getHeadings(text) {
  return [...text.matchAll(/^(#{1,4})\s+(.+)$/gm)]
    .slice(0, 30)
    .map((match) => `${match[1]} ${match[2].trim()}`);
}

function getTags(text) {
  const tags = new Set();
  for (const match of text.matchAll(/(^|\s)#([A-Za-z0-9가-힣/_-]+)/g)) {
    tags.add(match[2]);
  }
  return [...tags].slice(0, 40);
}

function getWikiLinks(text) {
  const links = new Set();
  for (const match of text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)) {
    links.add(match[1].trim());
  }
  return [...links].slice(0, 80);
}

function frontmatterKeys(text) {
  if (!text.startsWith('---')) return [];
  const end = text.indexOf('\n---', 3);
  if (end === -1) return [];
  const block = text.slice(3, end);
  return [...block.matchAll(/^([A-Za-z0-9_-]+):/gm)].map((match) => match[1]);
}

function tokens(text) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .split(/[^\p{L}\p{N}_-]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && token.length <= 32)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !stopwords.has(token.toLowerCase()));
}

function countBy(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

const allFiles = walk(vault);
const includedFiles = allFiles.filter((path) => !shouldExcludeByName(path));
const markdownFiles = includedFiles.filter((path) => extname(path).toLowerCase() === '.md');
const excludedByName = allFiles.filter((path) => shouldExcludeByName(path));

const flagged = [];
const safeMarkdown = [];
for (const file of markdownFiles) {
  const text = readText(file);
  const signals = sensitivePatterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
  if (signals.length > 0) flagged.push({ path: normalizeRel(file), signals, size: statSync(file).size });
  else safeMarkdown.push(file);
}

const analyses = safeMarkdown.map((file) => {
  const text = readText(file);
  return {
    path: normalizeRel(file),
    top: topFolder(file),
    name: basename(file, extname(file)),
    size: statSync(file).size,
    headings: getHeadings(text),
    tags: getTags(text),
    links: getWikiLinks(text),
    frontmatter: frontmatterKeys(text),
    tokenCounts: tokens(`${normalizeRel(file)}\n${getHeadings(text).join('\n')}\n${text}`).reduce((map, token) => {
      const key = token.toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map()),
  };
});

const folderCounts = countBy(includedFiles, topFolder);
const mdFolderCounts = countBy(markdownFiles, topFolder);
const safeFolderCounts = countBy(safeMarkdown, topFolder);
const extensionCounts = countBy(includedFiles, (path) => extname(path).toLowerCase() || '(none)');

const titleGroups = countBy(markdownFiles, (path) => basename(path, extname(path)).toLowerCase())
  .filter(([, count]) => count > 1)
  .map(([title]) => markdownFiles.filter((path) => basename(path, extname(path)).toLowerCase() === title).map(normalizeRel));

const globalTerms = new Map();
const folderTerms = new Map();
for (const item of analyses) {
  if (!folderTerms.has(item.top)) folderTerms.set(item.top, new Map());
  for (const [term, count] of item.tokenCounts.entries()) {
    globalTerms.set(term, (globalTerms.get(term) || 0) + count);
    const map = folderTerms.get(item.top);
    map.set(term, (map.get(term) || 0) + count);
  }
}

function topTerms(map, n = 12) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([term]) => term);
}

const clusters = [...folderTerms.entries()]
  .map(([folder, map]) => ({
    folder,
    safeNotes: analyses.filter((item) => item.top === folder).length,
    terms: topTerms(map, 10),
  }))
  .sort((a, b) => b.safeNotes - a.safeNotes);

const tagCounts = new Map();
const linkCounts = new Map();
const fmCounts = new Map();
for (const item of analyses) {
  for (const tag of item.tags) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  for (const link of item.links) linkCounts.set(link, (linkCounts.get(link) || 0) + 1);
  for (const key of item.frontmatter) fmCounts.set(key, (fmCounts.get(key) || 0) + 1);
}

const report = [];
report.push('# Obsidian Vault LLM Wiki Analysis Report');
report.push('');
report.push(`- Vault: \`${vault}\``);
report.push(`- Generated: ${new Date().toISOString()}`);
report.push('- Mode: read-only analysis. Existing vault notes were not modified.');
report.push('- Safety: sensitive matches are reported by signal type only; matched content is not included.');
report.push('');

report.push('## 1. Scope and Safety Gate');
report.push('');
report.push(`- Files after directory/name exclusions: ${includedFiles.length}`);
report.push(`- Markdown candidates: ${markdownFiles.length}`);
report.push(`- Sensitive-gate flagged Markdown: ${flagged.length}`);
report.push(`- Safe Markdown analyzed: ${safeMarkdown.length}`);
report.push(`- Name-pattern excluded files: ${excludedByName.length}`);
report.push('');
report.push('Excluded directories: `.git`, `.obsidian`, `.claude`, `.oc-cache`, `.omc`, `images`, `attachments`, `private`.');
report.push('');
report.push('Flagged files should stay out of LLM body analysis until the signal rules are reviewed. `card-like` is intentionally conservative and may catch technical numeric ranges.');
report.push('');
if (flagged.length > 0) {
  report.push('| File | Signals |');
  report.push('|---|---|');
  for (const item of flagged) report.push(`| \`${item.path}\` | ${item.signals.join(', ')} |`);
  report.push('');
}

report.push('## 2. Vault Structure Diagnosis');
report.push('');
report.push('### File Distribution');
report.push('');
report.push('| Top area | Files | Markdown | Safe Markdown |');
report.push('|---|---:|---:|---:|');
for (const [folder, total] of folderCounts) {
  const md = mdFolderCounts.find(([name]) => name === folder)?.[1] || 0;
  const safe = safeFolderCounts.find(([name]) => name === folder)?.[1] || 0;
  report.push(`| ${folder} | ${total} | ${md} | ${safe} |`);
}
report.push('');
report.push('### Extension Distribution');
report.push('');
report.push('| Extension | Count |');
report.push('|---|---:|');
for (const [extension, count] of extensionCounts) report.push(`| ${extension} | ${count} |`);
report.push('');
report.push('### Diagnosis');
report.push('');
report.push('- The vault already has a PARA-like shape: `Project`, `projects`, `Area`, `Resource`, `Archive`, plus log/personal spaces.');
report.push('- `Resource` and `Project` dominate the analyzable knowledge base and are the best first targets for LLM-wiki indexing.');
report.push('- `Archive` is small by file count but user-confirmed as high-value knowledge; it should be explicitly included and weighted as trusted/reference material.');
report.push('- `Project` and `projects` appear as parallel project namespaces. The index should preserve both paths but report this as a naming normalization candidate.');
report.push('- Root-level pasted images and other binary artifacts should remain excluded from the first MVP. They can be referenced later through attachment metadata only.');
report.push('');

report.push('## 3. Core Topic Clusters');
report.push('');
report.push('| Cluster / area | Safe notes | Representative terms |');
report.push('|---|---:|---|');
for (const cluster of clusters) {
  report.push(`| ${cluster.folder} | ${cluster.safeNotes} | ${cluster.terms.join(', ')} |`);
}
report.push('');
report.push('Recommended initial wiki sections:');
report.push('');
report.push('- AX / agent tooling: Codex, Claude Code, OMX/Ouroboros, prompt workflows.');
report.push('- Research and technical reports: AI model workflow, Google Docs handoff, scenario/report drafts.');
report.push('- Computer vision / model deployment: YOLO, RKNN, quantization, mAP, OD model notes.');
report.push('- Obsidian knowledge management: PARA, MOC, Evergreen Notes, Second Brain, Markdown conventions.');
report.push('- Work and personal logs: include through the sensitive gate only, with low default priority for wiki indexing unless they contain durable knowledge.');
report.push('');

report.push('## 4. Duplicate / Conflict Candidates');
report.push('');
if (titleGroups.length === 0) {
  report.push('- No exact duplicate Markdown basenames were found after case normalization.');
} else {
  report.push('Exact duplicate basenames:');
  for (const group of titleGroups) report.push(`- ${group.map((path) => `\`${path}\``).join(', ')}`);
}
report.push('');
report.push('Structural conflict candidates:');
report.push('');
report.push('- `Project` and `projects`: likely same concept with different casing/language convention. Recommend preserving both initially, then proposing a canonical project namespace.');
report.push('- `daily-logs` and `업무일지`: both are log-like areas. Recommend separate policies: daily logs as chronology, work logs as source material gated for durable knowledge extraction.');
report.push('- `Resource` and `Archive`: user says `Archive` contains important knowledge. Recommend indexing both, with `Archive` marked as curated/reference rather than inactive.');
report.push('');

report.push('## 5. LLM Wiki Index Design');
report.push('');
report.push('Create generated artifacts only, without modifying existing note bodies:');
report.push('');
report.push('- `.llm-wiki/index.json`: file inventory, safety status, cluster assignment, headings, tags, links, timestamps.');
report.push('- `.llm-wiki/metadata-schema.json`: schema version, fields, sensitivity status, source path, confidence, cluster, summary policy.');
report.push('- `.llm-wiki/change-proposals.md`: human-readable proposal list for folder normalization, metadata cleanup, and wiki section creation.');
report.push('- `.llm-wiki/reports/YYYY-MM-DD-vault-analysis.md`: repeatable analysis report snapshots.');
report.push('');
report.push('Index record shape:');
report.push('');
report.push('```json');
report.push(JSON.stringify({
  source_path: 'Resource/AX/Ouroboros.md',
  title: 'Ouroboros',
  safety_status: 'safe|flagged|excluded',
  safety_signals: [],
  cluster: 'AX / agent tooling',
  source_area: 'Resource',
  headings: ['# ...'],
  tags: [],
  links: [],
  summary_model_policy: 'lightweight-first-pass',
  body_modified: false,
}, null, 2));
report.push('```');
report.push('');

report.push('## 6. Metadata Schema');
report.push('');
report.push('| Field | Purpose |');
report.push('|---|---|');
report.push('| `source_path` | Original vault-relative path. |');
report.push('| `source_area` | Top-level folder such as `Resource`, `Project`, `Archive`. |');
report.push('| `safety_status` | `excluded`, `flagged`, `safe`, or `needs-review`. |');
report.push('| `safety_signals` | Signal names only, never matched text. |');
report.push('| `cluster` | LLM-wiki topic cluster. |');
report.push('| `durability` | `reference`, `project`, `log-derived`, `temporary`, or `unknown`. |');
report.push('| `confidence` | Confidence of the cluster/schema assignment. |');
report.push('| `summary_policy` | `metadata-only`, `lightweight-summary`, or `skip-body`. |');
report.push('| `proposed_actions` | Non-destructive suggestions requiring approval. |');
report.push('');

report.push('## 7. Execution Priority');
report.push('');
report.push('1. Build the Obsidian plugin shell with a read-only vault scanner and exclusion settings.');
report.push('2. Implement the local sensitive-information gate and mark files as `safe`, `flagged`, or `excluded`.');
report.push('3. Generate `.llm-wiki/index.json` and `.llm-wiki/change-proposals.md` only after explicit approval.');
report.push('4. Add lightweight-model summarization hooks for safe files only; cache summaries to avoid repeat token cost.');
report.push('5. Add stronger-model final synthesis for cluster naming, conflict review, and build-plan reporting.');
report.push('6. Add a review UI in Obsidian where the user can approve proposed index/metadata generation.');
report.push('');

report.push('## 8. Risk / Sensitive-Info Exclusion Report');
report.push('');
report.push('- Do not send flagged files to an LLM until the user reviews the rule results.');
report.push('- Treat `email`, `phone-kr`, `api-key-token-secret`, `password-credential`, and `private-key` as hard-stop signals by default.');
report.push('- Treat `card-like` as a conservative warning because technical documents often contain long numeric sequences. The plugin should let the user choose whether `card-like` blocks body analysis or only marks `needs-review`.');
report.push('- Keep public publishing out of scope. All generated artifacts should stay local inside the vault unless the user explicitly changes this policy.');
report.push('- Existing note bodies must remain read-only. The plugin should only create index, metadata, and proposal artifacts.');
report.push('');

report.push('## 9. Recommended MVP');
report.push('');
report.push('Build an Obsidian plugin named tentatively `LLM Wiki Planner`. Its first version should not rewrite notes or publish anything. It should scan the vault, apply exclusion and sensitivity rules, show a report, and after approval create only `.llm-wiki` index/metadata/proposal files.');
report.push('');
report.push('The MVP is valuable if it can answer: "What knowledge do I have, what is safe to analyze, how should it become an LLM wiki, and what exact non-destructive steps should I approve next?"');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `\uFEFF${report.join('\n')}\n`, 'utf8');
console.log(outPath);
