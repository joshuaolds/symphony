import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname, resolve, sep } from "node:path";

export const STORE_FILE = "store.json";
export const STORE_VERSION = "0.1.0";
export const REDACTED = "[redacted]";

const blockedFieldNames = [
  "apiKey",
  "authorization",
  "cookie",
  "credential",
  "env",
  "password",
  "privateKey",
  "secret",
  "session",
  "token"
];

const blockedPathNames = [".env", ".env.local", ".dev.vars", "id_rsa", "id_ed25519"];
const secretLikePatterns = [
  /sk-[A-Za-z0-9_-]{20,}/g,
  /OP_SESSION_[A-Z0-9_]*=[^\s]+/g,
  /BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY/g,
  /gh[pousr]_[A-Za-z0-9_]{30,}/g
];

const allowedTargetFields = new Set([
  "id",
  "label",
  "workflowPath",
  "workspacePath",
  "logsRoot",
  "port",
  "notes",
  "createdAt",
  "updatedAt"
]);

export function emptyStore() {
  return {
    version: STORE_VERSION,
    targets: [],
    audit: []
  };
}

export function resolveDataRoot({ projectRoot, dataRoot }) {
  const project = resolve(projectRoot);
  const target = resolve(project, dataRoot || ".symphony-web-data");

  if (!target.startsWith(project + sep)) {
    throw new Error("Data root must stay inside the Symphony-Web project directory.");
  }

  return target;
}

export function storePath({ projectRoot, dataRoot }) {
  return resolve(resolveDataRoot({ projectRoot, dataRoot }), STORE_FILE);
}

export function readStore({ projectRoot, dataRoot }) {
  const file = storePath({ projectRoot, dataRoot });

  if (!existsSync(file)) {
    return {
      state: "empty",
      pathState: "inside-project",
      store: emptyStore()
    };
  }

  const parsed = JSON.parse(readFileSync(file, "utf8"));
  const store = {
    ...emptyStore(),
    ...parsed,
    targets: Array.isArray(parsed.targets) ? parsed.targets.map(redactRecord) : [],
    audit: Array.isArray(parsed.audit) ? parsed.audit.map(redactRecord) : []
  };

  return {
    state: "ready",
    pathState: "inside-project",
    store
  };
}

export function writeStore({ projectRoot, dataRoot, store }) {
  const file = storePath({ projectRoot, dataRoot });
  mkdirSync(dirname(file), { recursive: true });

  const payload = {
    ...emptyStore(),
    ...store,
    version: STORE_VERSION,
    targets: Array.isArray(store.targets) ? store.targets.map(sanitizeTarget) : [],
    audit: Array.isArray(store.audit) ? store.audit.map(sanitizeAuditEvent) : []
  };
  const tempFile = `${file}.${process.pid}.tmp`;

  writeFileSync(tempFile, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  renameSync(tempFile, file);

  return readStore({ projectRoot, dataRoot });
}

export function createRunTarget(input, now = new Date().toISOString()) {
  const target = sanitizeTarget({
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...input
  });

  if (!target.label) {
    throw new Error("Run target label is required.");
  }

  return target;
}

export function appendAuditEvent(store, input, now = new Date().toISOString()) {
  const event = sanitizeAuditEvent({
    id: randomUUID(),
    createdAt: now,
    actor: "local-operator",
    ...input
  });

  return {
    ...store,
    audit: [...(store.audit || []), event]
  };
}

export function saveRunTarget({ projectRoot, dataRoot, input, now = new Date().toISOString() }) {
  const current = readStore({ projectRoot, dataRoot }).store;
  const target = createRunTarget(input, now);
  const nextStore = appendAuditEvent(
    {
      ...current,
      targets: [...current.targets.filter((item) => item.id !== target.id), target]
    },
    {
      type: "target.saved",
      summary: `Stored run target ${target.label}`,
      evidence: "Run target metadata stored after redaction and safe-path checks."
    },
    now
  );
  const written = writeStore({ projectRoot, dataRoot, store: nextStore });

  return {
    target,
    storeState: written
  };
}

export function sanitizeTarget(input) {
  const target = {};

  for (const [field, value] of Object.entries(input || {})) {
    if (!allowedTargetFields.has(field)) {
      if (isBlockedField(field)) {
        throw new Error(`Run target field ${field} cannot be stored.`);
      }
      continue;
    }

    target[field] = sanitizeValue(field, value);
  }

  for (const pathField of ["workflowPath", "workspacePath", "logsRoot"]) {
    if (target[pathField]) {
      assertSafePathValue(pathField, target[pathField]);
    }
  }

  if (target.port !== undefined && target.port !== null && target.port !== "") {
    const port = Number(target.port);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      throw new Error("Run target port must be an integer between 1024 and 65535.");
    }
    target.port = port;
  }

  return target;
}

export function sanitizeAuditEvent(input) {
  return redactRecord({
    id: input.id,
    type: sanitizeValue("type", input.type || "audit.event"),
    summary: sanitizeValue("summary", input.summary || "Audit event"),
    actor: sanitizeValue("actor", input.actor || "local-operator"),
    createdAt: sanitizeValue("createdAt", input.createdAt),
    evidence: sanitizeValue("evidence", input.evidence || "No sensitive payload stored.")
  });
}

export function redactRecord(value) {
  if (Array.isArray(value)) {
    return value.map(redactRecord);
  }

  if (!value || typeof value !== "object") {
    return redactSecretText(value);
  }

  return Object.fromEntries(
    Object.entries(value).map(([field, fieldValue]) => [
      field,
      isBlockedField(field) ? REDACTED : redactRecord(fieldValue)
    ])
  );
}

export function sanitizeValue(field, value) {
  if (isBlockedField(field)) {
    return REDACTED;
  }

  return redactSecretText(value);
}

export function isBlockedField(field) {
  const normalized = String(field).toLowerCase();
  return blockedFieldNames.some((blocked) => normalized.includes(blocked.toLowerCase()));
}

export function assertSafePathValue(field, value) {
  const pathText = String(value);

  if (blockedPathNames.some((blocked) => pathText.includes(blocked))) {
    throw new Error(`${field} cannot reference secret-bearing paths.`);
  }

  if (pathText.includes("\0")) {
    throw new Error(`${field} contains an invalid path character.`);
  }
}

function redactSecretText(value) {
  if (typeof value !== "string") {
    return value;
  }

  return secretLikePatterns.reduce((text, pattern) => text.replace(pattern, REDACTED), value);
}

export function removeStore({ projectRoot, dataRoot }) {
  rmSync(resolveDataRoot({ projectRoot, dataRoot }), { recursive: true, force: true });
}
