import { useMemo } from "react";
import { buildDreamHome } from "./dreamHomeModel.js";

export function DreamHome({ C, user, db, currentDate, onNavigate, onOpenLieu, onOpenTradition, onOpenTrip }) {
  const model = useMemo(() => buildDreamHome({ user, db, currentDate }), [user, db, currentDate]);
  const card = { width: "100%", padding: 19, textAlign: "left", borderRadius: 18, border: `1px solid ${C.border}`, background: C.s1, color: C.text, boxShadow: C.shadow, cursor: "pointer" };
  return <section aria-label="Ton Japon commence ici" style={{ padding: "0 20px 110px", marginTop: -24, position: "relative", display: "grid", gap: 14 }}>
    <button style={card} onClick={() => model.place ? onOpenLieu(model.place) : onNavigate("explore")}>
      <span style={{ color: C.red, fontSize: 11 }}>{model.personalized ? "SELON TES ENVIES" : "UNE ENVIE D’ÉVASION"}</span>
      <h2 style={{ fontFamily: "'Noto Serif JP',serif", fontSize: 23, margin: "10px 0" }}>{model.place?.nom || "Imagine ton Japon"}</h2>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>{model.place?.description?.slice(0, 180) || "Un lieu, une histoire, une première envie : commence à explorer."}</p>
      <span style={{ color: C.red, fontSize: 12 }}>Découvrir ce lieu →</span>
    </button>
    <button style={card} onClick={() => onNavigate("learn")}><strong>Quelques mots pour te rapprocher du Japon</strong><p style={{ color: C.t2, fontSize: 12 }}>Commence ou reprends les kana et les expressions à ton rythme. →</p></button>
    <button style={card} onClick={() => model.tradition ? onOpenTradition(model.tradition) : onNavigate("explore")}><strong>{model.tradition?.nom || "Une culture à découvrir"}</strong><p style={{ color: C.t2, fontSize: 12 }}>{model.tradition?.tagline || "Découvre les traditions et la vie quotidienne au Japon."} →</p></button>
    <button style={{ ...card, background: C.s2 }} onClick={() => onOpenTrip(null)}><strong>Donne forme à ton envie</strong><p style={{ color: C.t2, fontSize: 12 }}>Commence un voyage, même sans date de départ. →</p></button>
  </section>;
}
