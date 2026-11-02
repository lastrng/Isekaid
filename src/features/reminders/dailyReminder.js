import { Capacitor } from "@capacitor/core";
import { readJson, writeJson } from "../../lib/storage.js";

const CONTENT_REMINDER_ID = 1904;
const MISSION_REMINDER_ID = 1905;
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

export function dailyNotificationRequests(settings = DEFAULT_REMINDER, { missionsComplete = false } = {}) {
  const notifications = [{
    id: CONTENT_REMINDER_ID,
    title: "Ton nouveau contenu du jour est arrivé 🇯🇵",
    body: "Une découverte japonaise et une expression utile t’attendent.",
    schedule: {
      on: { hour: 8, minute: 30 },
      repeats: true,
      allowWhileIdle: true,
    },
    isExactNotification: false,
  }];
  if (!missionsComplete) notifications.push({
    id: MISSION_REMINDER_ID,
    title: "Tes missions du jour t’attendent 🎯",
    body: "Quelques minutes suffisent pour accomplir tes missions et faire avancer ton Japon.",
    schedule: {
      on: { hour:settings.hour, minute:settings.minute },
      repeats: true,
      allowWhileIdle: true,
    },
    isExactNotification: false,
  });
  return notifications;
}

async function replaceDailyNotifications(notifications, missionsComplete) {
  await notifications.cancel({ notifications: [
    { id:CONTENT_REMINDER_ID },
    { id:MISSION_REMINDER_ID },
  ] });
  await notifications.schedule({
    notifications:dailyNotificationRequests(loadDailyReminder(), { missionsComplete }),
  });
}

export async function disableDailyReminder() {
  if (supportsDailyReminder()) {
    const notifications = await notificationsPlugin();
    await notifications.cancel({ notifications: [
      { id:CONTENT_REMINDER_ID },
      { id:MISSION_REMINDER_ID },
    ] });
  }
  const settings = { ...loadDailyReminder(), enabled: false };
  writeJson(SETTINGS_KEY, settings);
  return settings;
}

export async function enableDailyReminder(options = {}, context = {}) {
  if (!supportsDailyReminder()) return { ok: false, reason: "unsupported" };
  const settings = { ...loadDailyReminder(), ...options, enabled: true };
  const notifications = await notificationsPlugin();
  const permission = await notifications.requestPermissions();
  if (permission.display !== "granted") return { ok: false, reason: "permission_denied" };

  writeJson(SETTINGS_KEY, settings);
  await replaceDailyNotifications(notifications, context.missionsComplete === true);
  return { ok: true, settings };
}

export async function syncDailyNotifications(context = {}) {
  const settings = loadDailyReminder();
  if (!settings.enabled || !supportsDailyReminder()) return { ok:false, reason:"disabled" };
  const notifications = await notificationsPlugin();
  await replaceDailyNotifications(notifications, context.missionsComplete === true);
  return { ok:true };
}
