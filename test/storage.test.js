import test from "node:test";
import assert from "node:assert/strict";

import { clearStoredNamespace, readJson, readString, removeStored, writeJson, writeString } from "../src/lib/storage.js";

function withStorage(run) {
  const values = new Map();
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    get length() { return values.size; },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  try { run(); } finally { globalThis.localStorage = previous; }
}

test("storage lit et écrit JSON et texte", () => withStorage(() => {
  assert.equal(writeJson("json", { ok: true }), true);
  assert.deepEqual(readJson("json", null), { ok: true });
  assert.equal(writeString("text", "value"), true);
  assert.equal(readString("text"), "value");
  assert.equal(removeStored("text"), true);
  assert.equal(readString("text", "fallback"), "fallback");
}));

test("clearStoredNamespace ne supprime pas les données des autres applications", () => withStorage(() => {
  globalThis.localStorage.setItem("isekaid_profile_v1", "profile");
  globalThis.localStorage.setItem("another_app", "keep");
  assert.equal(clearStoredNamespace(), true);
  assert.equal(globalThis.localStorage.getItem("isekaid_profile_v1"), null);
  assert.equal(globalThis.localStorage.getItem("another_app"), "keep");
}));

test("storage retourne le fallback sur un JSON corrompu", () => withStorage(() => {
  globalThis.localStorage.setItem("broken", "{");
  assert.deepEqual(readJson("broken", []), []);
}));
