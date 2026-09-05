import { useMemo } from "react";
import { buildJapanGraph, relatedToActivity } from "../../entities/content/japanGraph.js";
import { SpeakButton } from "../../tts.jsx";

export function ActivityContext({ C, db, place, onTutor }) {
  const graph = useMemo(() => buildJapanGraph(db), [db]);
  const items = useMemo(() => relatedToActivity(place, graph), [place, graph]);
  if (!items.length) return null;
  return <section style={{ marginBottom: 16, padding: 14, borderRadius: 16, border: `1px solid ${C.border}`, background: C.s1 }}>
    <h3 style={{ margin: "0 0 8px", fontSize: 13, color: C.text }}>Avant {place.nom}</h3>
    {items.map((item,index) => <details key={item.id} open={index === 0} style={{ padding: "10px 0", borderTop: `1px solid ${C.border}`, color: C.text }}>
      <summary style={{ fontSize: 12, cursor: "pointer" }}>{item.raw.emoji || "💡"} {item.title} <span style={{ color: C.t3, fontSize: 10 }}>· {item.reason}</span></summary>
      <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>{item.summary}</p>
      {(item.raw.phrases || (item.kind === "phrase" ? [{jp:item.raw.expression,romaji:item.raw.romaji,fr:item.raw.traduction}] : [])).slice(0,3).map(phrase => <div key={phrase.jp} style={{ padding: "8px 0", fontSize: 12 }}><div>{phrase.jp} <SpeakButton C={C} text={phrase.jp} size={28}/></div><div style={{ color:C.t3 }}>{phrase.romaji}</div><div>{phrase.fr}</div></div>)}
      {(item.raw.a_faire || item.raw.infos_pratiques || []).slice(0,3).map(text => <p key={text} style={{ color:C.t2,fontSize:11 }}>• {text}</p>)}
    </details>)}
    {onTutor && <button onClick={onTutor} style={{ padding:10,borderRadius:10,border:`1px solid ${C.border}`,background:C.s2,color:C.text }}>M’entraîner avec le tuteur →</button>}
  </section>;
}
