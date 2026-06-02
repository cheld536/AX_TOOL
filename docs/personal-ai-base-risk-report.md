# Personal AI Base for Obsidian - Agent Risk Report

## 1. Review Scope

This report consolidates risk analysis from two delegated agents:

- Security / privacy review
- Product / architecture review

The target product is `Personal AI Base for Obsidian`, an approval-first Obsidian plugin that analyzes a personal vault and generates AI-usable index, metadata, and proposal artifacts without rewriting existing notes.

## 2. Key Judgment

The product should not be framed as an auto-writer. Its first value is safe diagnosis, reviewable planning, and non-destructive metadata generation.

The biggest risk is not whether the plugin can read and classify notes. The biggest risk is accidental leakage through:

- external model calls
- generated metadata
- logs and caches
- over-broad source scans
- automatic escalation from `safe` to LLM-transmitted

## 3. Security / Privacy Risks

### Regex-Based Detection Is Incomplete

The current safety gate can catch obvious signals such as email, Korean phone numbers, private keys, API keys, passwords, and long numeric sequences. It cannot reliably catch:

- names
- employers
- client or partner names
- project-specific identifiers
- internal URLs
- contextual personal information
- semi-identifiers that become sensitive in combination

Mitigation:

- Keep `safe` as "passed local regex gate", not "approved for external LLM".
- Add `needs-review` for ambiguous cases.
- Show users why a file was classified without showing matched content.

### Lightweight Model Does Not Mean Low Risk

Using a cheaper model reduces token cost, but if the model is a cloud endpoint, privacy risk remains.

Mitigation:

- Separate `cost policy` from `privacy policy`.
- Default to no model calls.
- Prefer local model for first-pass summaries.
- Require explicit approval before sending any file content to an external model.

### Prompt Injection Through Notes

Vault notes can contain text that looks like instructions to the model.

Mitigation:

- Wrap note content as untrusted data.
- Keep system/developer prompts separate from note text.
- Never let note content override safety rules.
- For summaries, request extraction only from quoted source blocks.

### Generated Artifacts Can Leak Sensitive Context

Even if matched secrets are not printed, generated artifacts can leak through:

- file paths
- note titles
- tags
- cluster names
- proposal text
- source relationships

Mitigation:

- Treat `.llm-wiki/` as sensitive local output.
- Keep public publishing out of scope.
- Add a "redacted report" option later if sharing is needed.
- Never include sensitive match values, only signal names.

### Caches and Logs Become Secondary Data Stores

Summary caches, model prompts, model responses, and debug logs can preserve sensitive context.

Mitigation:

- Do not log source text.
- Do not log prompts containing note bodies.
- Cache by file hash and derived metadata only.
- Provide cache clear command.
- Keep model response cache disabled until the user opts in.

## 4. Product / Architecture Risks

### `card-like` Over-Blocks Technical Notes

Long numeric sequences are common in technical notes. Treating every `card-like` signal as a hard block will damage recall.

Mitigation:

- Classify `card-like` as `needs-review` by default.
- Allow user to promote individual files or folders after review.
- Keep hard-stop only for stronger signals such as private keys, explicit API tokens, passwords, email, and phone numbers.

### Approval Flow Can Feel Slow

The workflow is intentionally conservative:

1. Scan
2. Review
3. Approve
4. Generate

Risk:

- User may not understand why the product stops before generating useful output.

Mitigation:

- Show progress and classification counts.
- Explain each blocked state.
- Provide clear actions:
  - approve safe files
  - review flagged files
  - generate local artifacts
  - skip model calls

### Generated Output Can Become Confusing

Several generated files may make the vault feel noisy.

Mitigation:

- Keep all output under `.llm-wiki/`.
- Separate:
  - `index.json`
  - `metadata-schema.json`
  - `change-proposals.md`
  - `reports/`
  - `cache/`
- Add a dashboard view in Obsidian instead of forcing users to inspect raw JSON.

### Folder Semantics Are User-Specific

The same folder names may mean different things to different users. In this vault:

- `Archive` is high-value knowledge, not stale material.
- `업무일지` and `개인 기록 노트` should be safety-gated, not excluded.
- `Project` and `projects` may be naming drift, but should not be merged automatically.

Mitigation:

- Do not normalize folders automatically.
- Generate proposals only.
- Let users mark folder roles:
  - source
  - reference
  - project
  - log
  - personal
  - excluded

## 5. MVP Block List

The MVP must not include:

- existing note body modification
- note rewriting
- automatic rename or move
- automatic tag/folder normalization
- public publishing
- external upload
- sharing link generation
- automatic OCR / image ingestion
- automatic PDF body ingestion
- automatic background scan on every save
- vector DB or embedding of flagged files
- sending `flagged` or `needs-review` files to any model
- debug logs containing source text or model prompts
- writes outside `.llm-wiki/`
- automatic promotion from `flagged` to `safe`

## 6. Required Approval Gates

### Gate 1 - Scan Scope

User confirms:

- included folders
- excluded folders
- excluded filename patterns
- whether logs/personal notes are included with safety gate

### Gate 2 - Safety Rules

User confirms:

- hard-stop signals
- review-only signals
- whether `card-like` is warning-only
- whether folder-specific overrides are allowed

### Gate 3 - Model Use

User confirms:

- local-only or cloud model
- provider
- model
- per-run file count / token budget
- whether summaries can be cached

### Gate 4 - Artifact Generation

User confirms writes to:

- `.llm-wiki/index.json`
- `.llm-wiki/metadata-schema.json`
- `.llm-wiki/change-proposals.md`
- `.llm-wiki/reports/...`

### Gate 5 - Proposal Acceptance

User confirms any future change proposal before:

- wiki page creation
- folder normalization
- tag normalization
- metadata edits
- source-derived summaries

## 7. Missing Design Items To Add Before Coding

- exact final product name and plugin ID
- classification state machine
- error and cancellation behavior
- rerun behavior
- cache invalidation by file hash
- allowed write path enforcement
- redacted report mode
- model provider config storage policy
- cost ceiling and batch size limits
- manual override UX for flagged/needs-review files
- rollback or delete-generated-artifacts command

## 8. Recommended Risk-Adjusted MVP

Build the first MVP as a no-model or model-optional plugin:

1. Scan vault locally.
2. Classify files locally.
3. Show report in Obsidian.
4. Let user approve generated local artifacts.
5. Write only `.llm-wiki/` artifacts.

Only after this path is stable should the plugin add:

- local model summaries
- cloud model summaries
- semantic search
- MCP bridge
- generated wiki pages

## 9. Acceptance Criteria For Safety

- The plugin can complete a scan with network disabled.
- Running scan creates no files.
- Running scan modifies no existing notes.
- No source text appears in logs.
- No matched sensitive value appears in reports.
- `card-like` does not block by default unless the user changes policy.
- All writes are blocked unless the path is under `.llm-wiki/`.
- Generated files require explicit approval.
- External model calls are disabled by default.
- The user can clear generated cache and reports.
