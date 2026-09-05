import { useState } from "react";
import { calculateReadinessScore } from "./readinessScore.js";

export function ReadinessCard({ C, trips, preferredTripId, kanaProgress, scenarioProgress, pathProgress, onOpenTrip, onNavigate }) {
  const [selectedId, setSelectedId] = useState(preferredTripId || trips[0]?.id || "");
  const [expanded, setExpanded] = useState(false);
  const trip = trips.find(item => item.id === selectedId) || trips[0];
  const score = calculateReadinessScore({ trip, kanaProgress, scenarioProgress, pathProgress });
  const e = score.evidence;
  const openTrip = sub => onOpenTrip(trip?.id, sub);
  const domains = [
    { id: "voyage", title: "Mon itinéraire", detail: trip ? `${trip.dateDebut ? "Départ fixé" : "Date à choisir"} · ${trip.villes?.length || 0} villes · ${e.activities} activités` : "Choisis tes villes et construis ton premier séjour.", action: trip ? "Organiser mon voyage" : "Créer un voyage", run: () => openTrip("day") },
    { id: "japonais", title: "Japonais pratique", detail: `${e.masteredKana} kana maîtrisés (objectif 20) · ${e.completedScenarios} scénarios réussis (objectif 4)`, action: "Apprendre le japonais", run: () => onNavigate("learn") },
    { id: "codesSociaux", title: "Mises en situation", detail: `${Math.min(e.completedScenarios, 4)} / 4 scénarios réussis pour s’entraîner aux échanges du quotidien.`, action: "Pratiquer une situation", run: () => onNavigate("scenarios") },
    { id: "transports", title: "Mes transports", detail: e.transportItems ? `${e.completedTransport} / ${e.transportItems} préparatifs de transport cochés` : "Ajoute tes billets et transports à tes préparatifs.", action: "Préparer mes transports", run: () => openTrip("checklist") },
    { id: "preparatifs", title: "Avant le départ", detail: `${e.completedChecklist} / ${e.checklist} préparatifs cochés`, action: "Ouvrir mes préparatifs", run: () => openTrip("checklist") },
  ];
  const next = [...domains].sort((a, b) => score.categories[a.id] - score.categories[b.id])[0];
  const buttonStyle = { padding: "10px 12px", borderRadius: 11, border: `1px solid ${C.border}`, background: C.s2, color: C.text, fontSize: 12, cursor: "pointer" };
  return <section aria-label="Préparation au Japon" style={{ marginBottom: 12, padding: 15, background: C.s1, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: C.shadow }}>
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: 0, border: 0, background: "transparent", color: C.text, textAlign: "left", cursor: "pointer" }}>
      <span style={{ fontSize: 13, fontWeight: 650 }}>Prêt pour le Japon <span aria-hidden>{expanded ? "▴" : "▾"}</span></span>
      <strong style={{ fontSize: 18, color: C.red }}>{score.global}%</strong>
    </button>
    <div role="progressbar" aria-label="Préparation globale" aria-valuenow={score.global} aria-valuemin={0} aria-valuemax={100} style={{ height: 6, background: C.s2, borderRadius: 99, overflow: "hidden", marginTop: 10 }}><div style={{ height: "100%", width: `${score.global}%`, background: C.red }} /></div>
    <p style={{ color: C.t3, fontSize: 11, margin: "9px 0" }}>{trip?.titre || "Ton premier voyage"} · {expanded ? "Chaque domaine compte autant dans le score." : "Voir le détail et les prochaines étapes."}</p>
    {score.global < 100 && !expanded && <button type="button" onClick={next.run} style={{ ...buttonStyle, width: "100%" }}>{next.action} →</button>}
    {expanded && <>
      {trips.length > 1 && <label style={{ display: "block", fontSize: 11, color: C.t2 }}>Voyage à préparer<select value={trip?.id || ""} onChange={event => setSelectedId(event.target.value)} style={{ ...buttonStyle, display: "block", width: "100%", marginTop: 6 }}>{trips.map(item => <option key={item.id} value={item.id}>{item.titre}</option>)}</select></label>}
      {domains.map(domain => <div key={domain.id} style={{ padding: "13px 0", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, color: C.text, fontSize: 12, fontWeight: 650 }}><span>{domain.title}</span><span>{score.categories[domain.id]}%</span></div>
        <p style={{ color: C.t2, fontSize: 11, lineHeight: 1.5, margin: "6px 0 9px" }}>{domain.detail}</p>
        <button type="button" onClick={domain.run} style={buttonStyle}>{domain.action} →</button>
      </div>)}
      <p style={{ fontSize: 10, color: C.t3, lineHeight: 1.5, marginBottom: 0 }}>Ce repère suit ton itinéraire, tes apprentissages et les préparatifs que tu coches. Il évolue avec tes actions.</p>
    </>}
  </section>;
}
