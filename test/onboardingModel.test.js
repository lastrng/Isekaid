import test from "node:test";
import assert from "node:assert/strict";
import { buildOnboardingProfile, validateOnboardingTravel } from "../src/features/onboarding/onboardingModel.js";
import { normalizeProfile } from "../src/entities/user/profileModel.js";
test("conserve et normalise les anciens profils de façon idempotente", () => {
  const old = { name: " Léa ", goal: "travel", custom: { retained: true }, why: ["culture", "culture"] };
  const profile = normalizeProfile(old);
  assert.equal(profile.japanRelationship, "planning");
  assert.equal(profile.plannedDurationDays, null);
  assert.equal(profile.plannedDeparture, null);
  assert.equal(profile.firstTrip, null);
  assert.equal(profile.emojiAvatar, "🦊");
  assert.deepEqual(profile.custom, old.custom);
  assert.deepEqual(normalizeProfile(profile), profile);
  assert.equal(old.name, " Léa ");
});
test("les six choix produisent un profil compatible avec les anciens champs", () => {
  for (const relationship of ["dreaming", "planning", "soon", "in_japan", "returned", "japan_lover"]) {
    const profile = buildOnboardingProfile({ relationship, departureDate: "2026-09-05", duration: "14", firstTrip: false, why: ["gastro"], level: "beginner" });
    assert.equal(profile.japanRelationship, relationship);
    assert.ok(["travel", "imm"].includes(profile.goal));
    assert.equal(profile.plannedDurationDays, relationship === "dreaming" ? null : 14);
    assert.equal(profile.plannedDeparture, ["planning", "soon"].includes(relationship) ? "2026-09-05" : null);
    assert.equal(profile.journeyStartDate, ["in_japan", "returned", "japan_lover"].includes(relationship) ? "2026-09-05" : null);
  }
});
test("les données facultatives restent inconnues et les valeurs invalides sont signalées", () => {
  const profile = buildOnboardingProfile({ relationship: "soon", duration: "", departureDate: "" });
  assert.equal(profile.name, "Voyageur");
  assert.equal(profile.firstTrip, null);
  assert.equal(profile.plannedDurationDays, null);
  for (const duration of ["0", "-1", "1.5", "366", "abc"]) assert.ok(validateOnboardingTravel({ relationship: "planning", duration }));
  assert.throws(() => buildOnboardingProfile({ relationship: "returned", departureDate: "2026-02-30" }));
  assert.equal(normalizeProfile({ plannedDeparture: "2026-02-30", plannedDurationDays: "abc" }).plannedDeparture, null);
});

test("refuse une relation inconnue lorsqu'un profil est construit hors UI", () => {
  assert.throws(() => buildOnboardingProfile({ relationship: "unknown", why: ["culture"], level: "beginner" }), /Choisis où tu en es/);
  assert.ok(validateOnboardingTravel({ relationship: "unknown" }));
});
