import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { redactSensitiveRequestUrl } from "@/create-app";

describe("request log URL redaction", () => {
  it("removes bearer invite tokens from preview and acceptance paths", () => {
    assert.equal(
      redactSensitiveRequestUrl(
        "/api/v1/invites/secret-token_123/preview?source=email",
      ),
      "/api/v1/invites/[redacted]/preview?source=email",
    );
    assert.equal(
      redactSensitiveRequestUrl("/api/v1/invites/encoded%2Ftoken/accept"),
      "/api/v1/invites/[redacted]/accept",
    );
  });

  it("leaves non-secret route URLs unchanged", () => {
    assert.equal(
      redactSensitiveRequestUrl("/api/v1/families/current"),
      "/api/v1/families/current",
    );
  });
});
