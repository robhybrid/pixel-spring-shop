# Pixel Spring Call Broker

Speed-to-lead **human** calling as a service. The broker writes the brief, picks a provider, and (when the rail supports it) creates the call task.

## What it does

1. Quote a lead (provider cost + client markup)
2. Dispatch to the best available rail
3. Compare provider pricing / inventory live

## Provider status

| Provider | Agent API | Sandbox | Role |
| --- | --- | --- | --- |
| **Ring a Human** | REST + MCP | Yes | Primary US speed-to-lead |
| **GoHireHumans** | REST + MCP | Discovery without key | Fixed-budget / global |
| **Ringg** | None public | Manual brief | Per-meeting callers |
| **Phone.do** | TBD | Manual brief | BPO campaigns |

## Quick start

```bash
cd call-broker
npm test
npm run sandbox          # simulated Ring a Human call (555 numbers)
npm run compare          # live pricing + inventory snapshot
CALL_BROKER_MODE=sandbox npm run serve
```

Secrets (never commit):

```bash
cp .env.example ~/.config/pixel-spring/call-broker.env
# RINGAHUMAN_API_KEY is also loaded from ~/.config/pixel-spring/ringahuman.env
```

## HTTP API

- `GET /health`
- `GET /compare`
- `POST /quote` — JSON lead
- `POST /dispatch` — JSON lead (`phone`, `goal`, `brief` required)
- `GET /tasks/:id` — Ring a Human task status

## Client packaging (draft)

- **Speed-to-Lead Calling** — warm US inquiry dials, human voice, ≤5 min first dial in local hours
- Cost floor: Ring a Human **$1/min**, **2 min minimum** ($2 voicemail)
- Suggested client markup: **1.5×** → $3 voicemail / $9 for a 6-minute booked call
- Collect prepaid Stripe or limited x402 balance before dispatch

## Live call test (after funding)

1. Set `CALL_BROKER_MODE=live` and ensure `RINGAHUMAN_API_KEY` is loaded
2. Confirm billing: free calls remaining or card on file at the Ring a Human dashboard
3. Dispatch a task with **your** phone, `consent=inquiry` (or other valid basis), and a real brief
4. Human caller sells a Pixel Spring SKU; outcome returns via poll/webhook

## Limited wallet (x402)

Prefer a **second Coinbase Developer Platform project** + wallet funded with a hard cap (e.g. $20 USDC on Base). Do **not** give the agent your primary Coinbase login. Export only:

- `CDP_API_KEY_ID`
- `CDP_API_KEY_SECRET`
- `CDP_WALLET_SECRET`
- `X402_SPEND_CAP_USDC=20`
