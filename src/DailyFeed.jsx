import React, { useEffect, useState } from "react";
import { fetchDailyFeed } from "./supabase";

/* ============================================================
   Le Japon du jour — feed quotidien
   - HomeDailyCard : carte teaser à poser sur l'accueil
   - DailyFeedScreen : écran feed complet (scroll, historique)
   Conventions respectées : objet thème C, prop isPremium (non utilisé
   ici car feed gratuit), style inline comme le reste de App.jsx.
   ============================================================ */

/* --- Helpers --- */

function formatDate(iso){
  if(!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return ""; }
}

function relativeDay(iso){
  if(!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.setHours(0,0,0,0) - new Date(iso).setHours(0,0,0,0)) / 86400000);
  if(diff <= 0) return "Aujourd'hui";
  if(diff === 1) return "Hier";
  if(diff < 7) return `Il y a ${diff} jours`;
  return formatDate(iso);
}

/* Pastille "Nouveau" — dernier item app_feed consulté, persisté en local
   (même clé "isekaid_seen_v1" que le reste de l'app, voir App.jsx pour le
   pendant "lieu du jour" utilisé par ResumeCard). */
const SEEN_KEY = "isekaid_seen_v1";
function loadSeen(){
  try { const raw = localStorage.getItem(SEEN_KEY); return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
}
function markFeedSeen(id){
  if(!id) return;
  try { localStorage.setItem(SEEN_KEY, JSON.stringify({ ...loadSeen(), feedId: id })); } catch {}
}

/* Petit hook de chargement partagé (exporté : réutilisé par HomeScreen
   pour le bloc "Reprendre où j'en étais" et le badge "Nouveau") */
export function useDailyFeed(limit){
  const [items, setItems] = useState(null);   // null = en cours, [] = vide
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchDailyFeed({ limit });
        if(alive) setItems(data);
      } catch {
        if(alive){ setItems([]); setError(true); }
      }
    })();
    return () => { alive = false; };
  }, [limit]);
  return { items, error };
}

/* ============================================================
   Carte teaser pour l'accueil
   Usage : <HomeDailyCard C={C} onOpen={()=>onGoTab("daily")} />
   ============================================================ */
export function HomeDailyCard({ C, onOpen }){
  const { items } = useDailyFeed(1);
  const latest = items && items[0];
  const isNew = !!latest && loadSeen().feedId !== latest.id;

  const surface = C.s1 || C.navBg || "#161f38";
  const border = C.border || "rgba(255,255,255,.12)";

  return (
    <div
      onClick={() => { if(latest) markFeedSeen(latest.id); onOpen && onOpen(); }}
      style={{
        cursor: "pointer",
        borderRadius: 18,
        overflow: "hidden",
        border: `1px solid ${border}`,
        background: surface,
        boxShadow: C.shadow || "none",
        position: "relative",
      }}
    >
      {latest?.image_url && (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: C.bg }}>
          <img
            src={latest.image_url}
            alt={latest.title || "Le Japon du jour"}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div style={{
            position: "absolute", top: 10, left: 10,
            background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)",
            color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: ".12em",
            padding: "5px 10px", borderRadius: 999,
          }}>
            🇯🇵 LE JAPON DU JOUR
          </div>
        </div>
      )}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 10, color: C.gold, letterSpacing: ".14em", marginBottom: 6, textTransform: "uppercase" }}>
          {latest ? relativeDay(latest.published_at || latest.created_at) : "Nouveau chaque matin"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, lineHeight: 1.25 }}>
            {latest ? latest.title : "Une découverte japonaise chaque jour"}
          </div>
          {isNew && <span aria-label="Nouveau" style={{ width: 7, height: 7, borderRadius: "50%", background: C.gold, flexShrink: 0 }}/>}
        </div>
        {latest?.subtitle && (
          <div style={{ fontSize: 13, color: C.t2 || C.t3, marginTop: 4 }}>{latest.subtitle}</div>
        )}
        <div style={{ fontSize: 12, color: C.gold, fontWeight: 600, marginTop: 10 }}>
          Voir le feed →
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Écran feed complet
   Usage : {tab==="daily" && <DailyFeedScreen C={C} />}
   ============================================================ */
export function DailyFeedScreen({ C, script, onBack }){
  const { items, error } = useDailyFeed(50);

  const surface = C.s1 || C.navBg || "#161f38";
  const border = C.border || "rgba(255,255,255,.12)";

  return (
    <div style={{ height: "100%", overflowY: "auto", background: C.bg }}>
    <div style={{ padding: "16px 14px 90px", maxWidth: 640, margin: "0 auto" }}>
      {onBack && (
        <button onClick={onBack} style={{ background: "transparent", border: "none", color: C.t2, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 14 }}>
          ‹ Accueil
        </button>
      )}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: C.gold, letterSpacing: ".16em", marginBottom: 4 }}>🇯🇵 CHAQUE MATIN</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: C.text, margin: 0 }}>Le Japon du jour</h1>
        <p style={{ fontSize: 13, color: C.t3, marginTop: 6 }}>
          Une découverte culturelle ou linguistique, fraîche chaque jour.
        </p>
      </div>

      {items === null && (
        <div style={{ textAlign: "center", padding: 40, color: C.t3, fontSize: 14 }}>
          Chargement du feed…
        </div>
      )}

      {items && items.length === 0 && (
        <div style={{
          textAlign: "center", padding: "40px 20px", color: C.t3, fontSize: 14,
          border: `1px dashed ${border}`, borderRadius: 16,
        }}>
          {error ? "Impossible de charger le feed pour le moment." : "Le premier contenu arrive demain matin. Reviens vite ! 🌅"}
        </div>
      )}

      {items && items.map((item) => (
        <FeedCard key={item.id} C={C} item={item} surface={surface} border={border} />
      ))}
    </div>
    </div>
  );
}

/* --- Carte individuelle du feed --- */
function FeedCard({ C, item, surface, border }){
  const [open, setOpen] = useState(false);
  const hasKanji = item.kanji && item.kanji.trim().length > 0;

  return (
    <div style={{
      borderRadius: 18, overflow: "hidden",
      border: `1px solid ${border}`, background: surface,
      marginBottom: 20,
    }}>
      {item.image_url && (
        <img
          src={item.image_url}
          alt={item.title}
          loading="lazy"
          onClick={() => setOpen(o => !o)}
          style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block", cursor: "pointer", background: C.bg }}
        />
      )}
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: C.gold, letterSpacing: ".12em", textTransform: "uppercase" }}>
            {item.theme || ""}
          </span>
          <span style={{ fontSize: 11, color: C.t3 }}>
            {relativeDay(item.published_at || item.created_at)}
          </span>
        </div>

        {hasKanji && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: C.gold }}>{item.kanji}</span>
            {item.romaji && <span style={{ fontSize: 14, fontStyle: "italic", color: C.t2 || C.t3 }}>{item.romaji}</span>}
          </div>
        )}

        <div style={{ fontSize: 17, fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{item.title}</div>
        {item.subtitle && <div style={{ fontSize: 13, color: C.t2 || C.t3, marginTop: 3 }}>{item.subtitle}</div>}

        {item.body && (
          <p style={{
            fontSize: 14, color: C.t2 || C.t3, lineHeight: 1.55, marginTop: 10, marginBottom: 0,
            ...(open ? {} : { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }),
          }}>
            {item.body}
          </p>
        )}

        {item.body && item.body.length > 140 && (
          <button
            onClick={() => setOpen(o => !o)}
            style={{ marginTop: 8, background: "transparent", border: "none", color: C.gold, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}
          >
            {open ? "Réduire" : "Lire la suite"}
          </button>
        )}
      </div>
    </div>
  );
}
