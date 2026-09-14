const DATABASE_NAME = "isekaid-memory-photos";
const STORE_NAME = "pending-photos";
const DATABASE_VERSION = 1;

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("photo_store_unavailable"));
  });
}

async function transaction(mode, action) {
  const database = await openDatabase();
  if (!database) throw new Error("photo_store_unavailable");
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, mode);
    const request = action(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("photo_store_failed"));
    tx.oncomplete = () => database.close();
    tx.onerror = () => reject(tx.error || new Error("photo_store_failed"));
  });
}

export function makeLocalPhotoKey(photoId) {
  return `local-memory-photo:${photoId}`;
}

export async function savePendingPhoto(key, blob) {
  if (!key || !(blob instanceof Blob)) throw new Error("invalid_pending_photo");
  await transaction("readwrite", store => store.put(blob, key));
  return key;
}

export async function loadPendingPhoto(key) {
  if (!key) return null;
  return transaction("readonly", store => store.get(key));
}

export async function deletePendingPhoto(key) {
  if (!key || !globalThis.indexedDB) return;
  await transaction("readwrite", store => store.delete(key));
}
