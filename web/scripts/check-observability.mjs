import { strict as assert } from "node:assert";
import {
  observabilityPayload,
  parseLogText,
  parseObservabilityInput,
  summarizeAgents,
  summarizeCompletedRuns
} from "./observability.mjs";
import { resolveApiRoute } from "./control-contract.mjs";

const fakeSecret = `sk-${"abcdefghijklmnopqrstuvwxyz123456"}`;
const events = parseLogText(`
2026-05-27T10:00:00Z agent=Coordinator starting run ${fakeSecret}
2026-05-27T10:00:01Z [Review] warning retrying validation
2026-05-27T10:00:02Z agent=Implementation blocked missing port lease
2026-05-27T10:00:03Z agent=Coordinator completed run
`);

assert.equal(events.length, 4, "Parser should produce one event per non-empty line.");
assert.match(events[0].evidence, /\[redacted\]/, "Event evidence must redact secret-like values.");
assert.equal(events[2].level, "blocked", "Blocked log lines should be classified.");

const agents = summarizeAgents(events);
assert.ok(
  agents.some((agent) => agent.id === "Implementation" && agent.status === "blocked"),
  "Agent summaries should preserve blocked current activity from evidence."
);

const payload = observabilityPayload({ events });
assert.equal(payload.state, "observed", "Payload with events should be observed.");
assert.equal(payload.agents.length, 3, "Payload should include per-agent summaries.");
assert.equal(payload.completedRuns.length, 1, "Payload should include sanitized completed-run summaries.");

const completedRuns = summarizeCompletedRuns([
  ...events,
  { id: "event-5", timestamp: "2026-05-27T10:00:04Z", agent: "Review", summary: "done" },
  { id: "event-6", timestamp: "2026-05-27T10:00:05Z", agent: "Coordinator", summary: "success" },
  { id: "event-7", timestamp: "2026-05-27T10:00:06Z", agent: "Linear", summary: "finished" }
]);
assert.equal(completedRuns.length, 3, "Completed run summaries must be capped to the last three.");
assert.equal(completedRuns[0].agent, "Linear", "Completed run summaries should be newest first.");

const emptyPayload = observabilityPayload();
assert.equal(emptyPayload.state, "unknown", "Empty payload should remain unknown.");
assert.deepEqual(emptyPayload.events, [], "Empty payload must not invent events.");

const explicitEvents = parseObservabilityInput({
  events: [
    {
      id: "event-a",
      agent: "Agent With Spaces!",
      summary: `failed with Bearer ${"abcdefghijklmnopqrstuvwxyz1234567890"}`
    }
  ]
});
assert.equal(explicitEvents[0].agent, "AgentWithSpaces", "Agent identifiers should be sanitized.");
assert.match(explicitEvents[0].evidence, /\[redacted\]/, "Bearer values must be redacted.");

const routePayload = observabilityPayload({ events });
const eventsRoute = resolveApiRoute({
  method: "GET",
  pathname: "/api/events",
  host: "127.0.0.1",
  port: 4800,
  observability: routePayload
});
assert.equal(eventsRoute.status, 200, "Events route should be available.");
assert.equal(eventsRoute.body.events.length, events.length, "Events route should return sanitized events.");

const agentsRoute = resolveApiRoute({
  method: "GET",
  pathname: "/api/agents",
  host: "127.0.0.1",
  port: 4800,
  observability: routePayload
});
assert.equal(agentsRoute.body.agents.length, 3, "Agents route should return summaries.");

const completedRoute = resolveApiRoute({
  method: "GET",
  pathname: "/api/completed-runs",
  host: "127.0.0.1",
  port: 4800,
  observability: routePayload
});
assert.equal(completedRoute.status, 200, "Completed-runs route should be available.");
assert.equal(completedRoute.body.runs.length, 1, "Completed-runs route should return sanitized runs.");

console.log("Observability checks passed.");
