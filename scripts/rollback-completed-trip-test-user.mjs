import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  SIMULATION_TRIP_ID,
  loadTargetSnapshot,
  otherUsersFingerprint,
  requireAllowedEmail,
  resolveTargetUser,
  restoreSql,
  runLinkedQuery,
  stable,
} from "./completed-trip-simulation-lib.mjs";

const targetEmail = requireAllowedEmail();
const targetUser = resolveTargetUser(targetEmail);
const backupArgument = process.argv.find(argument => argument.startsWith("--backup-dir="));
if (!backupArgument) throw new Error("--backup-dir est obligatoire.");
const backupDir = resolve(backupArgument.slice("--backup-dir=".length));
const manifest = JSON.parse(readFileSync(resolve(backupDir, "manifest.json"), "utf8"));
const before = JSON.parse(readFileSync(resolve(backupDir, "before-state.json"), "utf8"));
if (manifest.targetEmail !== targetEmail || manifest.targetUserId !== targetUser.id || before.authUser?.id !== targetUser.id) throw new Error("Refus de sécurité : le backup ne correspond pas au compte Auth exact.");
if (!Array.isArray(before.user_backups) || before.user_backups.length !== 1 || before.user_backups[0].user_id !== targetUser.id) throw new Error("Refus de sécurité : la sauvegarde cloud d’origine est absente ou ambiguë.");

const current = loadTargetSnapshot(targetUser.id);
const simulated = (current.progress.trips || []).filter(trip => trip.id === SIMULATION_TRIP_ID);
if (simulated.length !== 1) throw new Error(`Rollback refusé : ${simulated.length} voyage(s) de simulation trouvé(s).`);
const currentWithoutSimulation = current.progress.trips.filter(trip => trip.id !== SIMULATION_TRIP_ID);
if (JSON.stringify(stable(currentWithoutSimulation)) !== JSON.stringify(stable(before.progress.trips))) throw new Error("Rollback refusé : d’autres voyages ont changé depuis le seed. Aucun écrasement automatique.");
const otherUsersBeforeRollback = otherUsersFingerprint(targetUser.id);
runLinkedQuery(restoreSql({
  targetEmail,
  targetUserId: targetUser.id,
  originalTrips: before.progress.trips,
  originalUpdatedAt: before.progress.updated_at,
  originalUserBackup: before.user_backups[0],
}));
const restored = loadTargetSnapshot(targetUser.id);
const otherUsersAfterRollback = otherUsersFingerprint(targetUser.id);
if (
  JSON.stringify(stable(restored.progress.trips)) !== JSON.stringify(stable(before.progress.trips))
  || restored.progress.updated_at !== before.progress.updated_at
  || JSON.stringify(stable(restored.user_backups)) !== JSON.stringify(stable(before.user_backups))
) throw new Error("La restauration distante ne correspond pas au backup.");
if (JSON.stringify(stable(otherUsersBeforeRollback)) !== JSON.stringify(stable(otherUsersAfterRollback))) throw new Error("ALERTE : l’empreinte des autres utilisateurs a changé pendant le rollback.");
const report = { rolledBackAt:new Date().toISOString(), targetEmail, targetUserId:targetUser.id, restoredTrips:restored.progress.trips.length, otherUsersUnchanged:true };
writeFileSync(resolve(backupDir, "rollback-validation.json"), `${JSON.stringify(report, null, 2)}\n`, { flag:"wx", mode:0o600 });
console.log(JSON.stringify(report, null, 2));
