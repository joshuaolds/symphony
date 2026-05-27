export const commandContracts = [
  {
    name: "run",
    state: "blocked",
    reason: "Launch requires verified port lease, approved paths, redaction checks, and explicit confirmation."
  },
  {
    name: "show",
    state: "needs-service",
    reason: "Configuration display must redact secret-backed values."
  },
  {
    name: "update",
    state: "planned",
    reason: "Writes need a diff preview and field-level validation."
  },
  {
    name: "store",
    state: "planned",
    reason: "Saved targets must store redacted metadata only."
  },
  {
    name: "list",
    state: "needs-service",
    reason: "Target listing needs a redacted local data store."
  },
  {
    name: "load",
    state: "planned",
    reason: "Loading requires target preview and safe path verification."
  },
  {
    name: "find-sites",
    state: "planned",
    reason: "Search scope must stay inside approved workspace roots."
  },
  {
    name: "move-site",
    state: "blocked",
    reason: "Move operations require dry-run, exact target review, overwrite guard, and explicit confirmation."
  }
];

export function statusPayload({ host, port }) {
  return {
    product: "Symphony-Web",
    service: {
      state: "online",
      evidence: "Local loopback control service responded. Runner state remains unknown until safe probes are added."
    },
    runner: {
      state: "unknown",
      evidence: "This service does not inspect Symphony processes, logs, or secret-backed runtime files."
    },
    safety: {
      host,
      port,
      leaseAck: "recorded",
      publicExposure: "not configured"
    }
  };
}

export function commandsPayload() {
  return {
    commands: commandContracts
  };
}

export function runPayload() {
  return {
    state: "unknown",
    agents: "unknown",
    events: [],
    evidence: "No sanitized Symphony run stream is connected."
  };
}

export function eventsPayload(observability) {
  return {
    state: observability?.state || "unknown",
    events: observability?.events || [],
    evidence: observability?.evidence || "No sanitized event evidence has been provided."
  };
}

export function agentsPayload(observability) {
  return {
    state: observability?.state || "unknown",
    agents: observability?.agents || [],
    evidence: observability?.evidence || "No sanitized agent evidence has been provided."
  };
}

export function completedRunsPayload(observability) {
  return {
    state: observability?.completedRuns?.length ? "observed" : "unknown",
    runs: (observability?.completedRuns || []).slice(0, 3),
    evidence: observability?.completedRuns?.length
      ? "Completed runs are derived from sanitized event evidence."
      : "No completed-run evidence has been provided."
  };
}

export function linearPayload(linearPlan) {
  return {
    ...(linearPlan || {
      state: "needs-service",
      issue: {
        identifier: "unknown",
        state: "unknown"
      },
      duplicates: [],
      actions: [
        {
          id: "refresh-linked-issue",
          state: "service-required",
          reason: "Linear data requires configured operator tools."
        }
      ],
      evidence: "No Linear plan evidence has been provided."
    })
  };
}

export function storagePayload(storeState) {
  return {
    state: storeState?.state || "not-connected",
    pathState: storeState?.pathState || "service-required",
    targets: storeState?.store?.targets?.length || 0,
    auditEvents: storeState?.store?.audit?.length || 0,
    evidence:
      storeState?.state === "ready"
        ? "Local redacted store is available inside the Symphony-Web project directory."
        : "No local redacted store has been created yet."
  };
}

export function targetsPayload(storeState) {
  return {
    state: storeState?.state || "not-connected",
    targets: storeState?.store?.targets || [],
    evidence: "Run targets are returned only after redaction and safe-path checks."
  };
}

export function auditPayload(storeState) {
  return {
    state: storeState?.state || "not-connected",
    audit: storeState?.store?.audit || [],
    evidence: "Audit events expose summaries and redacted evidence only."
  };
}

export function preflightPayload(preflight) {
  return {
    ...(preflight || {
      state: "needs-service",
      checks: [],
      evidence: "Preflight has not been evaluated."
    })
  };
}

export function commandPreviewPayload(preview) {
  return {
    ...(preview || {
      state: "blocked",
      command: "unknown",
      preview: [],
      reason: "No command preview was provided."
    })
  };
}

export function lockedPayload() {
  return {
    state: "locked",
    reason: "Mutation and process-control endpoints are not enabled in this implementation."
  };
}

export function missingPayload() {
  return {
    state: "unavailable",
    reason: "No such sanitized local API route."
  };
}

export function resolveApiRoute({
  method,
  pathname,
  host,
  port,
  storeState,
  preflight,
  commandPreview,
  observability,
  linearPlan
}) {
  if (pathname === "/api/status" && method === "GET") {
    return { status: 200, body: statusPayload({ host, port }) };
  }

  if (pathname === "/api/preflight" && method === "GET") {
    return { status: 200, body: preflightPayload(preflight) };
  }

  if (pathname === "/api/commands/preview" && method === "POST") {
    return { status: 200, body: commandPreviewPayload(commandPreview) };
  }

  if (pathname === "/api/storage" && method === "GET") {
    return { status: 200, body: storagePayload(storeState) };
  }

  if (pathname === "/api/targets" && method === "GET") {
    return { status: 200, body: targetsPayload(storeState) };
  }

  if (pathname === "/api/audit" && method === "GET") {
    return { status: 200, body: auditPayload(storeState) };
  }

  if (pathname === "/api/commands" && method === "GET") {
    return { status: 200, body: commandsPayload() };
  }

  if (pathname === "/api/run" && method === "GET") {
    return {
      status: 200,
      body:
        observability?.state === "observed"
          ? {
              state: "observed",
              agents: observability.agents,
              events: observability.events,
              evidence: observability.evidence
            }
          : runPayload()
    };
  }

  if (pathname === "/api/events" && method === "GET") {
    return { status: 200, body: eventsPayload(observability) };
  }

  if (pathname === "/api/agents" && method === "GET") {
    return { status: 200, body: agentsPayload(observability) };
  }

  if (pathname === "/api/completed-runs" && method === "GET") {
    return { status: 200, body: completedRunsPayload(observability) };
  }

  if (pathname === "/api/linear" && method === "GET") {
    return { status: 200, body: linearPayload(linearPlan) };
  }

  if (pathname.startsWith("/api/") && method !== "GET") {
    return { status: 423, body: lockedPayload() };
  }

  if (pathname.startsWith("/api/")) {
    return { status: 404, body: missingPayload() };
  }

  return null;
}
