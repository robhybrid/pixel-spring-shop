import http from "node:http";
import { createBroker } from "./broker.js";

const port = Number(process.env.PORT || 8787);
const broker = createBroker();

function send(res, status, body) {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(json);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      });
      return res.end();
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return send(res, 200, { ok: true, mode: broker.mode });
    }

    if (req.method === "GET" && url.pathname === "/compare") {
      return send(res, 200, await broker.compareLive());
    }

    if (req.method === "POST" && url.pathname === "/quote") {
      const lead = await readBody(req);
      return send(res, 200, broker.quote(lead));
    }

    if (req.method === "POST" && url.pathname === "/dispatch") {
      const lead = await readBody(req);
      if (!lead.phone || !lead.goal || !lead.brief) {
        return send(res, 400, { error: "phone, goal, and brief are required" });
      }
      const result = await broker.dispatch(lead);
      return send(res, 200, result);
    }

    if (req.method === "GET" && url.pathname.startsWith("/tasks/")) {
      const id = url.pathname.slice("/tasks/".length);
      const task = await broker.providers.ringahuman.getTask(id);
      return send(res, 200, task);
    }

    return send(res, 404, {
      error: "not found",
      routes: ["GET /health", "GET /compare", "POST /quote", "POST /dispatch", "GET /tasks/:id"],
    });
  } catch (e) {
    return send(res, e.status || 500, { error: String(e.message || e), body: e.body });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`call-broker listening on http://0.0.0.0:${port} mode=${broker.mode}`);
});
