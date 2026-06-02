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
- `Personal AI Base: Open chat`
- `Personal AI Base: Run Codex planning`
- `Personal AI Base: Run Claude planning`
- `Personal AI Base: Review latest agent result`

When the plugin is enabled, it also adds:

- a left ribbon icon for opening the right sidebar chat view
- a status bar item showing LLM provider / scan status

The chat surface opens as a right sidebar view, similar to Obsidian Code. The view header includes quick actions for scan, Codex planning, Claude planning, artifact generation, and settings guidance.

## LLM Chat

The chat feature supports OpenAI-compatible chat completion endpoints.

Default local endpoint:

```text
http://localhost:11434/v1/chat/completions
```

This works with local tools that expose an OpenAI-compatible API. External providers can also be configured by changing the endpoint, model, and API key in plugin settings.

Safety behavior:

- LLM calls are disabled by default.
- Chat uses generated scan metadata only.
- Source note bodies are not sent by the MVP chat context.
- `safe` means "passed local rules", not "approved for external LLM transmission".
- External model use is a separate user decision.

## Codex / Claude Code CLI Bridge

The plugin can run Codex or Claude Code as planning agents from Obsidian desktop.

Agent bridge behavior:

- disabled unless you run the command explicitly
- requires a completed vault scan
- asks for approval before launching the CLI
- sends generated scan metadata only
- does not send source note bodies
- writes agent output only under `.llm-wiki/agent-runs/`
- does not apply agent suggestions automatically

Default commands:

```text
codex exec --skip-git-repo-check -
claude -p
```

You can change command paths, arguments, timeout, and context note limits in plugin settings.

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
