/** Accès tolérant au stockage local (SSR, navigation privée, quota plein). */
export function readJson(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw === null || raw === undefined ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readString(key, fallback = null) {
  try {
    return globalThis.localStorage?.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeString(key, value) {
  try {
    globalThis.localStorage?.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStored(key) {
  try {
    globalThis.localStorage?.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Supprime uniquement les clés appartenant à l'application. */
export function clearStoredNamespace(prefix = "isekaid_") {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return false;
    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}
