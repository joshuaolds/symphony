import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { resolveApiRoute } from "./control-contract.mjs";
import { readStore, resolveDataRoot, saveRunTarget } from "./local-store.mjs";
import { planLinearSync } from "./linear-planner.mjs";
import { observabilityPayload } from "./observability.mjs";
import { evaluatePreflight, previewCommand } from "./preflight.mjs";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const port = Number(args.get("--port") || process.env.PORT);
const host = args.get("--host") || process.env.HOST || "127.0.0.1";
const root = resolve(args.get("--root") || "dist");
const projectRoot = resolve(import.meta.dirname, "..");
const dataRoot = resolveDataRoot({ projectRoot, dataRoot: args.get("--data-root") });
const leaseAck = args.get("--lease-ack") || process.env.SYMPHONY_WEB_LEASE_ACK;
const serverBindAck = args.get("--server-bind-ack") || process.env.SYMPHONY_WEB_SERVER_BIND_ACK;

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error("Refusing to bind: pass --port <leased-port> after completing the JEO port lease process.");
  process.exit(1);
}

if (host !== "127.0.0.1" && host !== "localhost" && host !== "0.0.0.0") {
  console.error("Refusing to bind: use 127.0.0.1, localhost, or explicit Docker/server host 0.0.0.0.");
  process.exit(1);
}

if (host === "0.0.0.0" && serverBindAck !== "ubuntu-26.04lts") {
  console.error("Refusing to bind publicly: pass --server-bind-ack ubuntu-26.04lts after configuring host firewall/reverse proxy.");
  process.exit(1);
}

if (leaseAck !== "recorded") {
  console.error("Refusing to bind: pass --lease-ack recorded after updating the port lease register.");
  process.exit(1);
}

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

function json(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(body, null, 2));
}

async function readJsonBody(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;

    if (body.length > 20000) {
      throw new Error("Request body is too large.");
    }
  }

  return body ? JSON.parse(body) : {};
}

async function handleApi(request, response, pathname) {
  if (pathname === "/api/commands/preview" && request.method === "POST") {
    try {
      const input = await readJsonBody(request);
      json(response, 200, previewCommand(input));
    } catch (error) {
      json(response, 400, {
        state: "rejected",
        reason: error instanceof Error ? error.message : "Command preview could not be created."
      });
    }

    return true;
  }

  if (pathname === "/api/targets" && request.method === "POST") {
    if (request.headers["x-symphony-web-confirm"] !== "store-target") {
      json(response, 428, {
        state: "confirmation-required",
        reason: "Saving target metadata requires X-Symphony-Web-Confirm: store-target."
      });
      return true;
    }

    try {
      const input = await readJsonBody(request);
      const saved = saveRunTarget({ projectRoot, dataRoot, input });
      json(response, 201, {
        state: "stored",
        target: saved.target,
        storage: {
          state: saved.storeState.state,
          targets: saved.storeState.store.targets.length,
          auditEvents: saved.storeState.store.audit.length
        }
      });
    } catch (error) {
      json(response, 400, {
        state: "rejected",
        reason: error instanceof Error ? error.message : "Target metadata could not be stored."
      });
    }

    return true;
  }

  const route = resolveApiRoute({
    method: request.method || "GET",
    pathname,
    host,
    port,
    storeState: readStore({ projectRoot, dataRoot }),
    preflight: evaluatePreflight(),
    observability: observabilityPayload(),
    linearPlan: planLinearSync({
      currentIssue: {
        identifier: "JEO-368",
        title: "Build Symphony-Web local browser control console",
        project: "Symphony",
        state: "In Progress"
      }
    })
  });

  if (route) {
    json(response, route.status, route.body);
    return true;
  }

  return false;
}

function resolveRequest(url) {
  const pathname = new URL(url, `http://${host}:${port}`).pathname;
  const relative = normalize(pathname === "/" ? "index.html" : pathname.slice(1));
  const absolute = resolve(join(root, relative));

  if (!absolute.startsWith(root + sep) && absolute !== root) {
    return null;
  }

  return absolute;
}

const server = createServer((request, response) => {
  void handleRequest(request, response).catch((error) => {
    json(response, 500, {
      state: "error",
      reason: error instanceof Error ? error.message : "Unhandled local service error."
    });
  });
});

async function handleRequest(request, response) {
  const url = new URL(request.url || "/", `http://${host}:${port}`);

  if (await handleApi(request, response, url.pathname)) {
    return;
  }

  const file = resolveRequest(request.url || "/");

  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": types[extname(file)] || "application/octet-stream",
    "cache-control": "no-store"
  });
  createReadStream(file).pipe(response);
}

server.listen(port, host, () => {
  console.log(`Symphony-Web serving ${root} at http://${host}:${port}`);
});
