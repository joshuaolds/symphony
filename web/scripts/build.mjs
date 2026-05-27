import { mkdirSync, copyFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const files = ["index.html", "src/app.js", "src/data-model.js", "src/styles.css"];

rmSync(dist, { recursive: true, force: true });

for (const file of files) {
  const destination = resolve(dist, file);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(resolve(root, file), destination);
}

console.log("Build complete: dist/");
