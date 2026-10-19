import { createRingAHumanClient } from "./providers/ringahuman.js";
import { createGoHireHumansClient } from "./providers/gohirehumans.js";
import { createRinggClient } from "./providers/ringg.js";
import { createPhoneDoClient } from "./providers/phonedo.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  estimateRingAHumanUsd,
  quoteClientUsd,
  recommendProvider,
  comparisonRows,
  PROVIDERS,
} from "./pricing.js";

function hydrateEnv() {
  const candidates = [
    path.join(os.homedir(), ".config/pixel-spring/ringahuman.env"),
    path.join(os.homedir(), ".config/pixel-spring/call-broker.env"),
    path.join(process.cwd(), ".env"),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}

hydrateEnv();

export function createBroker(options = {}) {
  const mode = options.mode || process.env.CALL_BROKER_MODE || "sandbox";
  const markup = Number(options.markup || process.env.CALL_BROKER_MARKUP_MULTIPLIER || 1.5);

  const ringahuman = createRingAHumanClient({ mode, apiKey: process.env.RINGAHUMAN_API_KEY });
  const gohirehumans = createGoHireHumansClient();
  const ringg = createRinggClient();
  const phonedo = createPhoneDoClient();

  return {
    mode,
    markup,
    providers: { ringahuman, gohirehumans, ringg, phonedo },

    recommend(lead) {
      return recommendProvider({
        country: lead.country || (lead.state ? "US" : undefined),
        needSlaMinutes: lead.deadlineMinutes || 5,
        mode,
      });
    },

    quote(lead) {
      const rec = this.recommend(lead);
      const expectedSeconds = lead.expectedTalkSeconds ?? 180;
      const rahCost = estimateRingAHumanUsd(expectedSeconds);
      return {
        recommendation: rec,
        markup,
        estimates: {
          ringahuman: {
            providerCostUsd: rahCost,
            clientPriceUsd: quoteClientUsd(rahCost, markup),
            assumptions: `ceil(max(2, talkSeconds/60)) × $1; talkSeconds=${expectedSeconds}`,
          },
          gohirehumans: {
            note: "Fixed budget set per job; employer pays payout + 1% + 3%.",
            examplePayoutUsd: PROVIDERS.gohirehumans.examplePhoneTaskUsd,
          },
          ringg: {
            examplePerMeetingUsd: PROVIDERS.ringg.examplePerMeetingUsd,
            examplePerHourUsd: PROVIDERS.ringg.examplePerHourUsd,
          },
        },
      };
    },

    async dispatch(lead) {
      const rec = this.recommend(lead);
      const providerId = lead.provider || rec.provider;

      if (providerId === "ringahuman") {
        const task = await ringahuman.createTask({
          phone: lead.phone,
          goal: lead.goal,
          brief: lead.brief,
          consent: lead.consent || "inquiry",
          state: lead.state,
          timezone: lead.timezone,
          businessName: lead.businessName,
          leadName: lead.leadName,
          links: lead.links,
          deadlineMinutes: lead.deadlineMinutes ?? 15,
          webhookUrl: lead.webhookUrl,
          externalRef: lead.externalRef || `ps-${Date.now()}`,
        });
        return {
          provider: "ringahuman",
          mode,
          recommendation: rec,
          task,
          quote: this.quote(lead),
        };
      }

      if (providerId === "gohirehumans") {
        if (!process.env.GOHIREHUMANS_API_KEY) {
          const inventory = await gohirehumans.inventorySnapshot();
          return {
            provider: "gohirehumans",
            mode: "discovery_only",
            recommendation: rec,
            inventory,
            blocked: "Set GOHIREHUMANS_API_KEY (write scope) to publish phone jobs.",
          };
        }
        const job = await gohirehumans.createPhoneJob({
          title: lead.goal,
          description: lead.brief,
          budgetUsd: lead.budgetUsd || 40,
          deadline: lead.deadline,
        });
        return { provider: "gohirehumans", job, recommendation: rec };
      }

      if (providerId === "ringg") {
        return { ...ringg.draftListing(lead), recommendation: rec };
      }

      if (providerId === "phonedo") {
        return { ...phonedo.draftCampaign(lead), recommendation: rec };
      }

      throw new Error(`Unknown provider: ${providerId}`);
    },

    async compareLive() {
      const [rahBilling, ghhInventory, ringgHealth, phonedoHealth] = await Promise.all([
        ringahuman.billing().catch((e) => ({ error: String(e.message || e) })),
        gohirehumans.inventorySnapshot().catch((e) => ({ error: String(e.message || e) })),
        ringg.health(),
        phonedo.health(),
      ]);

      return {
        generatedAt: new Date().toISOString(),
        mode,
        markup,
        models: PROVIDERS,
        scenarios: comparisonRows(markup),
        live: {
          ringahuman: rahBilling,
          gohirehumans: ghhInventory,
          ringg: ringgHealth,
          phonedo: phonedoHealth,
        },
        verdict: {
          bestSpeedToLead: "ringahuman",
          bestPriceUsWarmLead: "ringahuman",
          bestFlexibleGlobal: "gohirehumans",
          needsHumanOnboarding: ["ringg", "phonedo"],
        },
      };
    },
  };
}
