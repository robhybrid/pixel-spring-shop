#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createBroker } from "../src/broker.js";

const broker = createBroker({ mode: "sandbox" });

const lead = {
  phone: process.argv[2] || "(512) 555-0100",
  state: "TX",
  goal: "Book a 15-minute demo of Pixel Spring Speed-to-Lead Calling",
  brief:
    "Lead requested info about AI-to-human call handoff today. Offer a 15-minute walkthrough of how Pixel Spring routes warm US leads to vetted human callers within 5 minutes. Objections: price ($1/min utility + broker markup) and TCPA — explain human-dialed compliance, no AI voice.",
  consent: "inquiry",
  businessName: "Sandbox Dental",
  leadName: "Test Lead",
  expectedTalkSeconds: 300,
  externalRef: `sandbox-demo-${Date.now()}`,
};

const quote = broker.quote(lead);
console.log("QUOTE", JSON.stringify(quote, null, 2));

const dispatched = await broker.dispatch(lead);
console.log("DISPATCHED", JSON.stringify(dispatched.task, null, 2));

const completed = await broker.providers.ringahuman.waitForCompletion(dispatched.task.id, {
  timeoutMs: 40000,
});
console.log("COMPLETED", JSON.stringify(completed, null, 2));

const outDir = path.resolve("fixtures");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `sandbox-${completed.id}.json`);
fs.writeFileSync(
  outPath,
  JSON.stringify({ quote, dispatched, completed, at: new Date().toISOString() }, null, 2),
);
console.log("wrote", outPath);
