export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const DB_NAME = "isekaid_document_files_v1";
const STORE = "files";
export function documentFileKey(owner, tripId, id) {
  if (![owner, tripId, id].every(value => typeof value === "string" && value.length > 0)) throw new Error("Document non identifié.");
  return [owner, tripId, id];
}
export async function validateDocumentFile(file) {
  if (!file || file.size === 0 || file.size > MAX_DOCUMENT_BYTES) throw new Error("Choisis un fichier non vide de 10 Mo maximum.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = String.fromCharCode(...bytes);
  const type = ascii.startsWith("%PDF-") ? "application/pdf"
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "image/jpeg"
    : [137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value) ? "image/png" : null;
  if (!type) throw new Error("Formats acceptés : PDF, JPEG et PNG.");
  return { name: String(file.name || "document").slice(0, 180), type, size: file.size };
}
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error("Le stockage de fichiers est indisponible sur cet appareil."));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => reject(new Error("Impossible d’ouvrir le stockage de fichiers."));
    request.onblocked = () => reject(new Error("Ferme les autres fenêtres de l’application puis réessaie."));
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => db.close(); resolve(db); };
  });
}
async function transaction(mode, operation) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(new Error("Le fichier n’a pas pu être enregistré ou lu. Vérifie l’espace disponible."));
      tx.onerror = () => {}; // onabort carries the final transaction failure.
      operation(tx.objectStore(STORE), value => { result = value; });
    });
  } finally { db.close(); }
}
export async function saveDocumentFile(owner, tripId, id, file) {
  const metadata = await validateDocumentFile(file);
  const blob = file.slice(0, file.size, metadata.type);
  await transaction("readwrite", store => store.put({ blob, metadata }, documentFileKey(owner, tripId, id)));
  return metadata;
}
export function loadDocumentFile(owner, tripId, id) {
  return transaction("readonly", (store, done) => { const request = store.get(documentFileKey(owner, tripId, id)); request.onsuccess = () => done(request.result || null); });
}
export function removeDocumentFile(owner, tripId, id) {
  return transaction("readwrite", store => store.delete(documentFileKey(owner, tripId, id)));
}
export function clearAccountDocumentFiles(owner) {
  return transaction("readwrite", store => {
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      if (cursor.key[0] === owner) cursor.delete();
      cursor.continue();
    };
  });
}
