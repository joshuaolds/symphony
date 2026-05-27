import { strict as assert } from "node:assert";
import { evaluatePreflight, previewCommand } from "./preflight.mjs";

const blocked = evaluatePreflight({
  workflowPath: "/home/joshuaolds/dev/jeo-symphony/WORKFLOW.md",
  workspacePath: "/home/joshuaolds/code/symphony-workspaces/JEO-368",
  logsRoot: "/tmp/symphony-web-logs",
  port: 0,
  leaseRecorded: false
});

assert.equal(blocked.state, "blocked", "Missing lease and invalid port should block preflight.");
assert.ok(
  blocked.checks.some((check) => check.id === "portLease" && check.state === "blocked"),
  "Preflight must require a port lease."
);

const ready = evaluatePreflight({
  workflowPath: "/home/joshuaolds/dev/jeo-symphony/WORKFLOW.md",
  workspacePath: "/home/joshuaolds/code/symphony-workspaces/JEO-368",
  logsRoot: "/tmp/symphony-web-logs",
  port: 4500,
  leaseRecorded: true,
  helperAvailable: true,
  runtimeAvailable: true,
  secretPresence: "present"
});

assert.equal(ready.state, "ready", "Complete synthetic evidence should produce ready preflight.");

const secretPath = evaluatePreflight({
  workflowPath: "/home/joshuaolds/dev/jeo-symphony/.env.local",
  port: 4500,
  leaseRecorded: true
});
assert.equal(secretPath.state, "blocked", "Secret-bearing paths must block preflight.");

const runPreview = previewCommand({
  command: "run",
  target: {
    workflowPath: "/home/joshuaolds/dev/jeo-symphony/WORKFLOW.md",
    port: 4500,
    leaseRecorded: true
  },
  confirmation: true
});

assert.equal(runPreview.state, "blocked", "Run execution must remain locked in this implementation.");
assert.ok(runPreview.preview.includes("[redacted]"), "Run preview must redact env file references.");

const showPreview = previewCommand({
  command: "show",
  target: {
    workflowPath: "/home/joshuaolds/dev/jeo-symphony/WORKFLOW.md",
    port: 4500,
    leaseRecorded: true,
    helperAvailable: true,
    runtimeAvailable: true,
    secretPresence: "present"
  }
});

assert.equal(showPreview.state, "needs-service", "Show remains service-gated until helper bridge exists.");
assert.deepEqual(
  showPreview.preview,
  ["./symphony-helper/symphony-helper.sh", "show"],
  "Show preview should preserve helper CLI command shape."
);

console.log("Preflight checks passed.");
