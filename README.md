# Personal AI Base for Obsidian

Personal AI Base is an approval-first Obsidian plugin for turning a personal vault into an AI-usable local knowledge base without rewriting existing notes.

The MVP focuses on:

- read-only vault scanning
- local sensitive-information gating
- vault structure and topic diagnosis
- reviewable index / metadata / change-proposal generation
- explicit approval before writing generated artifacts

It is intentionally not an auto-writer. Existing note bodies are treated as read-only sources.

## MVP Commands

- `Personal AI Base: Scan vault`
- `Personal AI Base: Review latest report`
- `Personal AI Base: Generate approved artifacts`

## Safety Defaults

Hard excluded folders:

- `.git`
- `.obsidian`
- `.claude`
- `.oc-cache`
- `.omc`
- `images`
- `attachments`
- `private`

Hard-stop sensitive signals:

- API keys / tokens / secrets
- passwords / credentials
- private keys
- email addresses
- Korean mobile phone numbers

Review-only signals:

- long card-like numeric sequences

`safe` means "passed the local gate"; it does not mean "approved for external LLM transmission".

## Development

Install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

Development watch:

```bash
npm run dev
```

Copy or symlink the built plugin files into a test vault, not your main vault:

```text
<test-vault>/.obsidian/plugins/personal-ai-base/
  manifest.json
  main.js
  styles.css
```

Do not develop directly against a production vault.
