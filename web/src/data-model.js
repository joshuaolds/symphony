(function attachDataModel(root) {
  const dataModel = {
    version: "0.1.0",
    persistence: {
      state: "not-connected",
      browserStorage: "disabled",
      owner: "future local control service",
      records: [
        {
          name: "runTarget",
          keys: ["id", "label", "workflowPath", "workspacePath", "logsRoot", "port", "updatedAt"],
          secretPolicy: "reject credential-like fields before persistence"
        },
        {
          name: "workspace",
          keys: ["id", "label", "rootPath", "lastObservedAt", "state"],
          secretPolicy: "store local path metadata only"
        },
        {
          name: "auditEvent",
          keys: ["id", "type", "summary", "actor", "createdAt", "evidence"],
          secretPolicy: "redact sensitive payloads before append"
        }
      ]
    },
    redaction: {
      replacement: "[redacted]",
      blockedFieldNames: [
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
      ],
      blockedPathNames: [".env", ".env.local", ".dev.vars", "id_rsa", "id_ed25519"]
    },
    pathPolicy: {
      state: "service-required",
      allowedRootLabels: ["Symphony control folder", "issue workspace", "approved logs root"],
      deniedRootLabels: ["browser profile", "credential store", "Windows user profile", "global shell config"]
    },
    auditTypes: [
      "service.started",
      "service.refused_bind",
      "target.drafted",
      "target.saved",
      "run.preflight_blocked",
      "run.launch_requested",
      "command.previewed",
      "command.blocked",
      "redaction.applied"
    ],
    apiRoutes: [
      {
        method: "GET",
        path: "/api/status",
        state: "implemented",
        contract: "sanitized service, runner, and safety state"
      },
      {
        method: "GET",
        path: "/api/commands",
        state: "implemented",
        contract: "helper command parity states and safety reasons"
      },
      {
        method: "POST",
        path: "/api/commands/preview",
        state: "implemented",
        contract: "redacted command preview without execution"
      },
      {
        method: "GET",
        path: "/api/preflight",
        state: "implemented",
        contract: "offline launch safety checks"
      },
      {
        method: "GET",
        path: "/api/storage",
        state: "implemented",
        contract: "redacted store state and record counts"
      },
      {
        method: "GET",
        path: "/api/targets",
        state: "implemented",
        contract: "redacted run target records"
      },
      {
        method: "POST",
        path: "/api/targets",
        state: "metadata-only",
        contract: "confirmed run target metadata persistence inside local data root"
      },
      {
        method: "GET",
        path: "/api/audit",
        state: "implemented",
        contract: "redacted audit event summaries"
      },
      {
        method: "GET",
        path: "/api/run",
        state: "implemented",
        contract: "unknown run state with empty events until live stream exists"
      },
      {
        method: "GET",
        path: "/api/events",
        state: "implemented",
        contract: "sanitized event timeline derived from provided evidence"
      },
      {
        method: "GET",
        path: "/api/agents",
        state: "implemented",
        contract: "per-agent summaries derived from sanitized event evidence"
      },
      {
        method: "GET",
        path: "/api/completed-runs",
        state: "implemented",
        contract: "last three completed runs derived from sanitized completion evidence"
      },
      {
        method: "GET",
        path: "/api/linear",
        state: "implemented",
        contract: "safe Linear issue plan, duplicate guard, and draft actions"
      },
      {
        method: "POST",
        path: "/api/run",
        state: "locked",
        contract: "future launch endpoint requiring preflight and explicit confirmation"
      }
    ]
  };

  root.SymphonyWebData = Object.freeze(dataModel);
})(globalThis);
