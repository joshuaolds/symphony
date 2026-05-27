export const toneLabels = {
  ready: "Ready",
  blocked: "Blocked",
  warning: "Needs review",
  unknown: "Unknown",
  planned: "Planned",
  "needs-service": "Needs service",
  "service-required": "Needs service"
};

export const navItems = [
  ["overview", "Overview", "overview"],
  ["wizard", "Wizard", "wizard"],
  ["configs", "Configs", "configs"],
  ["cli", "CLI parity", "terminal"],
  ["linear", "Linear", "linear"],
  ["run", "Live run", "run"],
  ["agents", "Agents", "agents"],
  ["audit", "Audit", "audit"],
  ["settings", "Settings", "settings"]
];

export const wizardSteps = [
  {
    id: "setup",
    label: "Setup",
    tone: "warning",
    summary: "Prerequisites need local evidence before launch controls unlock.",
    evidence: [
      "WSL path is the approved Symphony control folder",
      "Helper CLI exists and is executable",
      "Secret-backed runtime file is present without rendering contents",
      "Port lease is current for the selected local port"
    ],
    blockers: ["No safe local probe service is connected yet"]
  },
  {
    id: "target",
    label: "Run target",
    tone: "planned",
    summary: "Targets can be drafted, but loading workspace evidence needs the local service.",
    evidence: [
      "Workflow path resolves inside the approved control boundary",
      "Workspace path is readable and not a secret store",
      "Existing saved config has redacted metadata only"
    ],
    blockers: ["No persistence layer or helper bridge is connected yet"]
  },
  {
    id: "preflight",
    label: "Preflight",
    tone: "blocked",
    summary: "Launch remains locked until every safety check has observable evidence.",
    evidence: [
      "Port lease confirmed",
      "1Password readiness confirmed by presence status only",
      "Symphony executable path confirmed",
      "Logs root is inside an approved local path"
    ],
    blockers: ["Runtime checks cannot run from a static browser-only surface"]
  },
  {
    id: "repair",
    label: "Repair",
    tone: "planned",
    summary: "Repair guidance is available as blocker categories, not automated mutation.",
    evidence: [
      "Missing port lease",
      "Missing helper CLI",
      "Unavailable upstream Symphony checkout",
      "Invalid workspace path"
    ],
    blockers: ["Automated fixes need explicit confirmation and a reviewed target path"]
  }
];

export const helperCommands = [
  ["run", "Start the approved Symphony runner command.", "Locked until port lease, path allowlist, and redacted secret checks pass.", "blocked", "Requires explicit launch confirmation"],
  ["show", "Display the active runner configuration.", "May show paths and labels only; never raw secret file contents.", "needs-service", "Read-only"],
  ["update", "Update stored workflow metadata.", "Needs diff preview and field-level validation before writing.", "planned", "Requires write confirmation"],
  ["store", "Save a reusable run target.", "Stores redacted metadata only and rejects credential-like fields.", "planned", "Requires save confirmation"],
  ["list", "List saved run targets and workspaces.", "Read-only listing with stale and unavailable states labeled.", "needs-service", "Read-only"],
  ["load", "Load a saved run target.", "Requires target preview and safe path verification.", "planned", "Requires load confirmation"],
  ["find-sites", "Find candidate local site folders.", "Scoped search only inside approved workspace roots.", "planned", "Requires search scope confirmation"],
  ["move-site", "Move a site into the managed workspace.", "High-friction operation with dry-run, exact target review, and overwrite guard.", "blocked", "Requires destructive-action confirmation"]
].map(([name, intent, safety, tone, confirmation]) => ({ name, intent, safety, tone, confirmation }));

export const fallbackAgents = [
  {
    id: "coordinator",
    name: "Coordinator",
    role: "Run orchestration",
    tone: "unknown",
    activity: "No structured run event is connected.",
    evidence: "Waiting for local event stream or parsed Symphony log evidence."
  },
  {
    id: "implementation",
    name: "Implementation agent",
    role: "Code changes",
    tone: "unknown",
    activity: "Current activity is unavailable from this browser session.",
    evidence: "A local service must provide sanitized activity snapshots."
  },
  {
    id: "review",
    name: "Review agent",
    role: "Validation and review",
    tone: "unknown",
    activity: "No validation feed has been observed.",
    evidence: "Validation evidence should be attached as command, result, and timestamp."
  },
  {
    id: "linear",
    name: "Linear operator",
    role: "Issue state sync",
    tone: "planned",
    activity: "Browser sync is not configured.",
    evidence: "Linear writes stay outside the browser until a safe local bridge exists."
  }
];

export const readiness = [
  ["App source", "React + Vite", "ready", "The browser UI is a React app built by Vite and served by the Node control service."],
  ["Control service", "Lease-gated", "needs-service", "Node serves sanitized status and API contracts only after explicit lease acknowledgement."],
  ["Runner state", "Unknown", "unknown", "The app does not invent Symphony process state without a safe local bridge."],
  ["Secrets", "Redacted only", "ready", "Secret-backed checks are presence, missing, or unavailable states, never raw values."],
  ["Linear sync", "Manual evidence", "planned", "Linear writes remain outside the browser until operator tooling is configured."],
  ["Ubuntu target", "26.04 LTS", "planned", "Docker and server deployment assets are included for Ubuntu 26.04 LTS hosts."]
].map(([label, value, tone, evidence]) => ({ label, value, tone, evidence }));

export function normalizeTone(value) {
  if (value === "observed" || value === "info" || value === "completed") {
    return "ready";
  }

  if (value === "error") {
    return "blocked";
  }

  return toneLabels[value] ? value : "unknown";
}
