import { useEffect, useRef, useState } from "react";
import { loadDocumentFile, removeDocumentFile, saveDocumentFile } from "./documentFiles.js";

export function DocumentAttachment({ C, owner, tripId, documentId }) {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    loadDocumentFile(owner, tripId, documentId).then(value => { if (alive.current) setFile(value); })
      .catch(error => { if (alive.current) setError(error.message); }).finally(() => { if (alive.current) setBusy(false); });
    return () => { alive.current = false; };
  }, [owner, tripId, documentId]);
  useEffect(() => {
    if (!file) { setUrl(""); return; }
    const objectUrl = URL.createObjectURL(file.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  const importFile = async event => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    setBusy(true); setError("");
    try {
      await saveDocumentFile(owner, tripId, documentId, selected);
      const saved = await loadDocumentFile(owner, tripId, documentId);
      if (alive.current) setFile(saved);
    } catch (error) { if (alive.current) setError(error.message); }
    finally { if (alive.current) setBusy(false); }
  };
  const remove = async () => {
    if (!confirm("Retirer ce fichier de cet appareil ? Conserve ton original si tu souhaites le réimporter.")) return;
    setBusy(true); setError("");
    try { await removeDocumentFile(owner, tripId, documentId); if (alive.current) setFile(null); }
    catch (error) { if (alive.current) setError(error.message); }
    finally { if (alive.current) setBusy(false); }
  };
  return <div style={{ padding: "12px 0", borderTop: `1px solid ${C.border}`, fontSize: 12 }} aria-busy={busy}>
    {busy && <p role="status">Chargement du fichier…</p>}
    {error && <p role="alert" style={{ color: C.red }}>{error}</p>}
    {file && <><p>{file.metadata.name} · {(file.metadata.size / 1024 / 1024).toFixed(1)} Mo · disponible hors connexion</p>
      {url && file.metadata.type.startsWith("image/") && <img src={url} alt={file.metadata.name} style={{ maxWidth: "100%", maxHeight: 380, objectFit: "contain", borderRadius: 10 }}/ >}
      {url && <p><a href={url} download={file.metadata.name} style={{ color: C.red }}>Ouvrir / télécharger le fichier</a></p>}
      <button disabled={busy} onClick={remove} style={{ padding: 10, background: C.s2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10 }}>Retirer le fichier local</button>
    </>}
    {!file && !busy && <p style={{ color: C.t3 }}>Aucun fichier disponible sur cet appareil.</p>}
    <label style={{ display: "block", marginTop: 12 }}>{file ? "Remplacer le fichier" : "Joindre un PDF ou une image"}<input aria-label="Fichier PDF, JPEG ou PNG, 10 Mo maximum" type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={importFile} style={{ display: "block", width: "100%", marginTop: 8 }}/></label>
  </div>;
}
