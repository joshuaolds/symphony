import { useEffect, useMemo, useState } from "react";
import {
  fallbackAgents,
  helperCommands,
  navItems,
  normalizeTone,
  readiness,
  toneLabels,
  wizardSteps
} from "./model.js";

const offlineLinearPlan = {
  issue: { identifier: "JEO-368" },
  duplicates: [],
  actions: [
    {
      id: "refresh-linked-issue",
      state: "service-required",
      reason: "Linear data requires configured operator tools."
    },
    {
      id: "create-follow-up",
      state: "blocked",
      reason: "Browser-side Linear writes are disabled."
    }
  ],
  evidence: "Linear browser integration is a safe draft only; no token or write is available here."
};

export function App() {
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeWizard, setActiveWizard] = useState("setup");
  const [activeCommand, setActiveCommand] = useState("run");
  const [activeAgent, setActiveAgent] = useState("coordinator");
  const [service, setService] = useState({
    state: "needs-service",
    value: "Not connected",
    evidence: "No sanitized local control service status is available in this browser session."
  });
  const [storage, setStorage] = useState({
    state: "needs-service",
    value: "Not connected",
    evidence: "Local target storage is available only through the lease-gated control service."
  });
  const [preflight, setPreflight] = useState();
  const [events, setEvents] = useState([]);
  const [agents, setAgents] = useState(fallbackAgents);
  const [completedRuns, setCompletedRuns] = useState({
    state: "unknown",
    runs: [],
    evidence: "No completed-run evidence is available until the local observability source reports it."
  });
  const [linear, setLinear] = useState(offlineLinearPlan);

  useEffect(() => {
    if (!["http:", "https:"].includes(window.location.protocol)) {
      return;
    }

    let cancelled = false;

    async function loadService() {
      try {
        const status = await fetchJson("/api/status");
        if (status?.service?.state !== "online") {
          return;
        }

        const [storageState, preflightState, eventState, agentState, completedState, linearState] =
          await Promise.all([
            fetchJson("/api/storage"),
            fetchJson("/api/preflight"),
            fetchJson("/api/events"),
            fetchJson("/api/agents"),
            fetchJson("/api/completed-runs"),
            fetchJson("/api/linear")
          ]);

        if (cancelled) {
          return;
        }

        setService({
          state: "ready",
          value: "Service online",
          evidence: status.service.evidence || "Local loopback control service responded with sanitized status."
        });
        setStorage({
          state: storageState.state === "ready" ? "ready" : "unknown",
          value: `${storageState.targets} targets, ${storageState.auditEvents} audit events`,
          evidence: storageState.evidence
        });
        setPreflight(preflightState);
        setEvents(eventState.events || []);
        setAgents(normalizeAgents(agentState.agents));
        setCompletedRuns(completedState);
        setLinear(linearState);
      } catch {
        setPreflight();
        setEvents([]);
        setAgents(fallbackAgents);
        setCompletedRuns({
          state: "unknown",
          runs: [],
          evidence: "No completed-run evidence is available until the local observability source reports it."
        });
        setLinear(offlineLinearPlan);
      }
    }

    void loadService();
    const timer = window.setInterval(loadService, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const sectionTitle = navItems.find(([id]) => id === activeSection)?.[1] || "Overview";
  const wizard = wizardSteps.find((step) => step.id === activeWizard) || wizardSteps[0];
  const command = helperCommands.find((item) => item.name === activeCommand) || helperCommands[0];
  const agent = agents.find((item) => item.id === activeAgent) || agents[0] || fallbackAgents[0];

  return (
    <div className="app-shell" data-app>
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="sidebar-header">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true"><Icon name="brand" /></div>
            <div>
              <p className="eyebrow">JEO Technology</p>
              <h1>Symphony-Web</h1>
            </div>
          </div>
          <button
            className="mobile-menu-button"
            type="button"
            aria-controls="primary-nav"
            aria-expanded={mobileNavOpen}
            aria-label="Toggle primary navigation"
            onClick={() => setMobileNavOpen((isOpen) => !isOpen)}
          >
            <Tooltip label={mobileNavOpen ? "Close navigation" : "Open navigation"}>
              <Icon name={mobileNavOpen ? "close" : "menu"} />
            </Tooltip>
          </button>
        </div>
        <nav className="nav-list" id="primary-nav" data-open={mobileNavOpen}>
          {navItems.map(([id, label, glyph]) => (
            <button
              className="nav-item"
              data-section-target={id}
              data-active={activeSection === id}
              type="button"
              aria-pressed={activeSection === id}
              key={id}
              onClick={() => {
                setActiveSection(id);
                setMobileNavOpen(false);
              }}
            >
              <Tooltip label={label} focusable={false}>
                <span className="nav-glyph" aria-hidden="true"><Icon name={glyph} /></span>
              </Tooltip>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-status" aria-label="Runtime boundary">
          <Tooltip label="Local-only runtime boundary">
            <span className="status-symbol" aria-hidden="true"><Icon name="lock" /></span>
          </Tooltip>
          <div>
            <strong>Local only</strong>
            <span>No public endpoint configured</span>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Control console</p>
            <h2>{sectionTitle}</h2>
          </div>
          <div className="topbar-actions">
            <StatusPill tone="warning" label="Lease required" tooltip="A port lease must be recorded before binding a local runtime." />
            <button className="icon-button" type="button" aria-label="Refresh evidence" disabled>
              <Tooltip label="Refresh evidence is disabled until the local service is connected.">
                <Icon name="refresh" />
              </Tooltip>
            </button>
          </div>
        </header>

        {activeSection === "overview" && <Overview service={service} storage={storage} />}
        {activeSection === "wizard" && (
          <Wizard wizard={wizard} activeWizard={activeWizard} onSelectWizard={setActiveWizard} />
        )}
        {activeSection === "configs" && <Configs />}
        {activeSection === "cli" && (
          <CliParity command={command} activeCommand={activeCommand} onSelectCommand={setActiveCommand} />
        )}
        {activeSection === "linear" && <LinearPanel linear={linear} />}
        {activeSection === "run" && (
          <LiveRun preflight={preflight} events={events} completedRuns={completedRuns} />
        )}
        {activeSection === "agents" && (
          <Agents agents={agents} activeAgent={activeAgent} agent={agent} onSelectAgent={setActiveAgent} />
        )}
        {activeSection === "audit" && <Audit />}
        {activeSection === "settings" && <SettingsPanel />}
      </main>
    </div>
  );
}

function Overview({ service, storage }) {
  return (
    <section className="content-grid overview-grid" data-section="overview" aria-labelledby="overview-heading">
      <div className="hero-band">
        <div>
          <p className="eyebrow">Issue workspace</p>
          <h3 id="overview-heading">Symphony-Web</h3>
          <p>Local React control console for safe Symphony setup, run visibility, Linear context, and operator evidence.</p>
        </div>
        <div className="hero-actions">
          <ActionButton className="primary-action" tooltip="Launch unlocks only after lease, path, and redaction preflight evidence passes.">
            Launch locked
          </ActionButton>
          <ActionButton className="secondary-action" tooltip="Connect service needs the Node control service to be running over HTTP.">
            Connect service
          </ActionButton>
        </div>
      </div>

      <div className="metric-grid" aria-label="Readiness evidence">
        {readiness.map((item) => <MetricCard item={item} key={item.label} />)}
        <MetricCard item={{ label: "Control service", value: service.value, tone: service.state, evidence: service.evidence }} />
        <MetricCard item={{ label: "Local store", value: storage.value, tone: storage.state, evidence: storage.evidence }} />
      </div>

      <div className="split-grid">
        <Panel title="Launch Gate" glyph="GT">
          <GateList />
        </Panel>
        <Panel title="Run Signal" glyph="RS">
          <EmptyState title="No active run evidence" detail="A local service must provide sanitized process, log, and event data before run state appears here." />
        </Panel>
      </div>
    </section>
  );
}

function Wizard({ wizard, activeWizard, onSelectWizard }) {
  return (
    <section className="content-grid" data-section="wizard">
      <div className="stepper" aria-label="Wizard steps">
        {wizardSteps.map((step, index) => (
          <button
            className="step-button"
            data-active={activeWizard === step.id}
            type="button"
            aria-pressed={activeWizard === step.id}
            key={step.id}
            onClick={() => onSelectWizard(step.id)}
          >
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
            <StatusPill tone={step.tone} />
          </button>
        ))}
      </div>
      <Panel title={wizard.label} glyph="wizard" tone={wizard.tone} wide>
        <p className="lead">{wizard.summary}</p>
        <div className="two-column">
          <EvidenceList title="Required Evidence" items={wizard.evidence} />
          <EvidenceList title="Blocked By" items={wizard.blockers} tone="blocked" />
        </div>
        <div className="action-strip">
          <ActionButton className="secondary-action" tooltip="Draft saving waits for a redacted local persistence boundary.">
            Save draft
          </ActionButton>
          <ActionButton className="primary-action" tooltip="Wizard continuation stays locked until required evidence is present.">
            Continue locked
          </ActionButton>
        </div>
      </Panel>
    </section>
  );
}

function Configs() {
  return (
    <section className="content-grid" data-section="configs">
      <div className="split-grid">
        <Panel title="Active Config" glyph="configs" tone="unknown">
          <DefinitionList rows={[
            ["Workflow", "WORKFLOW.md from issue context; not probed by the browser."],
            ["Runner root", "Approved control folder must be verified by local service before launch."],
            ["Secrets", "Presence checks only. Raw values are never rendered."]
          ]} />
        </Panel>
        <Panel title="Saved Targets" glyph="database" tone="needs-service">
          <EmptyState title="No target store connected" detail="Saved targets need a local persistence boundary with redaction and path validation." />
        </Panel>
      </div>
    </section>
  );
}

function CliParity({ command, activeCommand, onSelectCommand }) {
  const preview = buildOfflinePreview(command.name);

  return (
    <section className="content-grid cli-layout" data-section="cli">
      <div className="command-list" aria-label="Helper commands">
        {helperCommands.map((item) => (
          <button
            className="command-button"
            data-active={activeCommand === item.name}
            type="button"
            aria-pressed={activeCommand === item.name}
            key={item.name}
            onClick={() => onSelectCommand(item.name)}
          >
            <Tooltip label={`${item.name} command`} focusable={false}>
              <span className="nav-glyph" aria-hidden="true"><Icon name="terminal" /></span>
            </Tooltip>
            <span>{item.name}</span>
            <StatusPill tone={item.tone} tooltip={item.safety} focusable={false} />
          </button>
        ))}
      </div>
      <Panel title={command.name} glyph="terminal" tone={command.tone}>
        <DefinitionList rows={[
          ["Intent", command.intent],
          ["Safety", command.safety],
          ["Confirmation", command.confirmation]
        ]} />
        <div className="preview-box" aria-label="Command preview">
          <div className="preview-heading">
            <strong>Preview</strong>
            <StatusPill tone={preview.state} label={preview.state} tooltip="Preview is generated without executing the helper command." />
          </div>
          <pre className="log-window" data-command-preview>{preview.preview.join(" ")}</pre>
        </div>
        <div className="action-strip">
          <ActionButton className="secondary-action" tooltip="Dry-run execution requires the local service bridge.">
            Dry run
          </ActionButton>
          <ActionButton className="primary-action danger" tooltip="Execution stays locked until explicit confirmation and preflight evidence pass.">
            Execution locked
          </ActionButton>
        </div>
      </Panel>
    </section>
  );
}

function LinearPanel({ linear }) {
  return (
    <section className="content-grid" data-section="linear">
      <Panel title="Linear Issue" glyph="linear" tone="planned" wide>
        <DefinitionList rows={[
          ["Identifier", linear.issue?.identifier || "JEO-368"],
          ["Status source", linear.evidence || "Linear state is updated by configured operator tools, not by this browser session."],
          ["Duplicate guard", linear.duplicates?.length ? `${linear.duplicates.length} possible duplicate issue(s) require review.` : "No duplicate candidates are present in the current safe plan."]
        ]} />
        <div className="linear-action-list">
          {(linear.actions || []).map((action) => (
            <EvidenceRow key={action.id} tone={normalizeTone(action.state)} strong={action.id} text={action.reason} />
          ))}
        </div>
        <div className="action-strip">
          <ActionButton className="secondary-action" tooltip="Linear refresh needs configured operator tooling.">
            Refresh linked issue
          </ActionButton>
          <ActionButton className="primary-action" tooltip="Follow-up creation is locked to avoid browser-side Linear writes.">
            Create follow-up locked
          </ActionButton>
        </div>
      </Panel>
    </section>
  );
}

function LiveRun({ preflight, events, completedRuns }) {
  return (
    <section className="content-grid" data-section="run">
      <div className="split-grid">
        <Panel
          title="Symphony Status"
          subtitle="JEO Technology"
          glyph="run"
          tone="unknown"
        >
          <EmptyState title="No sanitized run stream" detail="Process, timeline, logs, and validation evidence remain empty until a local bridge reports them." />
          <div className="run-control-strip" aria-label="Safe run controls">
            <ActionButton className="primary-action" tooltip="Start requires preflight, lease evidence, and explicit confirmation.">
              Start locked
            </ActionButton>
            <ActionButton className="secondary-action" tooltip="Stop is unavailable until a live Symphony process is observed.">
              Stop unavailable
            </ActionButton>
            <ActionButton className="secondary-action" tooltip="Logs open only after sanitized log evidence is connected.">
              Open logs unavailable
            </ActionButton>
          </div>
        </Panel>
        <Panel title="Timeline" glyph="timeline" tone="unknown">
          <div className="timeline-empty">
            <span aria-hidden="true"></span>
            <p>{events.length ? "Sanitized events observed." : "No events observed in this browser session."}</p>
          </div>
          <div className="event-list" data-event-list>
            {events.slice(-8).map((event) => (
              <EvidenceRow key={event.id} tone={normalizeTone(event.level)} text={`${event.timestamp || "unknown"} ${event.agent || "unknown"} ${event.summary}`} />
            ))}
          </div>
          <Preflight preflight={preflight} />
        </Panel>
      </div>
      <Panel title="Last 3 Completed" glyph="complete" tone={completedRuns.runs?.length ? "ready" : "unknown"}>
        <p className="lead">{completedRuns.evidence}</p>
        <div className="completed-run-list">
          {completedRuns.runs?.length ? completedRuns.runs.slice(0, 3).map((run) => (
            <article className="completed-run-row" key={run.id}>
              <StatusDot tone="ready" />
              <div>
                <strong>{run.title || "Completed run"}</strong>
                <span>{run.completedAt || "unknown"} | {run.agent || "unknown"}</span>
                <p>{run.evidence || "Sanitized completion evidence."}</p>
              </div>
            </article>
          )) : <p className="muted-note">No completed runs observed.</p>}
        </div>
      </Panel>
      <Panel title="Log Preview" glyph="log" tone="unknown">
        <pre className="log-window" aria-label="Sanitized log preview">No sanitized log lines are available.</pre>
      </Panel>
    </section>
  );
}

function Agents({ agents, activeAgent, agent, onSelectAgent }) {
  return (
    <section className="content-grid agents-layout" data-section="agents">
      <div className="agent-tabs" aria-label="Agents">
        {agents.map((item) => (
          <button
            className="agent-button"
            data-active={activeAgent === item.id}
            type="button"
            aria-pressed={activeAgent === item.id}
            key={item.id}
            onClick={() => onSelectAgent(item.id)}
          >
            <Tooltip label={`${item.name} drilldown`} focusable={false}>
              <span className="nav-glyph" aria-hidden="true"><Icon name="agents" /></span>
            </Tooltip>
            <span>{item.name}</span>
            <StatusPill tone={normalizeTone(item.tone || item.status)} tooltip={item.evidence} focusable={false} />
          </button>
        ))}
      </div>
      <Panel title={agent.name} glyph="agents" tone={normalizeTone(agent.tone || agent.status)}>
        <DefinitionList rows={[
          ["Role", agent.role],
          ["Current activity", agent.activity],
          ["Evidence", agent.evidence]
        ]} />
        <div className="agent-evidence-list">
          {agents.map((item) => (
            <EvidenceRow key={item.id} tone={normalizeTone(item.tone || item.status)} strong={item.name} text={item.evidence} />
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Audit() {
  const rows = [
    ["Scaffold boundary", "Source changes are scoped to web/ in the issue workspace.", "ready"],
    ["Runtime launch", "No runtime process has been started by this app implementation.", "warning"],
    ["Secret handling", "No secret-backed file contents are read, copied, rendered, or stored.", "ready"],
    ["Live telemetry", "No live events have been observed by the browser surface.", "unknown"]
  ];

  return (
    <section className="content-grid" data-section="audit">
      <div className="audit-list" aria-label="Audit trail">
        {rows.map(([title, detail, tone]) => (
          <article className="audit-row" key={title}>
            <Tooltip label={`${title} audit evidence`}>
              <span className="status-symbol" aria-hidden="true"><Icon name="evidence" /></span>
            </Tooltip>
            <div>
              <strong>{title}</strong>
              <p>{detail}</p>
            </div>
            <StatusPill tone={tone} tooltip={detail} />
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsPanel() {
  return (
    <section className="content-grid" data-section="settings">
      <div className="split-grid">
        <Panel title="Redaction" glyph="redaction" tone="ready">
          <EvidenceList title="Applied Rules" items={[
            "No raw secret values in source or UI state",
            "No browser persistence APIs are used",
            "Secret-backed checks are represented by presence, missing, or unavailable"
          ]} />
        </Panel>
        <Panel title="Docker / Ubuntu 26.04 LTS" glyph="server" tone="planned">
          <EvidenceList title="Deployment Boundary" tone="warning" items={[
            "Bind loopback by default for local development",
            "Use explicit server bind acknowledgement before 0.0.0.0 in Docker",
            "Keep secrets outside the image and inject them at runtime"
          ]} />
        </Panel>
      </div>
    </section>
  );
}

function MetricCard({ item }) {
  return (
    <article className="evidence-card">
      <div className="card-heading">
        <span>{item.label}</span>
        <StatusPill tone={item.tone} tooltip={item.evidence} />
      </div>
      <strong>{item.value}</strong>
      <p>{item.evidence}</p>
    </article>
  );
}

function Panel({ title, subtitle, glyph, tone = "unknown", wide = false, children }) {
  return (
    <section className={`panel${wide ? " panel-wide" : ""}`}>
      <div className="panel-heading">
        <Tooltip label={`${title} panel`}>
          <span className="panel-symbol" aria-hidden="true"><Icon name={glyph} /></span>
        </Tooltip>
        <div>
          <h3>{title}</h3>
          {subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
        </div>
        <StatusPill tone={tone} tooltip={`${title}: ${toneLabels[normalizeTone(tone)] || tone}`} />
      </div>
      {children}
    </section>
  );
}

function DefinitionList({ rows }) {
  return (
    <dl className="definition-list">
      {rows.map(([term, detail]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{detail}</dd>
        </div>
      ))}
    </dl>
  );
}

function EvidenceList({ title, items, tone = "ready" }) {
  return (
    <div className="evidence-list">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <StatusDot tone={tone} tooltip={toneLabels[normalizeTone(tone)] || tone} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceRow({ tone, strong, text }) {
  return (
    <div className="agent-evidence-row">
      <StatusDot tone={tone} tooltip={toneLabels[normalizeTone(tone)] || tone} />
      {strong ? <strong>{strong}</strong> : null}
      <span>{text}</span>
    </div>
  );
}

function GateList() {
  return (
    <div className="gate-list">
      {[
        ["Port lease", "Not checked in browser", "warning"],
        ["Secret file", "Presence only, contents hidden", "ready"],
        ["Approved paths", "Requires local service probe", "needs-service"],
        ["Runner command", "Locked until preflight passes", "blocked"]
      ].map(([label, detail, tone]) => (
        <div className="gate-row" key={label}>
          <StatusDot tone={tone} tooltip={detail} />
          <div>
            <strong>{label}</strong>
            <span>{detail}</span>
          </div>
          <StatusPill tone={tone} tooltip={detail} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, detail }) {
  return (
    <div className="empty-state">
      <Tooltip label={title}>
        <div className="empty-icon" aria-hidden="true"><Icon name="empty" /></div>
      </Tooltip>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}

function Preflight({ preflight }) {
  const checks = preflight?.checks?.length
    ? preflight.checks
    : [
        { id: "portLease", state: "blocked", label: "A JEO dev-runtime port lease is required before binding a local runtime." },
        { id: "helperCli", state: "needs-service", label: "Helper CLI availability requires a local service probe." },
        { id: "secretPresence", state: "needs-service", label: "Secret-backed runtime file presence requires a local service probe." }
      ];

  return (
    <>
      <div className="preflight-list" aria-label="Launch preflight">
        <div>
          <StatusDot tone={preflight?.state || "blocked"} tooltip={preflight?.evidence || "Launch checks have not passed."} />
          <strong>Preflight</strong>
          <span>{preflight?.evidence || "Launch checks have not passed."}</span>
        </div>
      </div>
      <div className="preflight-detail">
        {checks.map((check) => (
          <div className="preflight-row" key={check.id}>
            <StatusDot tone={check.state} tooltip={check.label} />
            <strong>{check.id}</strong>
            <span>{check.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function StatusPill({ tone, label, tooltip, focusable = true }) {
  const normalized = normalizeTone(tone);
  const displayLabel = label || toneLabels[normalized] || normalized;
  return (
    <Tooltip label={tooltip || toneLabels[normalized] || normalized} focusable={focusable}>
      <span className="status-pill" data-tone={normalized} aria-label={displayLabel}>
        <span className="status-mark" aria-hidden="true"><Icon name={statusIcons[normalized] || "statusUnknown"} /></span>
        <span className="status-label">{displayLabel}</span>
      </span>
    </Tooltip>
  );
}

function StatusDot({ tone, tooltip, focusable = true }) {
  return (
    <Tooltip label={tooltip || toneLabels[normalizeTone(tone)] || tone} focusable={focusable}>
      <span className="status-dot" data-tone={normalizeTone(tone)} aria-hidden="true" />
    </Tooltip>
  );
}

function ActionButton({ className, tooltip, children }) {
  return (
    <Tooltip label={tooltip}>
      <button className={className} type="button" disabled>
        <span>{children}</span>
      </button>
    </Tooltip>
  );
}

function Tooltip({ label, children, focusable = true }) {
  if (!label) {
    return children;
  }

  return (
    <span className="tooltip" data-tooltip={label} tabIndex={focusable ? 0 : undefined}>
      {children}
    </span>
  );
}

function Icon({ name }) {
  const paths = iconPaths[name] || iconPaths.unknown;

  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths.map((path, index) => (
        <path d={path} key={`${name}-${index}`} />
      ))}
    </svg>
  );
}

const iconPaths = {
  agents: [
    "M7 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M3.5 19c.7-2.8 2-4.2 3.5-4.2s2.8 1.4 3.5 4.2",
    "M13.5 19c.7-2.8 2-4.2 3.5-4.2s2.8 1.4 3.5 4.2"
  ],
  audit: ["M6 4h9l3 3v13H6V4Z", "M14 4v4h4", "M9 12h6", "M9 16h4"],
  brand: ["M5 7.5 12 3l7 4.5v9L12 21l-7-4.5v-9Z", "M8 9.5h8", "M8 14.5h8", "M12 7v10"],
  close: ["M7 7l10 10", "M17 7 7 17"],
  complete: ["M20 7 10 17l-5-5", "M4 20h16"],
  configs: ["M4 7h16", "M7 7v10", "M17 7v10", "M4 17h16", "M10 11h4"],
  database: ["M5 7c0 2 14 2 14 0s-14-2-14 0Z", "M5 7v10c0 2 14 2 14 0V7", "M5 12c0 2 14 2 14 0"],
  empty: ["M6 8h12l2 9H4l2-9Z", "M9 8c.5-2 1.5-3 3-3s2.5 1 3 3", "M9 14h6"],
  evidence: ["M5 5h14v14H5V5Z", "M8 10h8", "M8 14h5", "M16 4v4", "M8 4v4"],
  GT: ["M5 5h14v5c0 4.5-2.3 7.5-7 9-4.7-1.5-7-4.5-7-9V5Z", "M9 12l2 2 4-5"],
  linear: ["M5 19V5", "M5 19h14", "M8 15l3-4 3 2 4-6"],
  lock: ["M7 11V8a5 5 0 0 1 10 0v3", "M6 11h12v9H6v-9Z", "M12 15v2"],
  log: ["M5 5h14v14H5V5Z", "M8 9h8", "M8 13h8", "M8 17h5"],
  menu: ["M5 7h14", "M5 12h14", "M5 17h14"],
  overview: ["M4 5h7v7H4V5Z", "M13 5h7v4h-7V5Z", "M13 11h7v8h-7v-8Z", "M4 14h7v5H4v-5Z"],
  redaction: ["M5 12c2.2-3 4.5-4.5 7-4.5s4.8 1.5 7 4.5c-2.2 3-4.5 4.5-7 4.5S7.2 15 5 12Z", "M4 20 20 4"],
  refresh: ["M18 8a6 6 0 0 0-10.4-2.5L5 8", "M5 4v4h4", "M6 16a6 6 0 0 0 10.4 2.5L19 16", "M19 20v-4h-4"],
  RS: ["M5 17l4-8 4 5 3-3 3 6", "M4 19h16"],
  run: ["M8 5v14l11-7L8 5Z"],
  server: ["M5 6h14v5H5V6Z", "M5 13h14v5H5v-5Z", "M8 8.5h.1", "M8 15.5h.1", "M12 8.5h4", "M12 15.5h4"],
  settings: ["M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", "M12 3v3", "M12 18v3", "M4.2 7.5l2.6 1.5", "M17.2 15l2.6 1.5", "M19.8 7.5 17.2 9", "M6.8 15l-2.6 1.5"],
  statusBlocked: ["M12 4v9", "M12 17h.1", "M5 20h14L12 3 5 20Z"],
  statusPlanned: ["M7 5l10 7-10 7V5Z"],
  statusReady: ["M20 7 10 17l-5-5"],
  statusService: ["M8 12h.1", "M12 12h.1", "M16 12h.1", "M5 6h14v12H5V6Z"],
  statusUnknown: ["M9 9a3 3 0 1 1 5.2 2c-.8.8-2.2 1.2-2.2 2.5", "M12 17h.1"],
  statusWarning: ["M12 4v9", "M12 17h.1", "M5 20h14L12 3 5 20Z"],
  terminal: ["M5 6h14v12H5V6Z", "M8 10l2.5 2L8 14", "M12 15h4"],
  timeline: ["M12 5v14", "M7 8h10", "M7 16h10", "M6 8h.1", "M18 16h.1"],
  unknown: ["M6 6h12v12H6V6Z", "M9 9h6", "M9 15h3"],
  wizard: ["M5 19 19 5", "M14 5h5v5", "M5 5h4", "M5 11h3", "M13 19h6"]
};

const statusIcons = {
  ready: "statusReady",
  blocked: "statusBlocked",
  warning: "statusWarning",
  unknown: "statusUnknown",
  planned: "statusPlanned",
  "needs-service": "statusService"
};

function buildOfflinePreview(command) {
  if (command === "run") {
    return {
      state: "blocked",
      preview: [
        "./symphony-helper/symphony-helper.sh",
        "run",
        "--workflow",
        "/home/joshuaolds/dev/jeo-symphony/WORKFLOW.md",
        "--env-file",
        "[redacted]",
        "--port",
        "lease-required"
      ]
    };
  }

  if (command === "move-site") {
    return {
      state: "blocked",
      preview: [
        "./symphony-helper/symphony-helper.sh",
        "move-site",
        "--source",
        "/home/joshuaolds/code/symphony-workspaces/JEO-368",
        "--dry-run",
        "--confirm-target",
        "required"
      ]
    };
  }

  return {
    state: "planned",
    preview: ["./symphony-helper/symphony-helper.sh", command]
  };
}

function normalizeAgents(apiAgents = []) {
  if (!Array.isArray(apiAgents) || apiAgents.length === 0) {
    return fallbackAgents;
  }

  return apiAgents.map((agent) => ({
    id: agent.id || "unknown",
    name: agent.name || agent.id || "Unknown agent",
    role: agent.role || "Parsed event evidence",
    tone: normalizeTone(agent.status),
    activity: agent.activity || "No current structured activity.",
    evidence: agent.evidence || "No parsed event evidence."
  }));
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${path} ${response.status}`);
  }
  return response.json();
}
