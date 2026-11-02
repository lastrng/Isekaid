import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_REMINDER, dailyNotificationRequests, loadDailyReminder } from "../src/features/reminders/dailyReminder.js";

test("le rappel quotidien est désactivé par défaut", () => {
  assert.deepEqual(loadDailyReminder(), DEFAULT_REMINDER);
});

test("programme le contenu du jour puis les missions", () => {
  const notifications = dailyNotificationRequests({ ...DEFAULT_REMINDER, hour:20, minute:15 });
  assert.deepEqual(notifications.map(item=>item.id),[1904,1905]);
  assert.deepEqual(notifications[0].schedule.on,{hour:8,minute:30});
  assert.deepEqual(notifications[1].schedule.on,{hour:20,minute:15});
  assert.equal(notifications.every(item=>item.schedule.repeats),true);
  assert.equal(notifications.every(item=>item.isExactNotification===false),true);
});

test("ne rappelle plus les missions lorsqu'elles sont accomplies", () => {
  const notifications = dailyNotificationRequests(DEFAULT_REMINDER,{missionsComplete:true});
  assert.deepEqual(notifications.map(item=>item.id),[1904]);
});
