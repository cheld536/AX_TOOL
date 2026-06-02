# Personal AI Base for Obsidian - Build Plan

## 1. Product Direction

`Personal AI Base for Obsidian` is a local-first Obsidian plugin that helps turn a personal vault into an AI-usable knowledge base without automatically rewriting existing notes.

The product should absorb useful ideas from existing LLM wiki / AI knowledge-base plugins, but stay differentiated around:

- approval-first workflows
- read-only source note handling
- sensitive-information gating before LLM use
- generated index / metadata / proposal artifacts instead of direct note rewriting
- lightweight-model first-pass reading to reduce token cost
- stronger-model synthesis only for final judgment, cluster naming, conflict review, and planning

## 2. References and Borrowed Ideas

### Auto LLM Wiki

Borrow:

- source notes remain read-only
- model-generated change plans
- preview before write
- apply only after user confirmation
- configurable wiki / index / log paths
- content hashing to skip unchanged files

Avoid or defer:

- automatic wiki page writes as the default first action
- sending selected vault content to a cloud endpoint before a local safety gate

### AI Wiki

Borrow:

- source-to-domain mental model
- local Ollama / OpenAI-compatible backend option
- explicit domain initialization
- operation log / history panel

Avoid or defer:

- creating full wiki pages before the user approves a plan
- broad subprocess/agent execution before clear consent

### Vault Knowledge Base

Borrow:

- local index and retrieval layer
- potential MCP bridge for Codex / Claude / other agents
- refreshable vault index
- Obsidian as the human-facing editing surface

Avoid or defer:

- requiring a separate binary for the first MVP unless plugin-only implementation becomes too limited

### LLM Wiki

Borrow:

- entity / concept / relationship extraction
- local-first model option
- source links for verifiability
- natural-language query over the vault

Avoid or defer:

- background extraction on every save in the first MVP
- full-vault extraction without staged review

## 3. Core User Workflow

1. User opens Obsidian and runs `Personal AI Base: Scan vault`.
2. Plugin applies folder/file exclusions and sensitive-information rules locally.
3. Plugin creates an analysis report in memory and shows it in a review panel.
4. User reviews:
   - vault structure diagnosis
   - core topic clusters
   - duplicate/conflict candidates
   - LLM wiki index design
   - metadata schema
   - execution priority
   - sensitive-info exclusion report
5. User approves generated artifacts.
6. Plugin writes only approved files under `.llm-wiki/`.
7. Later phases may add local summaries, RAG search, MCP bridge, and change-plan previews.

## 4. Non-Negotiable Safety Rules

- Do not modify existing note bodies.
- Do not publish or deploy anything publicly.
- Do not send flagged files to an LLM.
- Do not include matched sensitive content in reports; report signal names only.
- Do not write outside the configured generated-output folder.
- Do not access hidden/plugin/cache folders such as `.obsidian`, `.git`, `.claude`, `.oc-cache`, `.omc`.
- Require explicit approval before writing generated index, metadata, report, or proposal files.

## 5. MVP Scope

### MVP Must Have

- Obsidian plugin shell
- settings tab for exclusions and output folder
- read-only vault scanner using Obsidian Vault APIs
- local sensitive-information gate
- report view inside Obsidian
- approval modal before any write
- generated `.llm-wiki/index.json`
- generated `.llm-wiki/metadata-schema.json`
- generated `.llm-wiki/change-proposals.md`
- generated `.llm-wiki/reports/YYYY-MM-DD-vault-analysis.md`

### MVP Should Not Have

- automatic wiki page generation
- existing note rewrite
- background scan on every save
- public publishing
- cloud model calls by default
- MCP server
- vector database dependency
- image/PDF OCR

## 6. Recommended Plugin Architecture

```text
personal-ai-base/
  manifest.json
  package.json
  tsconfig.json
  esbuild.config.mjs
  src/
    main.ts
    settings.ts
    scanner/
      collectVaultFiles.ts
      exclusions.ts
      safetyGate.ts
    analysis/
      structureReport.ts
      clusterer.ts
      duplicateDetector.ts
      metadataSchema.ts
    output/
      generatedArtifacts.ts
      safeWriter.ts
    ui/
      reportView.ts
      approvalModal.ts
      settingsTab.ts
    types.ts
```

### Key Components

- `collectVaultFiles`: enumerate visible vault files and Markdown candidates.
- `exclusions`: apply folder and filename rules.
- `safetyGate`: scan content locally and classify as `safe`, `flagged`, `excluded`, or `needs-review`.
- `structureReport`: compute folder distribution, Markdown counts, extension counts, and policy notes.
- `clusterer`: first version can be rule/token based; later versions may use embeddings.
- `duplicateDetector`: start with exact basename and path-pattern conflicts.
- `metadataSchema`: define generated index schema.
- `safeWriter`: enforce generated-output-only writes.
- `approvalModal`: blocks writes until user confirms.

## 7. Data Model

```json
{
  "source_path": "Resource/AX/Ouroboros.md",
  "title": "Ouroboros",
  "source_area": "Resource",
  "safety_status": "safe",
  "safety_signals": [],
  "cluster": "AX / agent tooling",
  "durability": "reference",
  "summary_policy": "lightweight-summary",
  "body_modified": false,
  "proposed_actions": []
}
```

## 8. Model Strategy

### Phase 1: No Model Required

The MVP can produce useful reports using local parsing only:

- paths
- folder distribution
- Markdown headings
- tags
- wiki links
- frontmatter keys
- sensitive signal names
- duplicate/conflict candidates

### Phase 2: Lightweight Model

Use only for safe files:

- short summaries
- title normalization suggestions
- topic hints
- metadata suggestions

Cache outputs by file hash.

### Phase 3: Strong Model

Use only on summarized/indexed context:

- final cluster naming
- conflict judgment
- schema refinement
- build-plan generation
- proposal prioritization

## 9. Build Phases

### Phase 0 - Planning Baseline

- Keep the current CLI analysis script as a reference implementation.
- Convert this plan into GitHub issues.
- Decide final plugin ID and display name.

### Phase 1 - Plugin Skeleton

- Scaffold from Obsidian sample plugin.
- Set plugin ID: `personal-ai-base`.
- Add settings and commands:
  - `Personal AI Base: Scan vault`
  - `Personal AI Base: Review latest report`
  - `Personal AI Base: Generate approved artifacts`

### Phase 2 - Read-Only Scanner

- Implement vault enumeration.
- Apply default exclusions:
  - `.git`
  - `.obsidian`
  - `.claude`
  - `.oc-cache`
  - `.omc`
  - `images`
  - `attachments`
  - `private`
  - `*.env`
  - `*secret*`
  - `*password*`
  - `*credential*`
  - `*token*`
  - `*key*`

### Phase 3 - Safety Gate

- Implement local regex signal detection.
- Classify `email`, `phone-kr`, `api-key-token-secret`, `password-credential`, and `private-key` as hard-stop by default.
- Treat `card-like` as `needs-review`, not hard-stop, because technical notes may contain long numeric sequences.
- Treat `safe` as "passed local gate", not "approved for LLM transmission".
- Keep flagged match values out of logs, prompts, reports, and UI previews.

### Phase 4 - Analysis Report

- Generate the same report sections as the first CLI report:
  - vault structure diagnosis
  - topic clusters
  - duplicate/conflict candidates
  - index design
  - metadata schema
  - execution priority
  - risk/sensitive-info exclusion report

### Phase 5 - Approval and Safe Writes

- Show approval modal.
- On approval, write only to `.llm-wiki/`.
- Reject all writes outside `.llm-wiki/`.
- Never call `Vault.modify()` or `Vault.process()` for existing user notes.

### Phase 6 - Lightweight Summaries

- Add model provider settings.
- Default to disabled model calls.
- Support local provider first.
- Add file-hash cache.
- Summarize only safe files.
- Require a separate model-use approval gate before any cloud model call.
- Separate privacy risk from token-cost policy; a cheap cloud model can still leak private data.

### Phase 6A - Chat Surface

- Add `Personal AI Base: Open chat` command.
- Add a ribbon icon for fast access.
- Add a status bar item showing provider and latest scan status.
- Support local and external OpenAI-compatible chat-completion endpoints.
- Default provider remains disabled.
- Chat context must use generated scan metadata only, not source note bodies.
- External model calls require explicit user configuration.

### Phase 7 - Retrieval and Agent Bridge

- Add local search index.
- Consider MCP bridge after MVP is stable.
- Keep write actions disabled by default.

## 10. Acceptance Criteria

- Running scan does not modify the vault.
- Flagged files are never sent to LLM.
- Existing note bodies are never modified.
- Generated files are written only after approval.
- Generated files stay under `.llm-wiki/`.
- User can see why each file is `safe`, `flagged`, `excluded`, or `needs-review`.
- User can re-run analysis without duplicate output noise.
- The report helps answer: "What knowledge do I have, what is safe to analyze, and what should I approve next?"
- Chat can answer using latest scan metadata when an LLM provider is configured.
- Chat does not include source note bodies in the MVP context.

## 11. Approval Gates

### Gate 1 - Scan Scope

The user approves included folders, excluded folders, and filename patterns.

### Gate 2 - Safety Rules

The user approves hard-stop and review-only signals. Default:

- hard-stop: `api-key-token-secret`, `password-credential`, `private-key`, `email`, `phone-kr`
- review-only: `card-like`

### Gate 3 - Artifact Generation

The user approves writing generated files under `.llm-wiki/`.

### Gate 4 - Model Use

The user approves provider, model, files, budget, and cache policy before any LLM call.

### Gate 5 - Future Change Proposal

The user approves any future wiki page creation, folder normalization, tag normalization, or metadata edit.

## 12. Product Risks To Track

- Regex safety gate may miss contextual personal information.
- `card-like` may over-flag technical notes.
- Generated metadata can leak meaning through titles, paths, tags, and clusters.
- Logs and caches can become hidden secondary data stores.
- Approval-heavy UX can feel slow unless the UI clearly explains state and next action.
- Folder semantics are user-specific; never normalize folders automatically.
- Chat UX can imply broader access than it has; clearly label that MVP chat uses metadata context only.

## 13. Source Notes

- Obsidian official plugin docs recommend developing in a separate vault to avoid unintended changes to a main vault.
- Obsidian Vault APIs can enumerate Markdown files and read file content through `cachedRead()`.
- The Vault API also supports modification methods, but this project should avoid modifying existing user notes by policy.
