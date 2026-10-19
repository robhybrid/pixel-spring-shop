const DEFAULT_BASE =
  process.env.GOHIREHUMANS_API_URL ||
  "https://gohirehumans-production.up.railway.app";

function headers(apiKey) {
  const h = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "PixelSpring-CallBroker/0.1",
  };
  if (apiKey) h["X-API-Key"] = apiKey;
  return h;
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
    const err = new Error(body.error || `GoHireHumans HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export function createGoHireHumansClient(opts = {}) {
  const base = opts.baseUrl || DEFAULT_BASE;
  const apiKey = opts.apiKey || process.env.GOHIREHUMANS_API_KEY;

  return {
    id: "gohirehumans",

    async categories() {
      const res = await fetch(`${base}/api/v1/categories`, { headers: headers() });
      return readJson(res);
    },

    async searchServices({ search = "phone call", category, page = 1, perPage = 20 } = {}) {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      const res = await fetch(`${base}/api/v1/services?${params}`, {
        headers: headers(),
      });
      return readJson(res);
    },

    async listJobs({ category = "phone_call", page = 1, perPage = 20 } = {}) {
      const params = new URLSearchParams({
        category,
        page: String(page),
        per_page: String(perPage),
      });
      const res = await fetch(`${base}/api/v1/jobs?${params}`, {
        headers: headers(),
      });
      return readJson(res);
    },

    /**
     * Publish a fixed-budget phone job. Requires write-scope API key.
     * Does not hire or charge until a worker is selected / ordered.
     */
    async createPhoneJob(job) {
      if (!apiKey) throw new Error("GOHIREHUMANS_API_KEY required to create jobs");
      const body = {
        title: job.title,
        description: job.description,
        budget: job.budgetUsd,
        category: "phone_call",
        skills: job.skills || ["phone_call", "appointment_setting"],
        deadline: job.deadline,
      };
      const res = await fetch(`${base}/api/v1/jobs`, {
        method: "POST",
        headers: headers(apiKey),
        body: JSON.stringify(body),
      });
      return readJson(res);
    },

    async inventorySnapshot() {
      const [phoneServices, callSearch, phoneJobs, va] = await Promise.all([
        this.searchServices({ category: "phone_call", search: "" }),
        this.searchServices({ search: "call" }),
        this.listJobs({ category: "phone_call" }),
        this.searchServices({ category: "virtual_assistant", search: "" }),
      ]);
      return {
        phone_call_services: phoneServices.total ?? (phoneServices.services || []).length,
        call_search_services: callSearch.total ?? (callSearch.services || []).length,
        phone_call_jobs: phoneJobs.total ?? (phoneJobs.jobs || []).length,
        virtual_assistant_services: va.total ?? (va.services || []).length,
        sample_call_search: (callSearch.services || []).slice(0, 5).map((s) => ({
          id: s.id,
          title: s.title,
          price: s.price,
          category: s.category,
        })),
      };
    },
  };
}
