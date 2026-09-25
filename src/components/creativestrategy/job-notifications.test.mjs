import { test } from "node:test";
import assert from "node:assert/strict";
import { isCurrentSessionResult } from "./job-notifications.js";

test("restored failures and paginated history do not create fresh alerts", () => {
  const session = new Set();
  assert.equal(isCurrentSessionResult({ id: "old-failure", finishedAt: 500 }, 1000, session), false);
  assert.equal(isCurrentSessionResult({ id: "older-success", finishedAt: 100 }, 1000, session), false);
  assert.equal(isCurrentSessionResult({ id: "missing-date" }, 1000, session), false);
});

test("jobs finishing during this session still notify, including between history polls", () => {
  assert.equal(isCurrentSessionResult({ id: "new-result", finishedAt: 1100 }, 1000, new Set()), true);
  assert.equal(isCurrentSessionResult({ id: "tracked-job" }, 1000, new Set(["tracked-job"])), true);
  assert.equal(isCurrentSessionResult({ id: "old-failure", finishedAt: 500 }, 1000, new Set(["other-job"])), false);
});
