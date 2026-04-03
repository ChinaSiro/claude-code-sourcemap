# Agent Guide

## Purpose

This repository is a research workspace for the reconstructed Claude Code `2.1.88` package and its restored TypeScript sources.

There are two distinct runtimes in this repo:

1. `package/`
   The extracted npm package build. This is the stable reference runtime.
2. `restored-src/`
   The reconstructed source tree. This is the active repair target.

Current work is focused on making `restored-src` usable with a custom Anthropic-compatible API backend.

## Current Status

### Working

- Packaged CLI works from `package/cli.js`
- `restored-src` CLI entry can boot from the repo root
- `bun run restored:help`
- `bun run restored:version`
- `bun run restored:cli -- agents`
- `bun run restored:cli -- mcp list`
- `bun run restored:cli -- auth status`
- `bun run restored:cli -- --print --bare "hello"`

### Important runtime facts

- Start `restored-src` from the repository root, not from inside `restored-src`
- Root wrapper scripts avoid Bun nested-cwd noise on Windows
- `restored-src` now supports a `custom` API provider when `ANTHROPIC_BASE_URL` is set to a non-Anthropic host
- `custom` is treated as Anthropic-compatible for model resolution, but not as Anthropic first-party auth

## Recommended Commands

### Packaged CLI

```powershell
cd F:\Projects\claude-code-sourcemap
npm run start -- --help
npm run version:claude
```

### Restored source CLI

```powershell
cd F:\Projects\claude-code-sourcemap
bun run restored:help
bun run restored:version
bun run restored:cli
```

### Custom API mode

```powershell
cd F:\Projects\claude-code-sourcemap
$env:ANTHROPIC_BASE_URL='https://your-gateway.example.com'
$env:ANTHROPIC_API_KEY='your-key'

bun run restored:cli -- auth status
bun run restored:cli -- -p --bare "hello"
```

## Current Custom API Behavior

The active provider logic is centered in:

- [`restored-src/src/utils/model/providers.ts`](./restored-src/src/utils/model/providers.ts)
- [`restored-src/src/cli/handlers/auth.ts`](./restored-src/src/cli/handlers/auth.ts)
- [`restored-src/src/utils/model/model.ts`](./restored-src/src/utils/model/model.ts)
- [`restored-src/src/utils/model/modelOptions.ts`](./restored-src/src/utils/model/modelOptions.ts)

Rules:

- `firstParty`: official Anthropic API behavior
- `custom`: non-Anthropic `ANTHROPIC_BASE_URL`, still Anthropic-compatible request/model shape
- `bedrock` / `vertex` / `foundry`: cloud provider integrations

In `custom` mode:

- `claude auth login` is intentionally disabled
- OAuth-first startup checks are skipped
- default model resolution follows Anthropic-compatible model strings
- status output reports `apiProvider: "custom"`

## Known Constraints

- This is not the original internal repository structure
- Some build-time macros and generated artifacts were reconstructed or stubbed
- Some dependency manifests under `restored-src/node_modules/` were synthesized to make Bun resolution work
- Custom API support currently assumes Anthropic SDK compatibility, not OpenAI Chat Completions compatibility
- More request-path cleanup may still be needed for betas, tool search, and gateway-specific header handling
- Interactive `bun run restored:cli` still has an unresolved REPL first-frame / Ink rendering issue on Windows terminals
- Recent debug logs show `root.render done` without a corresponding first rendered frame, so the remaining blocker is in the interactive render path rather than provider/auth/bootstrap

## Files Worth Checking First

- [`README.md`](./README.md)
- [`package.json`](./package.json)
- [`restored-src/package.json`](./restored-src/package.json)
- [`restored-src/macro-shim.cjs`](./restored-src/macro-shim.cjs)
- [`restored-src/scripts/synthesize-node-module-manifests.cjs`](./restored-src/scripts/synthesize-node-module-manifests.cjs)
- [`restored-src/src/entrypoints/cli.tsx`](./restored-src/src/entrypoints/cli.tsx)
- [`restored-src/src/main.tsx`](./restored-src/src/main.tsx)

## Editing Guidance

- Prefer improving `restored-src` instead of changing packaged output behavior
- Keep `custom` provider separate from `firstParty`
- Treat `custom` as Anthropic-compatible, not as Bedrock/Vertex/Foundry
- Avoid reintroducing Anthropic OAuth assumptions into `custom` flows
- When validating behavior, prefer repo-root wrapper commands

## Verification Checklist

After making changes related to runtime behavior, verify at least:

```powershell
cd F:\Projects\claude-code-sourcemap

bun run restored:help
bun run restored:version
bun run restored:cli -- auth status
bun run restored:cli -- agents
bun run restored:cli -- mcp list
```

For custom API work, also verify:

```powershell
$env:ANTHROPIC_BASE_URL='https://your-gateway.example.com'
$env:ANTHROPIC_API_KEY='your-key'

bun run restored:cli -- auth status
bun run restored:cli -- -p --bare "hello"
```
