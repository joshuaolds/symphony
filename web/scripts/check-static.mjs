import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

const indexHtml = read("index.html");
const app = read("src/App.jsx");
const model = read("src/model.js");
const dataModel = read("src/data-model.js");
const styles = read("src/styles.css");
const server = read("scripts/serve-static.mjs");
const contract = read("scripts/control-contract.mjs");
const vite = read("vite.config.js");
const source = `${indexHtml}\n${app}\n${model}\n${dataModel}`;

const requiredCommands = ["run", "show", "update", "store", "list", "load", "find-sites", "move-site"];
const missingCommands = requiredCommands.filter((command) => !model.includes(`"${command}"`));
const requiredSections = ["overview", "wizard", "configs", "cli", "linear", "run", "agents", "audit", "settings"];
const missingSections = requiredSections.filter((section) => !source.includes(`"${section}"`));

const failures = [];

if (!indexHtml.includes("<title>Symphony-Web</title>")) {
  failures.push("index.html must set the browser title to Symphony-Web.");
}

if (!indexHtml.includes("/src/main.jsx")) {
  failures.push("Vite entrypoint must load the React app through /src/main.jsx.");
}

if (!app.includes("Symphony Status") || !app.includes("JEO Technology")) {
  failures.push("Live run view must show Symphony Status with JEO Technology underneath.");
}

if (!app.includes("Last 3 Completed") || !contract.includes("/api/completed-runs")) {
  failures.push("Last 3 completed runs must be present in the UI and API contract.");
}

if (missingCommands.length > 0) {
  failures.push(`Missing helper command parity entries: ${missingCommands.join(", ")}.`);
}

if (missingSections.length > 0) {
  failures.push(`Missing primary navigation sections: ${missingSections.join(", ")}.`);
}

if (/\b(localStorage|sessionStorage)\b/.test(source)) {
  failures.push("Browser storage APIs are not allowed for the current redaction boundary.");
}

if (!app.includes("Launch locked") || !app.includes("Start locked") || !app.includes("Execution locked")) {
  failures.push("Locked launch and execution controls must remain visible.");
}

if (!app.includes("No raw secret values")) {
  failures.push("Redaction settings must explicitly reject raw secret values.");
}

if (!styles.includes("@media (max-width: 720px)")) {
  failures.push("Responsive mobile layout rules are required.");
}

if (!contract.includes("/api/status") || !server.includes("leaseAck")) {
  failures.push("The local server must expose sanitized status and enforce lease acknowledgement.");
}

if (!server.includes("serverBindAck") || !server.includes("ubuntu-26.04lts")) {
  failures.push("Docker/server bind must require an explicit Ubuntu 26.04 LTS acknowledgement.");
}

if (!vite.includes("@vitejs/plugin-react") || !vite.includes("/api")) {
  failures.push("Vite React plugin and API proxy must be configured.");
}

if (!contract.includes("resolveApiRoute") || !dataModel.includes("blockedFieldNames")) {
  failures.push("Service contract and data model boundaries must be explicit.");
}

if (!server.includes("x-symphony-web-confirm") || !server.includes("store-target")) {
  failures.push("Target metadata writes must require an explicit confirmation header.");
}

if (!source.includes("data-command-preview") || !app.includes("Preflight")) {
  failures.push("Command preview and preflight UI surfaces must be present.");
}

if (!app.includes("event-list") || !app.includes("agent-evidence-list")) {
  failures.push("Event timeline and agent evidence UI surfaces must be present.");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Static checks passed.");
