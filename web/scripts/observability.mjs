import { REDACTED } from "./local-store.mjs";

const secretLikePatterns = [
  /sk-[A-Za-z0-9_-]{20,}/g,
  /OP_SESSION_[A-Z0-9_]*=[^\s]+/g,
  /BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY/g,
  /gh[pousr]_[A-Za-z0-9_]{30,}/g,
  /Bearer\s+[A-Za-z0-9._-]{20,}/g
];

export function parseLogText(text = "") {
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => parseLogLine(line, index)).filter(Boolean);
}

export function parseLogLine(line, index = 0) {
  const redacted = redactText(line);
  const timestampMatch = redacted.match(
    /(?<timestamp>\d{4}-\d{2}-\d{2}[T ][0-9:.+-]+Z?|\[[0-9:.]+\])/
  );
  const agentMatch =
    redacted.match(/\bagent[:=]\s*(?<agent>[A-Za-z0-9_-]+)/i) ||
    redacted.match(/\[(?<agent>[A-Za-z0-9_-]+)\]/);
  const level = detectLevel(redacted);

  return {
    id: `event-${index + 1}`,
    timestamp: normalizeTimestamp(timestampMatch?.groups?.timestamp),
    level,
    state: level === "error" || level === "blocked" ? "blocked" : "observed",
    agent: agentMatch?.groups?.agent || "unknown",
    summary: summarizeLine(redacted),
    evidence: redacted
  };
}

export function summarizeAgents(events = []) {
  const agents = new Map();

  for (const event of events) {
    const id = event.agent || "unknown";
    const current = agents.get(id) || {
      id,
      name: id === "unknown" ? "Unknown agent" : id,
      status: "unknown",
      activity: "No current structured activity.",
      evidence: "No parsed event evidence.",
      events: 0
    };

    current.events += 1;
    current.status = statusFromEvent(event);
    current.activity = event.summary;
    current.evidence = event.evidence;
    agents.set(id, current);
  }

  return [...agents.values()];
}

export function observabilityPayload({ events = [] } = {}) {
  const agents = summarizeAgents(events);
  const completedRuns = summarizeCompletedRuns(events);

  return {
    state: events.length > 0 ? "observed" : "unknown",
    events,
    agents,
    completedRuns,
    evidence:
      events.length > 0
        ? "Events are derived from sanitized log/event input."
        : "No sanitized log or event evidence has been provided."
  };
}

export function summarizeCompletedRuns(events = []) {
  return events
    .filter((event) => isCompletionEvent(event))
    .slice(-3)
    .reverse()
    .map((event, index) => ({
      id: event.id || `completed-${index + 1}`,
      title: event.summary || "Completed run",
      completedAt: event.timestamp || "unknown",
      agent: event.agent || "unknown",
      state: "completed",
      evidence: event.evidence || "Sanitized completion evidence."
    }));
}

export function parseObservabilityInput(input = {}) {
  if (Array.isArray(input.events)) {
    return input.events.map((event, index) => ({
      id: String(event.id || `event-${index + 1}`),
      timestamp: normalizeTimestamp(event.timestamp),
      level: detectLevel(event.level || event.summary || event.evidence || ""),
      state: event.state || "observed",
      agent: sanitizeAgent(event.agent),
      summary: summarizeLine(redactText(event.summary || event.evidence || "Observed event")),
      evidence: redactText(event.evidence || event.summary || "Observed event")
    }));
  }

  return parseLogText(input.text || "");
}

function detectLevel(text) {
  const normalized = String(text).toLowerCase();

  if (normalized.includes("blocked") || normalized.includes("blocker")) {
    return "blocked";
  }

  if (normalized.includes("error") || normalized.includes("failed") || normalized.includes("exception")) {
    return "error";
  }

  if (normalized.includes("warn") || normalized.includes("retry")) {
    return "warning";
  }

  return "info";
}

function statusFromEvent(event) {
  if (event.level === "blocked" || event.level === "error") {
    return "blocked";
  }

  if (event.level === "warning") {
    return "warning";
  }

  return "observed";
}

function isCompletionEvent(event) {
  const text = `${event.state || ""} ${event.level || ""} ${event.summary || ""} ${event.evidence || ""}`.toLowerCase();

  return (
    text.includes("completed") ||
    text.includes("complete") ||
    text.includes("done") ||
    text.includes("finished") ||
    text.includes("success")
  );
}

function sanitizeAgent(agent) {
  const safe = String(agent || "unknown").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 48);
  return safe || "unknown";
}

function summarizeLine(line) {
  const withoutTimestamp = line
    .replace(/\d{4}-\d{2}-\d{2}[T ][0-9:.+-]+Z?/g, "")
    .replace(/\[[0-9:.]+\]/g, "")
    .trim();

  return withoutTimestamp.length > 160 ? `${withoutTimestamp.slice(0, 157)}...` : withoutTimestamp;
}

function normalizeTimestamp(timestamp) {
  if (!timestamp) {
    return "unknown";
  }

  return String(timestamp).replace(/^\[|\]$/g, "");
}

function redactText(text) {
  return secretLikePatterns.reduce((value, pattern) => value.replace(pattern, REDACTED), String(text));
}
