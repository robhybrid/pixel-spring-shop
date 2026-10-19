/**
 * Phone.do BPO adapter — site is up, agent portal has been flaky (CDN 530).
 * Manual onboarding until a stable API is documented.
 */

export function createPhoneDoClient() {
  return {
    id: "phonedo",
    agentApi: false,

    async health() {
      const targets = ["https://phone.do/", "https://agents.phone.do/en"];
      const results = [];
      for (const url of targets) {
        try {
          const res = await fetch(url, { method: "GET", redirect: "follow" });
          results.push({ url, status: res.status, ok: res.ok });
        } catch (e) {
          results.push({ url, ok: false, error: String(e.message || e) });
        }
      }
      return {
        ok: results.some((r) => r.ok),
        results,
      };
    },

    draftCampaign(lead) {
      return {
        provider: "phonedo",
        status: "manual_handoff",
        campaign: {
          name: "Pixel Spring speed-to-lead",
          activity: "Sales / appointment setting",
          scriptSummary: lead.brief,
          goal: lead.goal,
          phone: lead.phone,
          geo: lead.state || lead.country || "US",
        },
        nextStep:
          "Register at https://phone.do/ (brands) or https://agents.phone.do/en and attach this campaign brief.",
      };
    },
  };
}
