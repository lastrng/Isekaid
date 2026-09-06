import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Circle, Flame, Sparkles } from "lucide-react";
import { completeDailyActivity, dailyDateKey, dailyProgress, loadDailyRitual } from "./dailyModel.js";

const TYPE_COPY = {
  discover: "Découvrir",
  learn: "Apprendre",
  practice: "S’entraîner",
};

export function DailyRitual({ C, db, date, timeZone, travelContext, streak, onOpenActivity, onDailyComplete }) {
  const dateKey = dailyDateKey(date || new Date(), timeZone);
  const [ritual, setRitual] = useState(() => loadDailyRitual({ db, date: dateKey, travelContext }));
  useEffect(() => {
    if (db) setRitual(loadDailyRitual({ db, date: dateKey, travelContext }));
  }, [db, dateKey, travelContext]);
  useEffect(() => {
    const refresh = () => setRitual(loadDailyRitual({ db, date: dateKey, travelContext }));
    window.addEventListener("isekaid:daily-synced", refresh);
    return () => window.removeEventListener("isekaid:daily-synced", refresh);
  }, [db, dateKey, travelContext]);
  const progress = dailyProgress(ritual);
  const today = useMemo(() => new Date(`${dateKey}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }), [dateKey]);
  const complete = activity => {
    if (activity.done) return onOpenActivity?.(activity);
    const next = completeDailyActivity(ritual, activity.id);
    setRitual(next);
    onDailyComplete?.({ firstActivity: progress.done === 0, complete: dailyProgress(next).complete, ritual: next });
    onOpenActivity?.(activity);
  };
  const hero = ritual.activities[0];
  return (
    <section aria-label="Ton Japon aujourd’hui" style={{ padding: "22px 20px 0", position: "relative", zIndex: 2 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: C.red, fontWeight: 700 }}>今日の日本 · {today}</div>
          <h1 style={{ margin: "5px 0 0", fontFamily: "'Noto Serif JP',serif", fontSize: 25, fontWeight: 500, color: C.text }}>Ton Japon aujourd’hui</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: C.t2, fontSize: 12 }}><Flame size={15} color={C.gold}/>{streak?.count || 0} jours</div>
      </div>
      {hero && <button onClick={() => complete(hero)} className="lift" style={{ width: "100%", padding: 0, overflow: "hidden", textAlign: "left", border: `1px solid ${C.red}44`, borderRadius: 22, background: `linear-gradient(145deg, ${C.red}18, ${C.s1})`, color: C.text, cursor: "pointer", boxShadow: C.shadow }}>
        <div style={{ padding: "18px 18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.red, fontSize: 10, fontWeight: 700, letterSpacing: ".12em" }}><Sparkles size={13}/> {hero.label} · 3 MIN</div>
          <div style={{ fontFamily: "'Noto Serif JP',serif", fontSize: 20, lineHeight: 1.35, margin: "11px 0 7px" }}>{hero.title}</div>
          <div style={{ color: C.t2, fontSize: 13, lineHeight: 1.5 }}>{hero.summary}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 14, color: C.red, fontSize: 12, fontWeight: 700 }}>Découvrir <ArrowRight size={15}/></div>
        </div>
      </button>}
      <div style={{ marginTop: 18, padding: "15px 16px", borderRadius: 18, background: C.s1, border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div><div style={{ fontSize: 10, letterSpacing: ".14em", color: C.t3, fontWeight: 700 }}>TON RITUEL DU JOUR</div><div style={{ fontSize: 12, color: C.t2, marginTop: 3 }}>{progress.complete ? "Ton Japon du jour est terminé." : `${progress.done} / ${progress.total} terminé${progress.done > 1 ? "s" : ""}`}</div></div>
          <div style={{ fontSize: 14, color: C.red, fontWeight: 700 }}>{progress.percent}%</div>
        </div>
        <div style={{ height: 5, borderRadius: 9, background: C.s2, overflow: "hidden", marginBottom: 5 }}><div style={{ height: "100%", width: `${progress.percent}%`, background: C.red, borderRadius: 9, transition: "width .3s ease" }}/></div>
        {ritual.activities.map(activity => <button key={activity.id} onClick={() => complete(activity)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 0", border: 0, borderTop: `1px solid ${C.border}`, background: "transparent", color: C.text, textAlign: "left", cursor: "pointer" }}>
          {activity.done ? <Check size={17} color={C.green}/> : <Circle size={17} color={C.s3}/>}<span style={{ flex: 1, fontSize: 13, textDecoration: activity.done ? "line-through" : "none", color: activity.done ? C.t3 : C.text }}>{TYPE_COPY[activity.kind] || activity.kind}</span><span style={{ fontSize: 11, color: C.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "52%" }}>{activity.title}</span>
        </button>)}
      </div>
    </section>
  );
}
