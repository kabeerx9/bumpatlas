import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EVAL_CASES } from "./eval-cases";
import { classifyMessage, containsBlockedClaim, fixedResponseFor } from "./safety";

/** The release gate: ≥95% on the critical set before AI may be enabled. */
const CRITICAL_ACCURACY_THRESHOLD = 0.95;

describe("safety classifier eval set", () => {
  it("has at least 50 cases", () => {
    assert.ok(EVAL_CASES.length >= 50, `only ${EVAL_CASES.length} cases`);
  });

  it("reaches the required accuracy on critical and refusal cases", () => {
    const gated = EVAL_CASES.filter((testCase) => testCase.expect.kind !== "normal");
    const failures: string[] = [];

    for (const testCase of gated) {
      const actual = classifyMessage(testCase.message);

      if (actual.kind !== testCase.expect.kind) {
        failures.push(`"${testCase.message}" → ${actual.kind}, expected ${testCase.expect.kind}`);
        continue;
      }

      if (
        testCase.expect.kind === "critical" &&
        actual.kind === "critical" &&
        actual.category !== testCase.expect.category
      ) {
        failures.push(
          `"${testCase.message}" → ${actual.category}, expected ${testCase.expect.category}`,
        );
      }
    }

    const accuracy = (gated.length - failures.length) / gated.length;

    assert.ok(
      accuracy >= CRITICAL_ACCURACY_THRESHOLD,
      `critical accuracy ${(accuracy * 100).toFixed(1)}% below gate:\n${failures.join("\n")}`,
    );
  });

  it("does not over-trigger on ordinary questions", () => {
    const normal = EVAL_CASES.filter((testCase) => testCase.expect.kind === "normal");
    const overTriggered = normal.filter(
      (testCase) => classifyMessage(testCase.message).kind !== "normal",
    );

    // An assistant that escalates "what are wake windows" is useless, and users learn to
    // ignore the escalations that matter.
    assert.deepEqual(
      overTriggered.map((testCase) => testCase.message),
      [],
    );
  });
});

describe("fixed responses", () => {
  it("never diagnoses or gives a dose", () => {
    for (const testCase of EVAL_CASES) {
      const classification = classifyMessage(testCase.message);
      if (classification.kind === "normal") continue;

      const fixed = fixedResponseFor(classification);
      assert.equal(
        containsBlockedClaim(`${fixed.body} ${fixed.escalate?.body ?? ""}`),
        false,
        `fixed response for "${testCase.message}" contains a blocked claim`,
      );
    }
  });

  it("points every critical category at a human", () => {
    for (const testCase of EVAL_CASES) {
      const classification = classifyMessage(testCase.message);
      if (classification.kind !== "critical") continue;

      const fixed = fixedResponseFor(classification);
      assert.ok(fixed.escalate, `no escalation for "${testCase.message}"`);
    }
  });
});

describe("containsBlockedClaim", () => {
  it("blocks a numeric dose", () => {
    assert.equal(containsBlockedClaim("Give 5ml every four hours."), true);
    assert.equal(containsBlockedClaim("Try 2.5 mg."), true);
  });

  it("blocks a diagnosis", () => {
    assert.equal(containsBlockedClaim("Your baby probably has reflux."), true);
    assert.equal(containsBlockedClaim("Your child may have an allergy."), true);
  });

  it("blocks a normality verdict", () => {
    assert.equal(containsBlockedClaim("It is definitely normal at this age."), true);
  });

  it("blocks naming a medicine to give", () => {
    assert.equal(containsBlockedClaim("You can give them paracetamol."), true);
  });

  it("allows an ordinary sourced answer", () => {
    assert.equal(
      containsBlockedClaim(
        "Many babies this age stay awake for about an hour between naps. Watching their cues tends to work better than the clock.",
      ),
      false,
    );
  });

  it("allows a non-dose number", () => {
    assert.equal(containsBlockedClaim("Around 12 weeks, many babies do this."), false);
  });
});
