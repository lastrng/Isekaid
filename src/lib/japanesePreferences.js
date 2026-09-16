export const ROMAJI_KEY = "isekaid_show_romaji_v1";

// Absence of a choice (including legacy accounts) means reading help is on.
export function loadShowRomaji(storage = globalThis.localStorage) {
  try { return storage?.getItem(ROMAJI_KEY) !== "false"; }
  catch { return true; }
}

export function saveShowRomaji(value, storage = globalThis.localStorage) {
  try { storage?.setItem(ROMAJI_KEY, String(value !== false)); } catch { /* Offline storage may be unavailable. */ }
}

export function effectiveJapaneseScript(script, showRomaji = true) {
  const valid = ["kana", "kanji", "romaji"].includes(script) ? script : "kana";
  return !showRomaji && valid === "romaji" ? "kana" : valid;
}
