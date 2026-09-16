import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildMyJapanSummary } from "../src/features/my-japan/myJapanModel.js";
import {
  ALLOWED_TARGET_EMAIL,
  SIMULATION_TRIP_ID,
  buildSimulationTrip,
  loadTargetSnapshot,
  otherUsersFingerprint,
  requireAllowedEmail,
  resolveTargetUser,
  runLinkedQuery,
  seedSql,
  stable,
} from "./completed-trip-simulation-lib.mjs";

const targetEmail = requireAllowedEmail();
const targetUser = resolveTargetUser(targetEmail);
const targetUserId = targetUser.id;
console.log(`Target account:\n${targetEmail}\nUUID:\n${targetUserId}`);

const backupArgument = process.argv.find(argument => argument.startsWith("--backup-dir="));
if (!backupArgument) throw new Error("--backup-dir est obligatoire.");
const backupDir = resolve(backupArgument.slice("--backup-dir=".length));
if (!backupDir.includes("supabase-completed-trip-simulation-")) throw new Error("Dossier de backup non conforme.");

const before = loadTargetSnapshot(targetUserId);
if ((before.progress.trips || []).some(trip => trip.id === SIMULATION_TRIP_ID)) throw new Error("Le voyage de simulation existe déjà : aucune écriture effectuée.");
if (!(before.progress.trips || []).some(trip => trip.titre === "Tokyo & Hiroshima · 5 jours")) throw new Error("Voyage existant Tokyo & Hiroshima introuvable : arrêt par sécurité.");
const otherUsersBefore = otherUsersFingerprint(targetUserId);

const catalog = JSON.parse(readFileSync(new URL("../src/japan-data.json", import.meta.url), "utf8"));
const trip = buildSimulationTrip();
const cityIds = new Set((catalog.villes || []).map(city => city.id));
const placeIds = new Set((catalog.lieux || []).map(place => place.id));
for (const cityId of trip.villes) if (!cityIds.has(cityId)) throw new Error(`Ville absente du catalogue : ${cityId}`);
for (const day of trip.jours) for (const activity of day.activites) if (!placeIds.has(activity.lieuId)) throw new Error(`Lieu absent du catalogue : ${activity.lieuId}`);

mkdirSync(backupDir, { recursive: false });
const manifest = {
  createdAt: new Date().toISOString(),
  targetEmail,
  targetUserId,
  affectedTable: "public.progress",
  affectedColumns: ["trips", "updated_at"],
  rowsToUpdate: 1,
  otherUsersBefore,
  schema: {
    travelStorage: "public.progress.trips (jsonb)",
    tripDays: "trips[].jours[]",
    completedActivitiesAndVisitedPlaces: "trips[].jours[].activites[].fait === true",
    journal: "trips[].jours[].activites[].note / memoryPhoto",
    visitedPrefectures: "derived from completed activities and day.villeId",
    stampsAndBadges: "derived by src/features/my-japan/myJapanModel.js",
  },
};
writeFileSync(resolve(backupDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx", mode: 0o600 });
writeFileSync(resolve(backupDir, "before-state.json"), `${JSON.stringify({ authUser:targetUser, ...before }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
writeFileSync(resolve(backupDir, "rollback-command.txt"), [
  "cd /home/ubuntu/isekaid",
  "set -a",
  "source .env",
  "set +a",
  `TARGET_EMAIL=${ALLOWED_TARGET_EMAIL} SUPABASE_CLI=${process.env.SUPABASE_CLI || "npx"} node scripts/rollback-completed-trip-test-user.mjs --backup-dir=${backupDir}`,
  "",
].join("\n"), { flag: "wx", mode: 0o600 });

runLinkedQuery(seedSql({ targetEmail, targetUserId, trip }));

const after = loadTargetSnapshot(targetUserId);
const otherUsersAfter = otherUsersFingerprint(targetUserId);
if (JSON.stringify(stable(otherUsersBefore)) !== JSON.stringify(stable(otherUsersAfter))) throw new Error("ALERTE : l’empreinte des autres utilisateurs a changé.");
const created = (after.progress.trips || []).filter(item => item.id === SIMULATION_TRIP_ID);
if (created.length !== 1) throw new Error(`Validation impossible : ${created.length} voyage(s) de simulation trouvé(s).`);
const existingBefore = before.progress.trips.find(item => item.titre === "Tokyo & Hiroshima · 5 jours");
const existingAfter = after.progress.trips.find(item => item.id === existingBefore.id);
if (JSON.stringify(stable(existingBefore)) !== JSON.stringify(stable(existingAfter))) throw new Error("Le voyage Tokyo & Hiroshima a été modifié.");

const summary = buildMyJapanSummary({
  trips: after.progress.trips,
  cities: catalog.villes || [],
  places: catalog.lieux || [],
  regionsCatalog: catalog.regions || [],
  favorites: after.progress.favorites,
  kanaProgress: after.progress.kana_progress,
  expressionProgress: after.progress.profile?.expressionProgress,
  streak: after.progress.streak,
  currentDate: new Date("2026-09-11T12:00:00Z"),
});
const validation = {
  validatedAt: new Date().toISOString(),
  targetEmail,
  targetUserId,
  otherUsersUnchanged: true,
  totalTrips: after.progress.trips.length,
  preservedTrip: { id:existingAfter.id, title:existingAfter.titre, unchanged:true },
  createdTrip: { id:created[0].id, title:created[0].titre, status:created[0].status, days:created[0].jours.length, activities:created[0].jours.flatMap(day => day.activites).length, visitedPlaces:created[0].jours.flatMap(day => day.activites).filter(activity => activity.fait === true).length, journalNotes:created[0].jours.flatMap(day => day.activites).filter(activity => activity.note).length },
  myJapan: { completedTrips:summary.completedTrips, completedDays:summary.completedDays, visitedPlaces:summary.visitedPlaces, visitedPrefectures:summary.visitedPrefectureIds, stamps:summary.stamps.map(stamp => ({ id:stamp.id, label:stamp.label })), badges:summary.badges.map(badge => ({ id:badge.id, label:badge.label })) },
  untouchedProgress: { favorites:after.progress.favorites.length, streak:after.progress.streak, scenarios:after.progress.scenarios, kanaProgress:after.progress.kana_progress },
};
writeFileSync(resolve(backupDir, "after-validation.json"), `${JSON.stringify(validation, null, 2)}\n`, { flag: "wx", mode: 0o600 });
console.log(JSON.stringify(validation, null, 2));
