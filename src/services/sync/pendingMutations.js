import { readJson, writeJson } from "../../lib/storage.js";

const KEY = "isekaid_pending_mutations_v1";

export function loadPendingMutations() {
  const value = readJson(KEY, []);
  return Array.isArray(value) ? value.filter(item=>item?.id && item?.type) : [];
}

export function enqueueMutation({ type, userId, payload, createdAt = Date.now() }) {
  if (!type || !userId) return false;
  const id = `${type}:${userId}`;
  // Une mutation de snapshot remplace l’ancienne : le dernier état local est la source à pousser.
  const next = loadPendingMutations().filter(item=>item.id!==id);
  next.push({ id, type, userId, payload, createdAt, attempts:0 });
  return writeJson(KEY,next);
}

let flushChain = Promise.resolve();

async function runFlush(handlers) {
  const pending = loadPendingMutations();
  const remaining = [];
  for (const mutation of pending) {
    const handler = handlers[mutation.type];
    if (!handler) { remaining.push(mutation); continue; }
    let success = false;
    try { success = await handler(mutation) === true; } catch { success = false; }
    if (!success) remaining.push({...mutation,attempts:(mutation.attempts||0)+1,lastAttemptAt:Date.now()});
  }
  // Une nouvelle sauvegarde peut être ajoutée pendant l'attente réseau.
  // Ne retirer/remplacer que les snapshots effectivement traités.
  const original = new Map(pending.map(item=>[item.id,JSON.stringify(item)]));
  const retries = new Map(remaining.map(item=>[item.id,item]));
  const merged = loadPendingMutations().flatMap(item=>{
    if(original.get(item.id)!==JSON.stringify(item)) return [item];
    return retries.has(item.id) ? [retries.get(item.id)] : [];
  });
  writeJson(KEY,merged);
  return { processed:pending.length, remaining:merged.length };
}

export function flushPendingMutations(handlers = {}) {
  // Sérialise les écritures du tableau partagé (profil et voyages peuvent
  // tenter une reprise simultanément au retour du réseau).
  flushChain = flushChain.then(()=>runFlush(handlers),()=>runFlush(handlers));
  return flushChain;
}

export { KEY as PENDING_MUTATIONS_KEY };
