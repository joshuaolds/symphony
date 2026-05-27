# Symphony-Web Agent Instructions

This directory is the implementation root for `Symphony-Web`.

## Scope

- Build the local browser-based control console inside this `web/` folder.
- Treat the parent issue workspace as an isolated Symphony-created workspace.
- Do not edit `.env.local`, 1Password state, global shell configuration, browser profiles, SSH keys, or cloud credentials.
- Do not modify generated Symphony workspaces outside this issue workspace unless the issue explicitly asks for that path.

## Product Requirements

- The visible UI title is `Symphony-Web`.
- The app is JEO branded, premium, local-first, mobile friendly, and desktop optimized.
- The app must not show fake operational data.
- Unknown, unavailable, stale, blocked, fixture, and planned states must be labeled honestly.
- The app must include a guided wizard for setup, loading/creating run targets, launch preflight, and blocker repair.
- The live view must support per-agent drilldown where data is observable from logs, events, or safe workspace evidence.
- The app must preserve safe equivalents for the current helper CLI: `run`, `show`, `update`, `store`, `list`, `load`, `find-sites`, and `move-site`.

## Safety Requirements

- Never display or persist secret values.
- Never render raw `.env.local` contents.
- Route secret-backed checks through presence/redacted states only.
- Do not bind a local port without following `/home/joshuaolds/dev/dev-runtime-port-leases.md`.
- Do not run destructive file operations without explicit confirmation and a reviewed target path.
- Do not claim a Symphony run, Linear update, validation result, or agent state succeeded unless it is backed by observable evidence.

## Implementation Direction

- If no app exists yet, scaffold a focused Vite + React + TypeScript + npm app unless local evidence supports a better stack.
- Keep the first implementation local-only.
- Prefer a static frontend with mocked-but-labeled unavailable/planned states until a safe local control service exists.
- Add a local control service only inside an explicit allowlist and redaction boundary.
- Run the smallest relevant validation available before reporting completion.
