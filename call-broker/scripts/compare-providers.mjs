#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createBroker } from "../src/broker.js";

// Prefer live billing when a Ring a Human key is present; sandbox still used for dial demos.
const mode =
  process.env.CALL_BROKER_MODE ||
  (process.env.RINGAHUMAN_API_KEY ? "live" : "sandbox");
const broker = createBroker({ mode });
const report = await broker.compareLive();

const outDir = path.resolve("fixtures");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "provider-comparison.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
console.log("wrote", outPath);

// Also drop a copy for walkthrough artifacts when present
try {
  const art = "/opt/cursor/artifacts/call-broker-provider-comparison.json";
  fs.writeFileSync(art, JSON.stringify(report, null, 2));
  console.log("wrote", art);
} catch {
  // optional
}
