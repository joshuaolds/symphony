import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const checkedRoots = ["src", "scripts", "docs", "index.html", "package.json", "package-lock.json"];
const secretPatterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /OP_SESSION_[A-Z0-9_]*\s*=/,
  /BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY/,
  /xox[baprs]-[A-Za-z0-9-]{20,}/,
  /gh[pousr]_[A-Za-z0-9_]{30,}/
];

function collect(path) {
  const absolute = join(root, path);
  const stat = statSync(absolute);

  if (stat.isDirectory()) {
    return readdirSync(absolute).flatMap((entry) => collect(join(path, entry)));
  }

  return [path];
}

const failures = [];

for (const target of checkedRoots.flatMap(collect)) {
  const absolute = join(root, target);
  const contents = readFileSync(absolute, "utf8");
  const rel = relative(root, absolute);

  for (const pattern of secretPatterns) {
    if (pattern.test(contents)) {
      failures.push(`Potential secret pattern found in ${rel}.`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Secret pattern checks passed.");
