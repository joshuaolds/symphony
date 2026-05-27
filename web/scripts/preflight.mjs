import { commandContracts } from "./control-contract.mjs";
import { REDACTED, assertSafePathValue, sanitizeTarget, sanitizeValue } from "./local-store.mjs";

const helperCommandNames = commandContracts.map((command) => command.name);
const highFrictionCommands = new Set(["run", "update", "store", "load", "find-sites", "move-site"]);

export function evaluatePreflight(input = {}) {
  const checks = [
    checkLease(input),
    checkWorkflow(input),
    checkWorkspace(input),
    checkLogsRoot(input),
    checkPort(input),
    checkHelper(input),
    checkRuntime(input),
    checkSecrets(input)
  ];
  const blocked = checks.some((check) => check.state === "blocked");
  const needsService = checks.some((check) => check.state === "needs-service");
  const warning = checks.some((check) => check.state === "warning");

  return {
    state: blocked ? "blocked" : needsService ? "needs-service" : warning ? "warning" : "ready",
    checks,
    evidence:
      "Preflight is an offline safety evaluation. It does not inspect live processes or read secret-backed files."
  };
}

export function previewCommand({ command, target = {}, confirmation = false } = {}) {
  if (!helperCommandNames.includes(command)) {
    return {
      state: "blocked",
      command: command || "unknown",
      reason: "Unknown helper command.",
      preview: []
    };
  }

  const contract = commandContracts.find((item) => item.name === command);
  const preflight = evaluatePreflight(target);
  const needsConfirmation = highFrictionCommands.has(command);
  const blocked = command === "run" || command === "move-site" || preflight.state === "blocked";

  return {
    state: blocked ? "blocked" : needsConfirmation && !confirmation ? "confirmation-required" : contract.state,
    command,
    confirmationRequired: needsConfirmation,
    confirmationSatisfied: Boolean(confirmation),
    reason: blocked
      ? "Execution remains locked until preflight evidence and operator confirmation are available."
      : contract.reason,
    preview: buildPreview(command, target),
    preflight
  };
}

function buildPreview(command, target) {
  const safeTarget = safeTargetPreview(target);

  if (command === "run") {
    return [
      "./symphony-helper/symphony-helper.sh",
      "run",
      "--workflow",
      safeTarget.workflowPath || "WORKFLOW.md",
      "--env-file",
      REDACTED,
      "--port",
      String(safeTarget.port || "lease-required")
    ];
  }

  if (command === "move-site") {
    return [
      "./symphony-helper/symphony-helper.sh",
      "move-site",
      "--source",
      safeTarget.workspacePath || "source-required",
      "--dry-run",
      "--confirm-target",
      "required"
    ];
  }

  return ["./symphony-helper/symphony-helper.sh", command];
}

function safeTargetPreview(target) {
  try {
    return sanitizeTarget(target);
  } catch {
    return Object.fromEntries(
      Object.entries(target || {}).map(([field, value]) => [field, sanitizeValue(field, value)])
    );
  }
}

function checkLease(input) {
  return input.leaseRecorded
    ? pass("portLease", "Port lease is recorded for the selected runtime port.")
    : block("portLease", "A JEO dev-runtime port lease is required before binding a local runtime.");
}

function checkWorkflow(input) {
  if (!input.workflowPath) {
    return block("workflowPath", "Workflow path is required.");
  }

  return safePathCheck("workflowPath", input.workflowPath, "Workflow path is acceptable for metadata use.");
}

function checkWorkspace(input) {
  if (!input.workspacePath) {
    return needsService("workspacePath", "Workspace path requires local service verification.");
  }

  return safePathCheck("workspacePath", input.workspacePath, "Workspace path is acceptable for metadata use.");
}

function checkLogsRoot(input) {
  if (!input.logsRoot) {
    return warn("logsRoot", "Logs root is not selected.");
  }

  return safePathCheck("logsRoot", input.logsRoot, "Logs root is acceptable for metadata use.");
}

function checkPort(input) {
  const port = Number(input.port);

  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    return block("port", "Runtime port must be an integer between 1024 and 65535.");
  }

  return pass("port", "Runtime port is syntactically valid; live listener check is still required.");
}

function checkHelper(input) {
  return input.helperAvailable
    ? pass("helperCli", "Helper CLI availability has been reported.")
    : needsService("helperCli", "Helper CLI availability requires a local service probe.");
}

function checkRuntime(input) {
  return input.runtimeAvailable
    ? pass("symphonyRuntime", "Symphony runtime availability has been reported.")
    : needsService("symphonyRuntime", "Symphony runtime availability requires a local service probe.");
}

function checkSecrets(input) {
  return input.secretPresence === "present"
    ? pass("secretPresence", "Secret-backed runtime file presence was reported without exposing contents.")
    : needsService("secretPresence", "Secret-backed runtime file presence requires a local service probe.");
}

function safePathCheck(id, value, okMessage) {
  try {
    assertSafePathValue(id, value);
    return pass(id, okMessage);
  } catch (error) {
    return block(id, error instanceof Error ? error.message : "Path failed safety checks.");
  }
}

function pass(id, label) {
  return check(id, "ready", label);
}

function block(id, label) {
  return check(id, "blocked", label);
}

function warn(id, label) {
  return check(id, "warning", label);
}

function needsService(id, label) {
  return check(id, "needs-service", label);
}

function check(id, state, label) {
  return { id, state, label };
}
