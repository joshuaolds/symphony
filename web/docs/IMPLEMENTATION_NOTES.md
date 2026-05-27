# Symphony-Web Implementation Notes

## Scope

This scaffold implements the first local browser surface for `Symphony-Web` inside `web/`.

The current implementation is a dependency-free static browser app using local HTML, CSS, and JavaScript. This replaces the initial Vite/React/TypeScript direction because dependency installation failed in the current workspace with DNS resolution errors against the npm registry.

It does not start Symphony, inspect local processes, read secret-backed files, call Linear, or mutate workspaces from the browser.

## Honest State Boundary

- Launch controls are locked until a safe local control service can provide verified preflight evidence.
- Runtime, logs, per-agent activity, Linear sync, saved targets, and helper command execution are shown as unknown, blocked, planned, or service-required states.
- The helper CLI commands `run`, `show`, `update`, `store`, `list`, `load`, `find-sites`, and `move-site` are represented with their intended safety gates and confirmation requirements.

## Safety Boundary

- No `.env.local` contents are read, copied, rendered, or stored.
- No browser `localStorage` or `sessionStorage` is used.
- No local runtime is started by the app.
- Any future dev server or browser validation must follow the JEO dev-runtime port lease register before binding a port.
- The included static server refuses to bind unless a port and `--lease-ack recorded` are provided.
- The included local API only exposes sanitized `GET /api/status`, `GET /api/commands`, and `GET /api/run` responses.
- The local API also exposes read-only `GET /api/storage`, `GET /api/targets`, and `GET /api/audit` responses when the lease-gated server is running.
- `POST /api/targets` can store metadata only after the caller provides `X-Symphony-Web-Confirm: store-target`; process-control API requests remain locked.
- `GET /api/preflight` reports offline safety checks, and `POST /api/commands/preview` returns redacted helper command previews without executing helper commands.
- `GET /api/events` and `GET /api/agents` expose sanitized observability evidence when provided; without evidence they return unknown and empty states.
- The browser data model documents future `runTarget`, `workspace`, and `auditEvent` records but does not persist them.
- Future local data files should stay out of source control under `.symphony-web-data/`.
- The local store module writes only inside the project data root, rejects credential-like target fields, rejects secret-bearing paths, normalizes ports, and redacts secret-like audit evidence before writing.
- The preflight module requires lease evidence, syntactically valid ports, safe paths, helper/runtime evidence, and secret-presence evidence before reporting ready.
- The observability module parses explicit log/event input, redacts secret-like values, classifies blocked/warning/error/info events, and derives per-agent summaries only from parsed evidence.
- Any future process-control service must enforce path allowlists, redaction, dry-run previews, and high-friction confirmations before writes or launch actions.

## Known Gaps

- A safe local control service is required before Symphony process state, helper CLI execution, logs, per-agent current activity, and Linear sync can become live.
- The current app does not persist configs or saved targets because persistence needs a redacted local data model and storage boundary.
- Desktop and mobile browser screenshots require a leased dev-server port before visual runtime validation.
