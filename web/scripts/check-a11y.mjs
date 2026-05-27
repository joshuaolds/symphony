import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const app = readFileSync(resolve(root, "src/App.jsx"), "utf8");
const failures = [];

if (!html.includes('<html lang="en">')) {
  failures.push("Document language must be set.");
}

if (!html.includes('name="viewport"')) {
  failures.push("Viewport metadata is required for mobile layout.");
}

const buttonMatches = app.match(/<button\b[\s\S]*?>/g) || [];
const buttonsMissingType = buttonMatches.filter((button) => !/\stype=/.test(button));

if (buttonsMissingType.length > 0) {
  failures.push(`${buttonsMissingType.length} button element(s) are missing type attributes.`);
}

if (!app.includes('aria-label="Primary navigation"')) {
  failures.push("Primary navigation needs an accessible label.");
}

if (!app.includes('aria-label="Refresh evidence"')) {
  failures.push("Icon-only refresh button requires an aria-label.");
}

if (!app.includes("aria-pressed")) {
  failures.push("Selectable nav, wizard, command, or agent controls must expose aria-pressed.");
}

if (!app.includes('aria-label="Sanitized log preview"')) {
  failures.push("Log preview needs an accessible label.");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Accessibility checks passed.");
