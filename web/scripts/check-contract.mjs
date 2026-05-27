import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { commandContracts, resolveApiRoute } from "./control-contract.mjs";

const root = resolve(import.meta.dirname, "..");
const dataModel = readFileSync(resolve(root, "src/data-model.js"), "utf8");
const helperCommands = ["run", "show", "update", "store", "list", "load", "find-sites", "move-site"];

assert.deepEqual(
  commandContracts.map((command) => command.name),
  helperCommands,
  "Helper command contract must preserve existing CLI command names."
);

const status = resolveApiRoute({
  method: "GET",
  pathname: "/api/status",
  host: "127.0.0.1",
  port: 4800
});
assert.equal(status.status, 200, "Status route should be available.");
assert.equal(status.body.product, "Symphony-Web", "Status route must identify the product.");
assert.equal(status.body.runner.state, "unknown", "Runner state must remain honest until probed.");
assert.equal(status.body.safety.publicExposure, "not configured", "Service must stay local-only.");

const preflight = resolveApiRoute({
  method: "GET",
  pathname: "/api/preflight",
  host: "127.0.0.1",
  port: 4800,
  preflight: {
    state: "blocked",
    checks: [{ id: "portLease", state: "blocked", label: "Lease required" }]
  }
});
assert.equal(preflight.status, 200, "Preflight route should be available.");
assert.equal(preflight.body.state, "blocked", "Preflight route should preserve evaluated state.");

const preview = resolveApiRoute({
  method: "POST",
  pathname: "/api/commands/preview",
  host: "127.0.0.1",
  port: 4800,
  commandPreview: {
    state: "blocked",
    command: "run",
    preview: ["./symphony-helper/symphony-helper.sh", "run"],
    reason: "Locked"
  }
});
assert.equal(preview.status, 200, "Command preview route should be available.");
assert.equal(preview.body.state, "blocked", "Command preview route should preserve locked state.");

const commands = resolveApiRoute({
  method: "GET",
  pathname: "/api/commands",
  host: "127.0.0.1",
  port: 4800
});
assert.equal(commands.status, 200, "Command contract route should be available.");
assert.equal(commands.body.commands.length, helperCommands.length, "All helper commands must be represented.");

const storage = resolveApiRoute({
  method: "GET",
  pathname: "/api/storage",
  host: "127.0.0.1",
  port: 4800,
  storeState: {
    state: "ready",
    pathState: "inside-project",
    store: {
      targets: [{ label: "Target" }],
      audit: [{ type: "target.saved" }]
    }
  }
});
assert.equal(storage.status, 200, "Storage route should be available.");
assert.equal(storage.body.targets, 1, "Storage route must expose redacted target count.");
assert.equal(storage.body.auditEvents, 1, "Storage route must expose audit count.");

const targets = resolveApiRoute({
  method: "GET",
  pathname: "/api/targets",
  host: "127.0.0.1",
  port: 4800,
  storeState: {
    state: "ready",
    store: {
      targets: [{ label: "Target" }],
      audit: []
    }
  }
});
assert.equal(targets.body.targets.length, 1, "Targets route should return redacted targets.");

const run = resolveApiRoute({
  method: "GET",
  pathname: "/api/run",
  host: "127.0.0.1",
  port: 4800
});
assert.equal(run.body.state, "unknown", "Run route must not invent active run state.");
assert.deepEqual(run.body.events, [], "Run route must not invent events.");

const observedRun = resolveApiRoute({
  method: "GET",
  pathname: "/api/run",
  host: "127.0.0.1",
  port: 4800,
  observability: {
    state: "observed",
    events: [{ id: "event-1", summary: "Observed" }],
    agents: [{ id: "Coordinator", status: "observed" }],
    evidence: "Parsed evidence"
  }
});
assert.equal(observedRun.body.state, "observed", "Run route should expose observed sanitized evidence.");
assert.equal(observedRun.body.events.length, 1, "Observed run route should include events.");

const completedRuns = resolveApiRoute({
  method: "GET",
  pathname: "/api/completed-runs",
  host: "127.0.0.1",
  port: 4800,
  observability: {
    completedRuns: [
      { id: "completed-1", title: "One" },
      { id: "completed-2", title: "Two" },
      { id: "completed-3", title: "Three" },
      { id: "completed-4", title: "Four" }
    ]
  }
});
assert.equal(completedRuns.status, 200, "Completed-runs route should be available.");
assert.equal(completedRuns.body.runs.length, 3, "Completed-runs route must cap output to three.");

const blockedMutation = resolveApiRoute({
  method: "POST",
  pathname: "/api/run",
  host: "127.0.0.1",
  port: 4800
});
assert.equal(blockedMutation.status, 423, "Mutation routes must be locked.");
assert.equal(blockedMutation.body.state, "locked", "Mutation route body must report locked state.");

for (const key of [
  "runTarget",
  "workspace",
  "auditEvent",
  "blockedFieldNames",
  "/api/storage",
  "/api/preflight",
  "/api/commands/preview",
  "/api/events",
  "/api/agents",
  "/api/completed-runs",
  "apiRoutes"
]) {
  assert.match(dataModel, new RegExp(key), `Data model must include ${key}.`);
}

console.log("Control contract checks passed.");
