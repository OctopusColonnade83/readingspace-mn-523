<p align="center">
  <img src="web/src/assets/about/reading-space-logo.svg" width="112" alt="Reading Space logo">
</p>

<h1 align="center">Reading Space MN</h1>

<p align="center">
  <strong>Keep explanations, Q&amp;A, read-aloud, and research inside your MarginNote reading flow.</strong>
</p>

<p align="center">
  Reading Space MN is a reading-workflow plugin for MarginNote 4. It brings AI tools, an embedded browser, audio read-aloud, and an Obsidian connection beside selections, excerpts, and mind-map cards.
</p>

<p align="center">
  <a href="README.md">简体中文</a> ·
  <strong>English</strong> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.fr.md">Français</a> ·
  <a href="README.ru.md">Русский</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  <a href="#reading-scenarios">Scenarios</a> ·
  <a href="#core-capabilities">Capabilities</a> ·
  <a href="#a-typical-reading-flow">Workflow</a> ·
  <a href="#current-status">Status</a> ·
  <a href="#verify-and-build-from-source">Source build</a> ·
  <a href="#privacy-and-data-boundaries">Privacy</a>
</p>

---

## Keep the next reading action beside the content

While reading a PDF, web page, or note, the next step is often to explain a concept, ask a follow-up question, listen to an excerpt, or check a source on the web. Reading Space MN keeps those actions in one reading workflow, reducing context switches between the reader, browser, AI tools, and note-taking software.

It does not replace MarginNote. It adds focused ways to research, understand, listen to, and retain the material already in front of you.

## Reading scenarios

- Explain, look up, translate, or ask follow-up questions about selected text.
- Read excerpts and mind-map cards aloud, comment on them, or create related cards.
- Open the embedded browser to research or verify information without leaving the reading flow.
- Send valuable excerpts or cards to a local Obsidian ReadingSpace vault.
- Export, import, or manually sync selected plugin settings within explicit data boundaries.

## Core capabilities

| Capability | What it does |
| --- | --- |
| **Selection and card toolbar** | Adds read-aloud, explain, AI Q&amp;A, comment, child-card, and sibling-card actions beside selections, excerpts, and mind-map cards. |
| **AI quick explain and lookup** | Produces concise explanations for a selection or card, with dictionary, translation, and follow-up options. |
| **AI Q&amp;A** | Opens a separate in-app panel using your own provider, model, endpoint, and prompts. |
| **Embedded browser** | Keeps web research in the reading flow and manages a homepage, bookmarks, browsing history, and the current tab. |
| **Audio read-aloud** | Generates audio through a configured TTS provider or local Obsidian bridge and sends it to a separate player. |
| **Obsidian push** | Sends the current excerpt or card to a selected folder in a local Obsidian ReadingSpace vault. |
| **Settings and manual sync** | Manages appearance, AI, browser, audio, and export settings, with manual upload or import for selected iCloud data. |

## A typical reading flow

1. Select text, an excerpt, or a mind-map card in MarginNote.
2. Choose read-aloud, explain, lookup, AI Q&amp;A, or a card action from the Reading Space toolbar.
3. Review the result in the feature panel or player and continue the conversation when needed.
4. Send useful material to local Obsidian, or manually export, upload, and import selected data from Settings.

## Current status

The current public source snapshot is version **0.1.5** and requires **MarginNote 4.2.3 or later** at runtime.

> [!IMPORTANT]
> The formal `0.1.5` `.mnaddon` package is available from [Reading Space MN v0.1.5 on GitHub Releases](https://github.com/Awaker-OTE/readingspace-mn/releases/tag/v0.1.5). Source-built artifacts remain for local development and verification and do not replace the accepted package attached to the Release.

Important operating boundaries:

- AI and TTS features require your own provider, endpoint, API key, or other connection details. No third-party credentials are included.
- Automatic sync is experimental and currently paused. Saving settings does not upload them automatically; manual iCloud upload and import remain available.
- Browser cookies and login state stay on the local device and are excluded from settings export and iCloud sync.
- The local Obsidian bridge is primarily a desktop feature and is unavailable on iPad.
- Behavior may vary with MarginNote version, device, and network environment.

## Verify and build from source

Running the plugin requires MarginNote 4.2.3 or later. Building the public source also requires:

- Node.js 22.12 or later;
- pnpm 10 or later;
- the system `zip` command.

```bash
git clone https://github.com/Awaker-OTE/readingspace-mn.git
cd readingspace-mn
pnpm install --frozen-lockfile
pnpm verify
pnpm build
```

`pnpm verify` checks the public-source boundary, source receipt, and functional contracts. `pnpm build` writes fixed-name and timestamped `.mnaddon` files to `artifacts/`, but does not install the plugin, restart MarginNote, write to the Desktop, or call internal publishing services.

The public build exists for reproducibility and regression testing. It does not replace an accepted formal release artifact.

## Verifiable source provenance

This repository is a managed public mirror. Product source is exported from one complete internal Git commit, and `PUBLIC_SOURCE.json` records the source commit, version, managed files, and per-file SHA-256 values.

Check the public snapshot against that receipt with:

```bash
pnpm verify:source-snapshot
```

Product files under `src/`, `web/`, and the managed contract scripts are not developed independently in this mirror. Public-only README, CI, security policy, and side-effect-free build wrapper may be maintained separately, but they do not change runtime product behavior.

## Privacy and data boundaries

- The repository contains no user API keys, Bridge tokens, browser cookies, chat history, or other user data.
- Browser login state stays local and is excluded from settings export and iCloud sync.
- Sensitive sync categories must be selected explicitly and uploaded or imported manually.
- Do not paste secrets, tokens, cookies, private documents, or real user data into public Issues, logs, or screenshots.
- Report security concerns according to [SECURITY.md](SECURITY.md); do not disclose vulnerability details or unredacted evidence publicly.

## License and independence

The source is public for viewing and security review only; this is **not open-source software**. Except where required by applicable law or permitted by the GitHub Terms of Service, no permission is granted to copy, modify, distribute, sublicense, sell, or create derivative works. See [LICENSE](LICENSE) for the complete terms.

Reading Space MN is independently designed and implemented. It is not an official product of MarginNote, OpenAI, ChatGPT, Obsidian, or any other third-party service, and does not imply endorsement, partnership, or a compatibility commitment. Third-party names and trademarks belong to their respective owners.
