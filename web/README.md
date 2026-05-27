# Symphony-Web

`Symphony-Web` is the local browser control console for JEO Technology Symphony operations.

This is the active `JEO-368` implementation workspace.

## Build Target

Create a local browser app that can:

- show the current Symphony configuration and readiness state
- guide setup and run launch through a wizard
- manage saved configs and workspaces safely
- surface Linear project and issue context
- show live run status with per-agent drilldown where observable
- preserve safe equivalents for the existing helper CLI

## Non-Negotiables

- No fake operational status.
- No secrets in UI, logs, source, localStorage, docs, or generated config.
- No public deployment by default.
- No local port binding without the JEO port lease process.
- No destructive actions without explicit confirmation.

## Local Commands

This implementation is dependency-free so it can validate in restricted local workspaces.

- `npm run check` runs syntax, product, local service contract, preflight, local store, observability, secret, accessibility, responsive-layout, and build checks.
- `npm run build` copies the static app into `dist/`.
- `npm run dev -- --port <leased-port> --lease-ack recorded` serves the app on loopback after the JEO port lease process has been completed.

Opening `index.html` directly in a browser also works for static inspection without binding a port.

The local server includes sanitized read-only API routes for status, command contracts, storage, targets, audit, and run state. Target metadata can be saved only with an explicit confirmation header. Process-control routes remain locked.

The browser data model describes future run targets, workspace records, and audit events without using browser persistence or storing operator data.
