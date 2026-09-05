import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_REMINDER, loadDailyReminder } from "../src/features/reminders/dailyReminder.js";

test("le rappel quotidien est désactivé par défaut", () => {
  assert.deepEqual(loadDailyReminder(), DEFAULT_REMINDER);
});
