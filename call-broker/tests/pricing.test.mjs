import test from "node:test";
import assert from "node:assert/strict";
import {
  estimateRingAHumanUsd,
  estimateGoHireHumansEmployerUsd,
  recommendProvider,
  quoteClientUsd,
} from "../src/pricing.js";

test("Ring a Human enforces 2-minute minimum", () => {
  assert.equal(estimateRingAHumanUsd(0), 2);
  assert.equal(estimateRingAHumanUsd(60), 2);
  assert.equal(estimateRingAHumanUsd(61), 2);
  assert.equal(estimateRingAHumanUsd(120), 2);
  assert.equal(estimateRingAHumanUsd(121), 3);
});

test("GoHireHumans employer total adds 1% + 3%", () => {
  const t = estimateGoHireHumansEmployerUsd(100);
  assert.equal(t.platformFeeUsd, 1);
  assert.equal(t.processingFeeUsd, 3);
  assert.equal(t.employerTotalUsd, 104);
});

test("US sandbox recommends Ring a Human", () => {
  const r = recommendProvider({ country: "US", mode: "sandbox" });
  assert.equal(r.provider, "ringahuman");
});

test("client quote applies markup", () => {
  assert.equal(quoteClientUsd(2, 1.5), 3);
  assert.equal(quoteClientUsd(6, 1.5), 9);
});
