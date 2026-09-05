import { useEffect, useMemo, useState } from "react";
import { filterMemories } from "./memoryJournal.js";

function MemoryEntry({ C, memory, getPhotoUrl, onPhoto, onNote }) {
  const [url, setUrl] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memory.note || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setUrl(null);
    if (memory.photo) Promise.resolve(getPhotoUrl(memory.photo)).then(value => {
      if (live) setUrl(value);
    }).catch(() => { if (live) setError("La photo n’est pas disponible pour le moment."); });
    return () => { live = false; };
  }, [memory.photo, getPhotoUrl]);
  const run = async action => {
    setBusy(true); setError("");
    try { await action(); } catch { setError("Enregistrement impossible. Réessaie, ton texte est conservé ici."); }
    finally { setBusy(false); }
  };
  const button = { padding: "9px 11px", borderRadius: 10, border: `1px solid ${C.border}`, color: C.text, background: C.s1, fontSize: 11, cursor: "pointer" };
  return <article style={{ padding: 14, borderRadius: 14, background: C.s2, border: `1px solid ${C.border}` }}>
    {url && <a href={url} target="_blank" rel="noreferrer" aria-label={`Agrandir la photo de ${memory.placeName}`}><img src={url} alt={memory.placeName} loading="lazy" style={{ width: "100%", maxHeight: 230, objectFit: "cover", borderRadius: 10, marginBottom: 10 }} /></a>}
    <div style={{ fontSize: 13, fontWeight: 650, color: C.text }}>{memory.placeEmoji} {memory.placeName}</div>
    <div style={{ fontSize: 10, color: C.t3, marginTop: 4 }}>{memory.tripTitle} · Jour {memory.dayNumber}</div>
    {editing ? <form onSubmit={event => { event.preventDefault(); run(async () => { await onNote(memory, draft); setEditing(false); }); }}>
      <label style={{ display: "block", marginTop: 12, fontSize: 11, color: C.t2 }}>Ton souvenir<textarea autoFocus value={draft} maxLength={3000} onChange={event => setDraft(event.target.value)} rows={5} style={{ display: "block", boxSizing: "border-box", width: "100%", resize: "vertical", marginTop: 6, padding: 10, background: C.s1, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, font: "inherit", fontSize: 13 }} /></label>
      <div style={{ fontSize: 10, color: C.t3, textAlign: "right" }}>{draft.length} / 3 000</div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}><button disabled={busy} style={button}>{busy ? "Enregistrement…" : "Enregistrer"}</button><button type="button" disabled={busy} onClick={() => setEditing(false)} style={button}>Annuler</button></div>
    </form> : <>
      <p style={{ fontSize: 12, lineHeight: 1.6, color: memory.note ? C.text : C.t3, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{memory.note || "Un goût, une rencontre, une surprise… raconte ce moment."}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        <button type="button" disabled={busy || !memory.activityId} onClick={() => { setDraft(memory.note || ""); setEditing(true); }} style={button}>{memory.note ? "Modifier ma note" : "Écrire un souvenir"}</button>
        <label style={button}>{busy ? "Enregistrement…" : memory.photo ? "Changer la photo" : "Ajouter une photo"}<input type="file" accept="image/*" hidden disabled={busy || !memory.activityId} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) run(() => onPhoto(memory, file)); }} /></label>
        {memory.photo && <button type="button" disabled={busy} onClick={() => run(() => onPhoto(memory, null))} style={{ ...button, color: C.red }}>Retirer la photo</button>}
      </div>
    </>}
    {error && <p role="alert" style={{ color: C.red, fontSize: 11 }}>{error}</p>}
  </article>;
}

export function MemoryJournal({ C, memories, getPhotoUrl, onPhoto, onNote }) {
  const [query, setQuery] = useState("");
  const [tripId, setTripId] = useState("");
  const [photosOnly, setPhotosOnly] = useState(false);
  const [limit, setLimit] = useState(12);
  const trips = useMemo(() => [...new Map(memories.map(memory => [memory.tripId, memory.tripTitle]))], [memories]);
  const filtered = useMemo(() => filterMemories(memories, { query, tripId, photosOnly }), [memories, query, tripId, photosOnly]);
  const control = { boxSizing: "border-box", width: "100%", padding: 11, fontSize: 12, color: C.text, background: C.s1, border: `1px solid ${C.border}`, borderRadius: 10 };
  return <section aria-label="Carnet personnel" style={{ marginTop: 20 }}>
    <h3 style={{ fontSize: 14, color: C.text }}>Carnet personnel</h3>
    <input type="search" aria-label="Rechercher dans mes souvenirs" placeholder="Rechercher un lieu, un voyage, un souvenir…" value={query} onChange={event => { setQuery(event.target.value); setLimit(12); }} style={control} />
    {trips.length > 1 && <select aria-label="Filtrer les souvenirs par voyage" value={tripId} onChange={event => { setTripId(event.target.value); setLimit(12); }} style={{ ...control, marginTop: 8 }}><option value="">Tous mes voyages</option>{trips.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select>}
    <label style={{ display: "flex", alignItems: "center", gap: 7, color: C.t2, fontSize: 11, margin: "12px 0" }}><input type="checkbox" checked={photosOnly} onChange={event => { setPhotosOnly(event.target.checked); setLimit(12); }} />Avec photo uniquement</label>
    <p role="status" style={{ fontSize: 10, color: C.t3 }}>{filtered.length} moment{filtered.length > 1 ? "s" : ""}</p>
    <div style={{ display: "grid", gap: 12 }}>{filtered.slice(0, limit).map(memory => <MemoryEntry key={memory.id} C={C} memory={memory} getPhotoUrl={getPhotoUrl} onPhoto={onPhoto} onNote={onNote} />)}</div>
    {!filtered.length && <p style={{ fontSize: 12, color: C.t3 }}>{memories.length ? "Aucun souvenir ne correspond à ces filtres." : "Tes lieux marqués comme faits apparaîtront ici une fois le voyage terminé."}</p>}
    {filtered.length > limit && <button onClick={() => setLimit(value => value + 12)} style={{ ...control, marginTop: 12, cursor: "pointer" }}>Afficher plus de souvenirs</button>}
  </section>;
}
