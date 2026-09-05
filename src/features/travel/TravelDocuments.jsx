import { DocumentAttachment } from "./DocumentAttachment.jsx";
import { useState } from "react";
import { DOCUMENT_TYPES, prepareTravelDocument, safeDocumentUrl, upsertTravelDocument } from "./travelDocuments.js";
const empty = { title: "", type: "transport", reference: "", notes: "", url: "" };
export function TravelDocuments({ C, trip, owner, onUpdate, onBack }) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState("");
  const [undo, setUndo] = useState(null);
  const documents = Array.isArray(trip.documents) ? trip.documents : [];
  const button = { padding: "11px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.s2, color: C.text, cursor: "pointer" };
  const edit = document => { setDraft({ ...document }); setError(""); };
  const save = event => {
    event.preventDefault();
    try {
      const document = prepareTravelDocument(draft, draft.id || crypto.randomUUID());
      if(onUpdate(upsertTravelDocument(trip, document)) === false) throw new Error("Enregistrement impossible. Conserve ce formulaire ouvert et réessaie.");
      setDraft(null); setError("");
    } catch (error) { setError(error.message); }
  };
  return <section style={{ height: "100%", overflowY: "auto", padding: "45px 20px 110px", boxSizing: "border-box", background: C.bg, color: C.text }}>
    <button style={button} onClick={onBack}>‹ Retour au voyage</button>
    <h1 style={{ fontFamily: "'Noto Serif JP',serif", fontSize: 24 }}>Documents et réservations</h1>
    <p style={{ color: C.t2, fontSize: 13, lineHeight: 1.6 }}>Garde les références, adresses et liens utiles de ton séjour. Les informations enregistrées restent consultables hors connexion ; l’ouverture des liens nécessite Internet.</p>
    <p style={{ color: C.t3, fontSize: 12 }}>PDF, JPEG et PNG : 10 Mo maximum par fichier. Les pièces jointes restent uniquement sur cet appareil et ne sont pas synchronisées. Conserve tes originaux.</p>
    {!draft && <button style={button} onClick={() => edit(empty)}>+ Ajouter une référence</button>}
    {draft && <form onSubmit={save} style={{ display: "grid", gap: 12, padding: "18px 0" }}>
      <label>Catégorie<select value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })} style={{ display: "block", padding: 12, width: "100%", background: C.s1, color: C.text }}>{Object.entries(DOCUMENT_TYPES).map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label>
      {[["title", "Titre", 100], ["reference", "Référence de réservation", 200], ["url", "Lien HTTPS (facultatif)", 2000], ["notes", "Adresse et notes", 3000]].map(([field, label, maxLength]) => <label key={field} style={{ fontSize: 13 }}>{label}<textarea rows={field === "notes" ? 4 : 2} required={field === "title"} maxLength={maxLength} value={draft[field] || ""} onChange={e => setDraft({ ...draft, [field]: e.target.value })} style={{ display: "block", boxSizing: "border-box", width: "100%", marginTop: 5, padding: 12, borderRadius: 12, border: `1px solid ${C.border}`, background: C.s1, color: C.text }}/></label>)}
      <div style={{ display: "flex", gap: 8 }}><button style={button} type="submit">Enregistrer</button><button style={button} type="button" onClick={() => setDraft(null)}>Annuler</button></div>
    </form>}
    {error && <p role="alert" style={{ color: C.red }}>{error}</p>}
    {!documents.length && !draft && <p style={{ color: C.t3 }}>Aucune référence enregistrée. Commence par ton transport ou ton hébergement.</p>}
    {documents.map(document => <article key={document.id} style={{ padding: 16, borderRadius: 16, border: `1px solid ${C.border}`, background: C.s1, marginTop: 14, overflowWrap: "anywhere" }}>
      <small style={{ color: C.t3 }}>{DOCUMENT_TYPES[document.type] || "Autre"}</small><h2 style={{ fontSize: 17 }}>{document.title}</h2>
      {document.reference && <p>{document.reference}</p>}{document.notes && <p style={{ whiteSpace: "pre-wrap", color: C.t2 }}>{document.notes}</p>}
      {safeDocumentUrl(document.url) && <p><a href={safeDocumentUrl(document.url)} target="_blank" rel="noopener noreferrer" style={{ color: C.red }}>Ouvrir le lien ↗</a></p>}
      <DocumentAttachment key={`${owner}:${trip.id}:${document.id}`} C={C} owner={owner} tripId={trip.id} documentId={document.id}/>
      <div style={{ display: "flex", gap: 8 }}><button style={button} onClick={() => edit(document)}>Modifier</button><button style={button} onClick={() => { if(onUpdate({ ...trip, documents: documents.filter(item => item.id !== document.id) }) !== false) setUndo(document); }}>Retirer</button></div>
    </article>)}
    {undo && <button style={{ ...button, marginTop: 14 }} onClick={() => { try { if(onUpdate(upsertTravelDocument(trip, undo)) !== false) setUndo(null); } catch (error) { setError(error.message); } }}>Annuler le retrait de « {undo.title} »</button>}
  </section>;
}
