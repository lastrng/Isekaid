export const DOCUMENT_TYPES = Object.freeze({ transport: "Transport", accommodation: "Hébergement", insurance: "Assurance", other: "Autre" });
export function safeDocumentUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}
export function prepareTravelDocument(input, id, now = new Date()) {
  const title = String(input.title || "").trim();
  if (!title || title.length > 100) throw new Error("Indique un titre de 1 à 100 caractères.");
  const url = String(input.url || "").trim();
  if (url && (url.length > 2000 || !safeDocumentUrl(url))) throw new Error("Utilise un lien HTTPS valide, sans identifiants dans l’adresse.");
  const reference = String(input.reference || "").trim();
  const notes = String(input.notes || "").trim();
  if (reference.length > 200 || notes.length > 3000) throw new Error("La référence ou les notes sont trop longues.");
  return { id, title, type: DOCUMENT_TYPES[input.type] ? input.type : "other", reference, notes, url: safeDocumentUrl(url), updatedAt: now.toISOString() };
}
export function upsertTravelDocument(trip, document) {
  const documents = Array.isArray(trip.documents) ? trip.documents : [];
  const exists = documents.some(item => item.id === document.id);
  if (!exists && documents.length >= 50) throw new Error("Ce voyage contient déjà 50 documents.");
  return { ...trip, documents: exists ? documents.map(item => item.id === document.id ? { ...item, ...document } : item) : [...documents, document] };
}
