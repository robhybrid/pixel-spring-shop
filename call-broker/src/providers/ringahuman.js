const LIVE_BASE = "https://ringahuman.com/api";
const SANDBOX_BASE = "https://ringahuman.com/api/sandbox";

function authHeaders(apiKey) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "PixelSpring-CallBroker/0.1",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

async function readJson(res) {
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(body.error || `Ring a Human HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/**
 * @param {{ mode?: 'sandbox'|'live', apiKey?: string }} opts
 */
export function createRingAHumanClient(opts = {}) {
  const mode = opts.mode || process.env.CALL_BROKER_MODE || "sandbox";
  const apiKey = opts.apiKey || process.env.RINGAHUMAN_API_KEY;
  const base = mode === "live" ? LIVE_BASE : SANDBOX_BASE;

  if (mode === "live" && !apiKey) {
    throw new Error("RINGAHUMAN_API_KEY required for live mode");
  }

  return {
    id: "ringahuman",
    mode,

    async createTask(input) {
      const payload = {
        phone: input.phone,
        goal: input.goal,
        brief: input.brief,
        consent: input.consent || "inquiry",
        state: input.state,
        timezone: input.timezone,
        business_name: input.businessName,
        lead_name: input.leadName,
        links: input.links,
        deadline_minutes: input.deadlineMinutes,
        webhook_url: input.webhookUrl,
        external_ref: input.externalRef,
      };
      const res = await fetch(`${base}/tasks`, {
        method: "POST",
        headers: authHeaders(mode === "live" ? apiKey : undefined),
        body: JSON.stringify(payload),
      });
      return readJson(res);
    },

    async getTask(id) {
      const res = await fetch(`${base}/tasks/${encodeURIComponent(id)}`, {
        headers: authHeaders(mode === "live" ? apiKey : undefined),
      });
      return readJson(res);
    },

    async listTasks(status) {
      if (mode !== "live") {
        throw new Error("listTasks is live-only");
      }
      const q = status ? `?status=${encodeURIComponent(status)}` : "";
      const res = await fetch(`${LIVE_BASE}/tasks${q}`, {
        headers: authHeaders(apiKey),
      });
      return readJson(res);
    },

    async cancelTask(id) {
      const res = await fetch(`${base}/tasks/${encodeURIComponent(id)}/cancel`, {
        method: "POST",
        headers: authHeaders(mode === "live" ? apiKey : undefined),
      });
      return readJson(res);
    },

    async billing() {
      if (mode !== "live") {
        return {
          plan: "sandbox",
          free_calls_remaining: Infinity,
          pricing: {
            per_minute_cents: 100,
            minimum_minutes_per_call: 2,
            monthly_fee_cents: 0,
            first_dial_sla_minutes: 5,
          },
          new_tasks_will_dispatch: true,
        };
      }
      const res = await fetch(`${LIVE_BASE}/billing`, {
        headers: authHeaders(apiKey),
      });
      return readJson(res);
    },

    async waitForCompletion(id, { timeoutMs = 30000, intervalMs = 2000 } = {}) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const task = await this.getTask(id);
        if (task.status === "completed" || task.status === "cancelled") return task;
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      throw new Error(`Timeout waiting for task ${id}`);
    },
  };
}
