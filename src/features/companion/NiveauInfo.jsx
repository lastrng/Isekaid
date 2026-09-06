import { useState } from "react";

const LABELS = { "débutant": "Débutant", "faux-débutant": "Faux-débutant", "intermédiaire": "Intermédiaire" };
const CEFR = { "débutant": "A1", "faux-débutant": "A2", "intermédiaire": "B1" };

export function NiveauInfo({ C, niveau, style }) {
  const [open, setOpen] = useState(false);
  const label = LABELS[niveau] || niveau;
  const cefr = CEFR[niveau];
  return <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 5, ...style }}>
    {label}
    {cefr && <><button onClick={() => setOpen(value => !value)} aria-label="Équivalent CECRL" style={{ width: 15, height: 15, borderRadius: "50%", border: `1px solid ${C.t3}`, background: "transparent", color: C.t3, fontSize: 9, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>i</button>{open && <span onClick={() => setOpen(false)} style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: C.s1, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: C.t2, whiteSpace: "nowrap", zIndex: 20, boxShadow: C.shadow || "0 4px 12px rgba(0,0,0,0.15)", cursor: "pointer" }}>Équivalent CECRL : <b style={{ color: C.text }}>{cefr}</b></span>}</>}
  </span>;
}
