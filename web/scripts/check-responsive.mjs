import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const css = readFileSync(resolve(root, "src/styles.css"), "utf8");
const app = readFileSync(resolve(root, "src/App.jsx"), "utf8");
const failures = [];

const requiredCss = [
  ["minimum document width", /min-width:\s*320px/],
  ["desktop app shell grid", /grid-template-columns:\s*284px minmax\(0,\s*1fr\)/],
  ["tablet breakpoint", /@media \(max-width:\s*1060px\)/],
  ["mobile breakpoint", /@media \(max-width:\s*720px\)/],
  ["responsive field grid", /\.field-grid,\s*\n\s*\.model-grid/s],
  ["button focus state", /button:focus-visible/],
  ["no viewport-scaled type", /font-size:\s*clamp\(/]
];

for (const [label, pattern] of requiredCss) {
  const found = pattern.test(css);

  if (label === "no viewport-scaled type") {
    if (found) {
      failures.push("Viewport-scaled font sizes are not allowed.");
    }
    continue;
  }

  if (!found) {
    failures.push(`Missing responsive rule: ${label}.`);
  }
}

if (/letter-spacing:\s*-\d/.test(css)) {
  failures.push("Negative letter spacing is not allowed.");
}

const lockedControls = (app.match(/Launch locked|Start locked|Execution locked|Continue locked/g) || []).length;

if (lockedControls < 4) {
  failures.push("Locked launch and execution controls must remain visible in offline state.");
}

if (!app.includes('data-section="agents"')) {
  failures.push("Per-agent drilldown surface must be present.");
}

if (!app.includes("completed-run-list")) {
  failures.push("Completed-run surface must be present.");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Responsive checks passed.");
