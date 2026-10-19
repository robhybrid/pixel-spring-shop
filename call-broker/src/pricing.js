/**
 * Provider cost models used for routing and client quotes.
 * Amounts in USD unless noted. Verify against live billing before production quotes.
 */

export const PROVIDERS = {
  ringahuman: {
    id: "ringahuman",
    name: "Ring a Human",
    model: "per_minute",
    perMinuteUsd: 1.0,
    minimumMinutes: 2,
    monthlyFeeUsd: 0,
    platformFeePct: 0,
    processingFeePct: 0,
    firstDialSlaMinutes: 5,
    countryBias: ["US"],
    agentApi: "rest+mcp",
    sandbox: true,
    notes:
      "Human-dialed US calls, local 9–8 hours, DNC enforced. Best for TCPA-sensitive speed-to-lead.",
  },
  gohirehumans: {
    id: "gohirehumans",
    name: "GoHireHumans",
    model: "fixed_budget_marketplace",
    // Buyer pays listed payout + 1% platform + 3% processing
    platformFeePct: 0.01,
    processingFeePct: 0.03,
    monthlyFeeUsd: 0,
    // Observed starter templates for phone/real-world checks
    examplePhoneTaskUsd: 79,
    firstDialSlaMinutes: null,
    countryBias: ["global"],
    agentApi: "rest+mcp",
    sandbox: false,
    notes:
      "Fixed-budget jobs / service orders. No phone inventory today (0 phone_call listings). Good for one-off research calls when a worker is available.",
  },
  ringg: {
    id: "ringg",
    name: "Ringg",
    model: "marketplace_negotiated",
    // Public marketplace rates observed on homepage profiles
    examplePerHourUsd: 55,
    examplePerMeetingUsd: 45,
    monthlyFeeUsd: null,
    platformFeePct: null,
    firstDialSlaMinutes: null,
    countryBias: ["global"],
    agentApi: "none_public",
    sandbox: false,
    notes:
      "B2B cold-caller marketplace. Pay per hour / meeting / deal. No agent REST/MCP found — human onboarding required.",
  },
  phonedo: {
    id: "phonedo",
    name: "Phone.do",
    model: "bpo_agent_rates",
    monthlyFeeUsd: null,
    platformFeePct: null,
    firstDialSlaMinutes: null,
    countryBias: ["global"],
    agentApi: "unknown",
    sandbox: false,
    notes:
      "Decentralized BPO. agents.phone.do was intermittently unavailable (CDN 530). Treat as manual integration until API docs are confirmed.",
  },
};

/** Estimate Ring a Human cost for an expected talk time. */
export function estimateRingAHumanUsd(talkSeconds) {
  const minutes = Math.max(2, Math.ceil(Math.max(0, talkSeconds) / 60));
  return minutes * PROVIDERS.ringahuman.perMinuteUsd;
}

/** GoHireHumans employer total for a listed payout. */
export function estimateGoHireHumansEmployerUsd(payoutUsd) {
  const platform = Math.max(0.01, Math.round(payoutUsd * 0.01 * 100) / 100);
  const processing = Math.max(0.01, Math.round(payoutUsd * 0.03 * 100) / 100);
  return {
    payoutUsd,
    platformFeeUsd: platform,
    processingFeeUsd: processing,
    employerTotalUsd: Math.round((payoutUsd + platform + processing) * 100) / 100,
  };
}

/**
 * Recommend a provider for a lead.
 * Prefers Ring a Human for US speed-to-lead; falls back by capability.
 */
export function recommendProvider({ country = "US", needSlaMinutes = 5, mode = "sandbox" } = {}) {
  if (mode === "sandbox" || country === "US") {
    return {
      provider: "ringahuman",
      reason:
        mode === "sandbox"
          ? "Sandbox available and US TCPA-safe human dialing with 5-minute SLA."
          : "US lead + speed SLA: Ring a Human is the only agent-native rail with enforced local hours and $1/min utility pricing.",
    };
  }
  if (needSlaMinutes && needSlaMinutes <= 15) {
    return {
      provider: "ringahuman",
      reason: "Tight dial SLA; Ring a Human publishes first-dial SLA.",
    };
  }
  return {
    provider: "gohirehumans",
    reason: "Non-US / flexible timing: post a fixed-budget phone task on GoHireHumans.",
  };
}

/** Client quote = provider cost × markup (default 1.5). */
export function quoteClientUsd(providerCostUsd, markup = 1.5) {
  return Math.round(providerCostUsd * markup * 100) / 100;
}

export function comparisonRows(markup = 1.5) {
  const rahVoicemail = estimateRingAHumanUsd(0); // 2 min min
  const rahBooked = estimateRingAHumanUsd(312); // sandbox booked sample ~5.2 min → 6 billed
  const ghh = estimateGoHireHumansEmployerUsd(PROVIDERS.gohirehumans.examplePhoneTaskUsd);

  return [
    {
      scenario: "US warm lead, voicemail (2 min)",
      ringahuman: rahVoicemail,
      ringahumanClient: quoteClientUsd(rahVoicemail, markup),
      gohirehumans: ghh.employerTotalUsd,
      gohirehumansClient: quoteClientUsd(ghh.employerTotalUsd, markup),
      ringgPerMeeting: PROVIDERS.ringg.examplePerMeetingUsd,
      winner: "ringahuman",
    },
    {
      scenario: "US warm lead, 6 billed minutes (booked)",
      ringahuman: rahBooked,
      ringahumanClient: quoteClientUsd(rahBooked, markup),
      gohirehumans: ghh.employerTotalUsd,
      gohirehumansClient: quoteClientUsd(ghh.employerTotalUsd, markup),
      ringgPerMeeting: PROVIDERS.ringg.examplePerMeetingUsd,
      winner: "ringahuman",
    },
    {
      scenario: "One-off research call, flexible timing",
      ringahuman: rahBooked,
      ringahumanClient: quoteClientUsd(rahBooked, markup),
      gohirehumans: ghh.employerTotalUsd,
      gohirehumansClient: quoteClientUsd(ghh.employerTotalUsd, markup),
      ringgPerMeeting: PROVIDERS.ringg.examplePerMeetingUsd,
      winner: ghh.employerTotalUsd < rahBooked * 3 ? "depends" : "ringahuman",
    },
  ];
}
