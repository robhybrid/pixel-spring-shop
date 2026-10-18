/**
 * Ringg has no public agent API as of this integration.
 * We keep a structured adapter so the broker can quote and hand off
 * a human-ready brief for marketplace posting.
 */

export function createRinggClient() {
  return {
    id: "ringg",
    agentApi: false,

    async health() {
      try {
        const res = await fetch("https://www.ringg.io/", {
          method: "HEAD",
          redirect: "follow",
        });
        return { ok: res.ok || res.status < 500, status: res.status };
      } catch (e) {
        return { ok: false, error: String(e.message || e) };
      }
    },

    /**
     * Build a marketplace brief a human operator can paste into Ringg.
     * Does not place work automatically.
     */
    draftListing(lead) {
      return {
        provider: "ringg",
        status: "manual_handoff",
        suggestedPay: {
          perMeetingUsd: 40,
          perHourUsd: 55,
          note: "Negotiate on platform; sample public rates ~$40–55/meeting or /hour.",
        },
        listing: {
          title: `Speed-to-lead dial: ${lead.businessName || lead.leadName || "warm lead"}`,
          goal: lead.goal,
          brief: lead.brief,
          phone: lead.phone,
          state: lead.state,
          timezone: lead.timezone,
          consent: lead.consent,
          constraints: [
            "Human voice only — no AI voice / autodialer",
            "Call only during lead local business hours",
            "Log disposition + notes within 15 minutes of dial",
            "Do not collect payment or ID on the call",
          ],
        },
        nextStep:
          "Open https://www.ringg.io/, post or invite a caller, attach this brief, set pay-per-meeting.",
      };
    },
  };
}
