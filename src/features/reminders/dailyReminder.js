import { Capacitor } from "@capacitor/core";
import { readJson, writeJson } from "../../lib/storage.js";

const REMINDER_ID = 1904;
const SETTINGS_KEY = "isekaid_daily_reminder_v1";
export const DEFAULT_REMINDER = { enabled: false, hour: 19, minute: 0 };

export function loadDailyReminder() {
  const stored = readJson(SETTINGS_KEY, DEFAULT_REMINDER);
  return { ...DEFAULT_REMINDER, ...(stored || {}) };
}

export function supportsDailyReminder() {
  return Capacitor.isNativePlatform();
}

async function notificationsPlugin() {
  return import("@capacitor/local-notifications").then((module) => module.LocalNotifications);
}

export async function disableDailyReminder() {
  if (supportsDailyReminder()) {
    const notifications = await notificationsPlugin();
    await notifications.cancel({ notifications: [{ id: REMINDER_ID }] });
  }
  const settings = { ...loadDailyReminder(), enabled: false };
  writeJson(SETTINGS_KEY, settings);
  return settings;
}

export async function enableDailyReminder(options = {}) {
  if (!supportsDailyReminder()) return { ok: false, reason: "unsupported" };
  const settings = { ...loadDailyReminder(), ...options, enabled: true };
  const notifications = await notificationsPlugin();
  const permission = await notifications.requestPermissions();
  if (permission.display !== "granted") return { ok: false, reason: "permission_denied" };

  await notifications.cancel({ notifications: [{ id: REMINDER_ID }] });
  await notifications.schedule({
    notifications: [{
      id: REMINDER_ID,
      title: "Ton Japon du jour t’attend 🇯🇵",
      body: "Quelques minutes suffisent pour poursuivre ta mission et ton apprentissage.",
      schedule: {
        on: { hour: settings.hour, minute: settings.minute },
        repeats: true,
        allowWhileIdle: true,
      },
    }],
  });
  writeJson(SETTINGS_KEY, settings);
  return { ok: true, settings };
}
