import { useMemo, useState } from "react";
import { ArrowRight, Dices, Sparkles } from "lucide-react";
import { buildExploreEditorial, markEditorialSeen, pickEditorial } from "./exploreEditorial.js";

export function ExploreEditorialHero({ C, db, images = {}, date = new Date(), onOpen }) {
  const [surprise, setSurprise] = useState(null);
  const [detail, setDetail] = useState(null);
  const editorial = useMemo(() => buildExploreEditorial({ db, date }), [db, date]);
  const open = item => { if (!item) return; markEditorialSeen(item.id); setDetail(item); onOpen?.(item); };
  const surpriseMe = () => {
    const item = pickEditorial([...editorial.pools.culture, ...editorial.pools.food], date, `surprise-${Date.now()}`, { unseenOnly: true }) || editorial.featured;
    setSurprise(item);
    open(item);
  };
  const illustration = item => { const src = item && (item.raw?.image || item.raw?.photo || images[item.imageKey]); return src ? <img src={src} alt="" loading="lazy" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }}/> : <div aria-hidden style={{ height: 94, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, background: `linear-gradient(135deg, ${C.red}22, ${C.gold}22)` }}>{item?.raw?.emoji || (item?.type === "food" ? "🍜" : "🇯🇵")}</div>; };
  const card = item => item && <button onClick={() => open(item)} className="lift" style={{ width: "100%", textAlign: "left", border: `1px solid ${C.border}`, borderRadius: 18, padding: 0, overflow: "hidden", background: C.s1, color: C.text, cursor: "pointer" }}>{illustration(item)}<div style={{ padding: 16 }}><div style={{ fontSize: 10, color: C.gold, letterSpacing: ".14em", fontWeight: 700 }}>{item.label} · 3 MIN</div><div style={{ fontFamily: "'Noto Serif JP',serif", fontSize: 18, margin: "8px 0 5px", lineHeight: 1.35 }}>{item.title}</div><div style={{ color: C.t2, fontSize: 12, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.summary}</div><div style={{ display: "flex", alignItems: "center", gap: 5, color: C.red, fontSize: 12, fontWeight: 700, marginTop: 11 }}>Lire l’histoire <ArrowRight size={14}/></div></div></button>;
  return <section aria-label="À découvrir aujourd’hui" style={{ padding: "18px 20px 0" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 9 }}><div><div style={{ fontSize: 10, color: C.red, letterSpacing: ".15em", fontWeight: 700 }}>À DÉCOUVRIR AUJOURD’HUI</div><div style={{ fontFamily: "'Noto Serif JP',serif", fontSize: 22, color: C.text, marginTop: 4 }}>Une histoire à emporter</div></div><button onClick={surpriseMe} aria-label="Surprends-moi" style={{ display: "flex", alignItems: "center", gap: 5, border: `1px solid ${C.border}`, borderRadius: 999, padding: "7px 10px", background: C.s1, color: C.t2, fontSize: 11, cursor: "pointer" }}><Dices size={14}/> Surprends-moi</button></div>
    {card(surprise || editorial.featured)}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}><div><div style={{ fontSize: 10, color: C.t3, letterSpacing: ".12em", margin: "0 0 6px" }}>GASTRONOMIE</div>{card(editorial.gastronomy)}</div><div><div style={{ fontSize: 10, color: C.t3, letterSpacing: ".12em", margin: "0 0 6px" }}>JAPON CONTEMPORAIN</div>{card(editorial.contemporary)}</div></div>
    {detail && <div role="dialog" aria-label={detail.title} onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.58)", display: "flex", alignItems: "end" }}><div onClick={event => event.stopPropagation()} style={{ width: "100%", maxWidth: 640, maxHeight: "88dvh", overflowY: "auto", margin: "0 auto", padding: "25px 22px 35px", borderRadius: "24px 24px 0 0", background: C.s1, color: C.text }}>{illustration(detail)}<div style={{ color: C.gold, fontSize: 10, letterSpacing: ".14em", fontWeight: 700, marginTop: 16 }}>{detail.label}</div><div style={{ fontFamily: "'Noto Serif JP',serif", fontSize: 23, margin: "9px 0" }}>{detail.title}</div><div style={{ color: C.t2, fontSize: 14, lineHeight: 1.75, whiteSpace: "pre-line" }}>{detail.body || detail.raw?.contenu || detail.raw?.description || detail.raw?.fun_fact || detail.summary}</div><button onClick={() => setDetail(null)} style={{ width: "100%", marginTop: 18, padding: 12, border: 0, borderRadius: 999, background: C.red, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Fermer</button></div></div>}
  </section>;
}
