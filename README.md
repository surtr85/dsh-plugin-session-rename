# dsh-plugin-session-rename

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DSH-Plugin-success)](https://github.com/deepseek-ai/deepseek-harness)

Official, lightweight [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) plugin providing AI agents with first-class capabilities to rename conversation threads/sessions autonomously.

---

## ⚡ The Architectural Problem

In standard DeepSeek Harness deployments, session titles are generated once during startup or must be manually edited via the Web UI. Coding agents operating inside DSH have access to filesystem, terminal, and goal tools, but lack an official agent-facing tool to update their own session title as conversation scope evolves.

This plugin bridges that gap cleanly using DSH's native **Cordis IoC** container and **Event-Sourced Session Log**.

## 🛠 How It Works

1. **Cordis Service Injection**: Injects `tools` and `sessionTitle` (`@deepseek-ai/dsh-session-title`) into the plugin context.
2. **Tool Definition**: Mounts `session_rename` into the agent's tool loop via `@deepseek-ai/dsh-tools`:
   ```typescript
   session_rename({ title: "Refactor Auth Middleware" })
   ```
3. **Event-Sourced Commit**: Invokes `sessionTitle.rename(agent.session, title)`, appending an official `session/title` event directly to `session.v4.jsonl.zstd`.
4. **Instant UI Reflection**: The DeepSeek Harness Web GUI reactive projection (`useProjection('title')`) immediately updates the sidebar item in real time without refreshing.

---

## 📦 Installation

### 1. Add to your DSH Web Profile

Navigate to your active DSH profile directory (typically `~/.dsh/profiles/web`):

```bash
cd ~/.dsh/profiles/web
```

Add the dependency to `package.json`:

```json
{
  "dependencies": {
    "dsh-plugin-session-rename": "github:surtr85/dsh-plugin-session-rename"
  }
}
```

Or install via pnpm/npm:

```bash
pnpm add github:surtr85/dsh-plugin-session-rename
```

### 2. Register in `cordis.patch.yml`

Add the plugin to your `~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: plugin-session-rename
      name: "dsh-plugin-session-rename"
```

Restart your `dsh web` instance. Your agent will now see `session_rename` in its tool catalog.

---

## 💻 Standalone CLI Utility

This package also includes `bin/dsh-rename.mjs` for manual or scripted renames outside agent turns:

```bash
# Rename the currently active DSH session
npx dsh-rename "Feature: WebSocket Multiplexer"

# Or rename a specific session ID explicitly
npx dsh-rename session-3090573d-2edd-4f3f-b4f8-3fb9f6e70f20 "Core Refactor"
```

The CLI signs an HMAC-SHA256 browser session cookie using the credentials stored in `~/.dsh/.credentials.yaml` and dispatches a JSON-RPC request directly to the local DSH gateway at `http://127.0.0.1:3080/api/session/rename`.

---

## 🧪 Testing

Run the included test suite:

```bash
node --test test/*.test.mjs
```

---

## 📄 License

MIT © [Sajjad (surtr85)](https://github.com/surtr85)
