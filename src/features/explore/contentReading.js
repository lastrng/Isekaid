import { readJson, writeJson } from "../../lib/storage.js";

export const CONTENT_READING_KEY = "isekaid_content_reading_v1";

export function contentReadingId(type, item) {
  const identity = item?.id || item?.expression || item?.titre || item?.nom || item?.nom_jp;
  return identity ? `${type}:${identity}` : null;
}

export function loadContentReading() {
  const value = readJson(CONTENT_READING_KEY, { version:1, read:{} });
  return value && value.version === 1 && value.read && typeof value.read === "object" ? value : { version:1, read:{} };
}

export function saveContentReading(progress) {
  return writeJson(CONTENT_READING_KEY, progress);
}

export function markContentRead(progress, type, item, date = new Date()) {
  const id = contentReadingId(type,item);
  if (!id) return progress || { version:1, read:{} };
  return { version:1, read:{...(progress?.read || {}),[id]:date instanceof Date ? date.toISOString() : String(date)} };
}

export function isContentRead(progress, type, item) {
  const id = contentReadingId(type,item);
  return Boolean(id && progress?.read?.[id]);
}

export function readingCount(progress) {
  return Object.keys(progress?.read || {}).length;
}
