import { useMemo } from "react";
import { buildDreamHome } from "./dreamHomeModel.js";

export function DreamHome({ C, user, db, currentDate, onNavigate, onOpenLieu, onOpenTradition, onOpenTrip }) {
  const model = useMemo(() => buildDreamHome({ user, db, currentDate }), [user, db, currentDate]);
  const card = { width: "100%", padding: 19, textAlign: "left", borderRadius: 18, border: `1px solid ${C.border}`, background: C.s1, color: C.text, boxShadow: C.shadow, cursor: "pointer" };
  const open = action => action.id === "inspiration" ? (model.place ? onOpenLieu(model.place) : onNavigate("explore")) : action.id === "new_trip" ? onOpenTrip(null) : onNavigate(action.tab);
  return <section aria-label="Ton Japon commence ici" style={{ padding: "0 20px 110px", marginTop: -24, position: "relative", display: "grid", gap: 14 }}>
    <button style={card} onClick={() => model.place ? onOpenLieu(model.place) : onNavigate("explore")}>
      <span style={{ color: C.red, fontSize: 11 }}>{model.personalized ? "SELON TES ENVIES" : "UNE ENVIE D’ÉVASION"}</span>
      <h2 style={{ fontFamily: "'Noto Serif JP',serif", fontSize: 23, margin: "10px 0" }}>{model.place?.nom || "Imagine ton Japon"}</h2>
      <p style={{ fontSize: 13, color: C.t2, lineHeight: 1.6 }}>{model.place?.description?.slice(0, 180) || "Un lieu, une histoire, une première envie : commence à explorer."}</p>
      <span style={{ color: C.red, fontSize: 12 }}>Découvrir ce lieu →</span>
    </button>
    <div aria-label="Actions recommandées" style={{ display: "grid", gap: 8 }}>
      {model.recommendations.filter(item => item.id !== "inspiration").map(item => <button key={item.id} onClick={() => open(item)} style={{ ...card, padding: 13, boxShadow: "none" }}><strong style={{ fontSize: 13 }}>{item.title}</strong><span style={{ display: "block", color: C.t3, fontSize: 11, marginTop: 3 }}>{item.text} →</span></button>)}
    </div>
  </section>;
}
