import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Database,
  EyeOff,
  FileText,
  Gauge,
  GitBranch,
  History,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Monitor,
  Moon,
  PackageOpen,
  Play,
  RefreshCcw,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Terminal,
  Wand2,
  X
} from "lucide-react";
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
  const [themePreference, setThemePreference] = useState("auto");
  const [resolvedTheme, setResolvedTheme] = useState("light");
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

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const nextResolvedTheme = themePreference === "auto" && mediaQuery.matches ? "dark" : themePreference === "dark" ? "dark" : "light";
      document.documentElement.dataset.theme = nextResolvedTheme;
      document.documentElement.dataset.themePreference = themePreference;
      setResolvedTheme(nextResolvedTheme);
    }

    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);

    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [themePreference]);

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
            <ThemeSwitch
              preference={themePreference}
              resolvedTheme={resolvedTheme}
              onChange={setThemePreference}
            />
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
        <div className="hero-copy">
          <p className="eyebrow">Issue workspace</p>
          <h3 id="overview-heading">Symphony-Web</h3>
          <p>Local-first AI application builder for safe Symphony setup, run visibility, Linear context, and operator evidence.</p>
          <div className="hero-actions">
            <ActionButton className="primary-action" tooltip="Launch unlocks only after lease, path, and redaction preflight evidence passes.">
              Launch locked
            </ActionButton>
            <ActionButton className="secondary-action" tooltip="Connect service needs the Node control service to be running over HTTP.">
              Connect service
            </ActionButton>
          </div>
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

function ThemeSwitch({ preference, resolvedTheme, onChange }) {
  return (
    <div className="theme-switch" role="group" aria-label={`Theme mode. Current resolved theme is ${resolvedTheme}.`}>
      {themeOptions.map((option) => (
        <Tooltip label={`${option.label} theme`} key={option.id}>
          <button
            className="theme-option"
            type="button"
            aria-label={`${option.label} theme`}
            aria-pressed={preference === option.id}
            data-active={preference === option.id}
            onClick={() => onChange(option.id)}
          >
            <Icon name={option.icon} />
            <span>{option.label}</span>
          </button>
        </Tooltip>
      ))}
    </div>
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
  const IconComponent = iconComponents[name] || iconComponents.unknown;

  return <IconComponent className="icon" aria-hidden="true" focusable="false" />;
}

const themeOptions = [
  { id: "auto", label: "Auto", icon: "themeAuto" },
  { id: "light", label: "Light", icon: "themeLight" },
  { id: "dark", label: "Dark", icon: "themeDark" }
];

const iconComponents = {
  agents: Bot,
  audit: History,
  brand: Sparkles,
  close: X,
  complete: CheckCircle2,
  configs: ListChecks,
  database: Database,
  empty: PackageOpen,
  evidence: FileText,
  GT: ShieldCheck,
  linear: GitBranch,
  lock: LockKeyhole,
  log: FileText,
  menu: Menu,
  overview: LayoutDashboard,
  redaction: EyeOff,
  refresh: RefreshCcw,
  RS: Gauge,
  run: Play,
  server: Server,
  settings: Settings,
  statusBlocked: AlertTriangle,
  statusPlanned: Clock3,
  statusReady: Check,
  statusService: MoreHorizontal,
  statusUnknown: CircleHelp,
  statusWarning: AlertTriangle,
  terminal: Terminal,
  themeAuto: Monitor,
  themeDark: Moon,
  themeLight: Sun,
  timeline: Activity,
  unknown: CircleHelp,
  wizard: Wand2
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
