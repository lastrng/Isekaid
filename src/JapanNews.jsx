import { useEffect, useState } from "react";
import { Browser } from "@capacitor/browser";

/* ============================================================
   Actu Japon — vraie actualité, directement en français via le
   flux NHK World "Radio Japan" édition française (le diffuseur
   public international japonais opère un vrai service en
   français, pas juste l'anglais). Endpoint JSON public, sans
   clé, CORS ouvert (access-control-allow-origin: *) — vérifié
   avant intégration. Pas de traduction automatique nécessaire :
   le contenu est nativement rédigé en français par NHK. Pas de
   backend à nous : lecture directe côté client, mise en cache
   locale courte pour éviter un fetch à chaque montage de
   HomeScreen.
   ============================================================ */

const NHK_NEWS_URL = "https://www3.nhk.or.jp/nhkworld/data/fr/news/all.json";
const NHK_BASE = "https://www3.nhk.or.jp";
const CACHE_KEY = "isekaid_japan_news_v2"; // v2 : flux passé de l'anglais au français
const CACHE_TTL = 30 * 60 * 1000; // 30 min — actu, pas besoin de plus frais

function readCache(){
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if(!raw) return null;
    const { items, ts } = JSON.parse(raw);
    if(!items || Date.now() - ts > CACHE_TTL) return null;
    return items;
  } catch { return null; }
}
function writeCache(items){
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ items, ts: Date.now() })); } catch {}
}

function relativeNews(ms){
  if(!ms) return "";
  const diffH = Math.floor((Date.now() - Number(ms)) / 3600000);
  if(diffH < 1) return "À l'instant";
  if(diffH < 24) return `Il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  return `Il y a ${diffD} j`;
}

export function useJapanNews(limit = 3){
  const [items, setItems] = useState(() => readCache());
  const [error, setError] = useState(false);
  useEffect(() => {
    if(items) return; // cache encore valide
    let alive = true;
    (async () => {
      try {
        const res = await fetch(NHK_NEWS_URL);
        if(!res.ok) throw new Error("bad status");
        const json = await res.json();
        const news = (json.data || []).slice(0, limit).map(n => ({
          id: n.id,
          title: n.title,
          description: n.description,
          url: NHK_BASE + n.page_url,
          image: n.thumbnails?.middle ? NHK_BASE + n.thumbnails.middle : null,
          updatedAt: Number(n.updated_at) || null,
        }));
        if(alive){ setItems(news); writeCache(news); }
      } catch {
        if(alive){ setItems([]); setError(true); }
      }
    })();
    return () => { alive = false; };
  }, [limit]);
  return { items, error };
}

/* Carte teaser — un seul titre, dans le même vocabulaire visuel que
   HomeDailyCard / DiscoveryTeaserCard (image + badge overlay, ou badge
   texte si pas d'image). Ouvre l'article dans le navigateur in-app. */
export function JapanNewsCard({ C }){
  const { items } = useJapanNews(1);
  const latest = items && items[0];
  if(!latest) return null;

  const surface = C.s1 || "#161f38";
  const border = C.border || "rgba(255,255,255,.12)";

  return (
    <div
      onClick={() => Browser.open({ url: latest.url })}
      className="lift"
      style={{cursor:"pointer",borderRadius:18,overflow:"hidden",border:`1px solid ${border}`,background:surface,boxShadow:C.shadow||"none",position:"relative"}}
    >
      {latest.image && (
        <div style={{position:"relative",width:"100%",aspectRatio:"16 / 9",background:C.bg}}>
          <img src={latest.image} alt={latest.title} loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
          <div style={{position:"absolute",top:10,left:10,background:"rgba(0,0,0,.55)",backdropFilter:"blur(4px)",color:"#fff",fontSize:10,fontWeight:700,letterSpacing:".12em",padding:"5px 10px",borderRadius:999}}>
            🗞️ ACTU JAPON
          </div>
        </div>
      )}
      <div style={{padding:"14px 16px"}}>
        {!latest.image && (
          <div style={{fontSize:10,color:C.gold,letterSpacing:".14em",marginBottom:6,textTransform:"uppercase"}}>🗞️ Actu Japon</div>
        )}
        <div style={{fontSize:16,fontWeight:800,color:C.text,lineHeight:1.25}}>{latest.title}</div>
        {latest.description && (
          <div style={{fontSize:13,color:C.t2||C.t3,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{latest.description}</div>
        )}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
          <span style={{fontSize:12,color:C.gold,fontWeight:600}}>Lire sur NHK World →</span>
          <span style={{fontSize:11,color:C.t3}}>{relativeNews(latest.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}
