import { useMemo, useState } from "react";
import { Romaji } from "../../components/JapaneseDisplay.jsx";
import { buildActivityConnections, buildJapanGraph, getContextualContent, relatedToActivity } from "../../entities/content/japanGraph.js";
import { ContextualConnections } from "../shared/ContextualConnections.jsx";
import { SpeakButton } from "../../tts.jsx";

export function ActivityContext({ C, db, place, trips = [], onTutor, onOpenConnection }) {
  const graph = useMemo(() => buildJapanGraph(db, { trips }), [db, trips]);
  const [selected, setSelected] = useState("before");
  const connections=useMemo(()=>buildActivityConnections(place,graph),[place,graph]);
  const groups = useMemo(() => [
    { id: "before", title: "À savoir" },
    { id: "speak", title: "Phrases utiles" },
    { id: "explore", title: "Découvrir" },
  ].map(group => ({ ...group, items: group.id === "before" ? getContextualContent(place, graph, { limit: 4 }) : relatedToActivity(place, graph, { purpose: group.id, limit: 4 }) })).filter(group => group.items.length), [place, graph]);
  const active = groups.find(group => group.id === selected) || groups[0];
  if (!active) return null;
  const items = active.items;
  return <section style={{ marginBottom: 16, padding: 14, borderRadius: 16, border: `1px solid ${C.border}`, background: C.s1 }}>
    <h3 style={{ margin: "0 0 8px", fontSize: 13, color: C.text }}>Autour de {place.nom}</h3>
    <div style={{marginBottom:10}}><ContextualConnections C={C} title="Passer à l’action" connections={connections} onOpen={onOpenConnection} compact/></div>
    <div role="group" aria-label="Contenus liés à cette activité" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
      {groups.map(group => <button key={group.id} aria-pressed={active.id === group.id} onClick={() => setSelected(group.id)} style={{ padding: "10px 12px", borderRadius: 12, border: `1px solid ${C.border}`, background: active.id === group.id ? C.s2 : C.s1, color: C.text, fontWeight: active.id === group.id ? 700 : 400 }}>{group.title}</button>)}
    </div>
    {items.map((item,index) => <details key={`${place.id || place.nom}:${active.id}:${item.id}`} open={index === 0} style={{ padding: "10px 0", borderTop: `1px solid ${C.border}`, color: C.text }}>
      <summary style={{ fontSize: 12, cursor: "pointer" }}>{item.raw.emoji || "💡"} {item.title} <span style={{ color: C.t3, fontSize: 10 }}>· {item.reason}</span></summary>
      <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>{item.summary}</p>
      {(item.raw.phrases || item.raw.vocabulaire || (item.kind === "phrase" ? [{jp:item.raw.expression,romaji:item.raw.romaji,fr:item.raw.traduction}] : [])).slice(0,3).map(phrase => <div key={phrase.jp} style={{ padding: "8px 0", fontSize: 12 }}><div>{phrase.jp} <SpeakButton C={C} text={phrase.jp} size={28}/></div><Romaji style={{ color:C.t3 }}>{phrase.romaji}</Romaji><div>{phrase.fr}</div></div>)}
      {item.raw.explication && <p style={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>{item.raw.explication}</p>}
      {(item.raw.a_eviter || []).slice(0, 3).map(text => <p key={text} style={{ color: C.t2, fontSize: 12 }}>À éviter : {text}</p>)}
      {(item.raw.a_faire || item.raw.infos_pratiques || item.raw.comment_vivre || []).slice(0,3).map(text => <p key={text} style={{ color:C.t2,fontSize:11 }}>• {text}</p>)}
    </details>)}
    {onTutor && <button onClick={onTutor} style={{ padding:10,borderRadius:10,border:`1px solid ${C.border}`,background:C.s2,color:C.text }}>M’entraîner avec le tuteur →</button>}
  </section>;
}
