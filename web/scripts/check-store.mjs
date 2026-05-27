import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendAuditEvent,
  createRunTarget,
  emptyStore,
  readStore,
  removeStore,
  saveRunTarget,
  writeStore
} from "./local-store.mjs";

const projectRoot = mkdtempSync(join(tmpdir(), "symphony-web-store-"));
const dataRoot = ".symphony-web-data";
const fakeSecret = `sk-${"abcdefghijklmnopqrstuvwxyz123456"}`;

try {
  const empty = readStore({ projectRoot, dataRoot });
  assert.equal(empty.state, "empty", "Missing store should report empty state.");
  assert.deepEqual(empty.store.targets, [], "Empty store should not invent targets.");

  const target = createRunTarget({
    label: "Local issue run",
    workflowPath: "/home/joshuaolds/dev/jeo-symphony/WORKFLOW.md",
    workspacePath: "/home/joshuaolds/code/symphony-workspaces/JEO-368",
    logsRoot: "/tmp/symphony-web-logs",
    port: "4500",
    notes: "No credentials in target metadata."
  });

  assert.equal(target.port, 4500, "Ports should be normalized to integers.");

  const auditedStore = appendAuditEvent(
    {
      ...emptyStore(),
      targets: [target]
    },
    {
      type: "target.saved",
      summary: "Stored target metadata",
      evidence: `token=${fakeSecret}`
    }
  );

  const written = writeStore({ projectRoot, dataRoot, store: auditedStore });
  assert.equal(written.state, "ready", "Written store should report ready state.");
  assert.equal(written.store.targets.length, 1, "Written target should be readable.");
  assert.equal(written.store.audit.length, 1, "Written audit event should be readable.");
  assert.match(written.store.audit[0].evidence, /\[redacted\]/, "Audit evidence must redact secret-like values.");

  const saved = saveRunTarget({
    projectRoot,
    dataRoot,
    input: {
      label: "Second local target",
      workflowPath: "/home/joshuaolds/dev/jeo-symphony/WORKFLOW.md",
      workspacePath: "/home/joshuaolds/code/symphony-workspaces/JEO-368"
    }
  });
  assert.equal(saved.storeState.store.targets.length, 2, "Confirmed target save should append metadata.");
  assert.equal(saved.storeState.store.audit.length, 2, "Confirmed target save should append an audit event.");

  assert.throws(
    () =>
      createRunTarget({
        label: "Bad secret field",
        token: "never-store"
      }),
    /cannot be stored/,
    "Credential-like fields must be rejected."
  );

  assert.throws(
    () =>
      createRunTarget({
        label: "Bad path",
        workflowPath: "/home/joshuaolds/dev/jeo-symphony/.env.local"
      }),
    /secret-bearing paths/,
    "Secret-bearing paths must be rejected."
  );

  assert.throws(
    () => readStore({ projectRoot, dataRoot: "../outside" }),
    /inside the Symphony-Web project directory/,
    "Data root must stay inside project."
  );

  console.log("Local store checks passed.");
} finally {
  removeStore({ projectRoot, dataRoot });
}
