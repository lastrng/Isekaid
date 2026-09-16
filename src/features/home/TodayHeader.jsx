import { useEffect, useState } from "react";
import { Compass, Crown, Flame, Search, WifiOff } from "lucide-react";
import { Romaji } from "../../components/JapaneseDisplay.jsx";

function useOnlineStatus() {
  const [online, setOnline] = useState(() => globalThis.navigator?.onLine !== false);
  useEffect(() => {
    const update = () => setOnline(globalThis.navigator?.onLine !== false);
    globalThis.window?.addEventListener("online", update);
    globalThis.window?.addEventListener("offline", update);
    return () => {
      globalThis.window?.removeEventListener("online", update);
      globalThis.window?.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function TodayHeader({ C, user, greeting, streak, progress, isPremium, onSearch, onProfile, animate = false }) {
  const online = useOnlineStatus();
  const done = progress?.done || 0;
  const total = progress?.total || 4;
  return <header style={{background:`linear-gradient(180deg, ${C.red} 0%, #8A2A2A 100%)`,padding:"calc(11px + env(safe-area-inset-top, 0px)) 18px 17px",borderRadius:"0 0 24px 24px",color:"#FDFBF7"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,...(animate?{animation:"fadeUp var(--dur-cinematic,.45s) var(--ease-smooth,ease) both"}:{})}}>
      <div style={{minWidth:0}}>
        <div style={{fontSize:11,color:"rgba(253,251,247,.72)",marginBottom:2}}>今日も、少しずつ</div>
        <Romaji style={{fontSize:11,color:"rgba(253,251,247,.85)",marginBottom:4}}>Kyō mo, sukoshi zutsu</Romaji>
        <div style={{fontFamily:"'Noto Serif JP',serif",fontSize:19,fontWeight:650,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{greeting || (user?.name && user.name !== "Voyageur" ? `Bonjour, ${user.name}` : "Bonjour")}</div>
      </div>
      <div style={{display:"flex",gap:7,flexShrink:0}}>
        <button type="button" onClick={onSearch} aria-label="Rechercher" style={headerButtonStyle}><Search size={18}/></button>
        <button type="button" onClick={onProfile} aria-label={isPremium?"Profil Premium":"Ouvrir Mon Japon"} style={headerButtonStyle}>{isPremium?<Crown size={17} color="#E7C969"/>:<Compass size={18}/>}</button>
      </div>
    </div>
    <div aria-live="polite" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginTop:13,paddingTop:11,borderTop:"1px solid rgba(253,251,247,.2)"}}>
      <div style={{display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:700}}><Flame size={17} color="#E7C969"/><span>{streak?.count || 0} jour{(streak?.count || 0)>1?"s":""}</span></div>
      <div style={{textAlign:"right"}}>
        <strong style={{fontSize:14}}>{done} / {total}</strong>
        <span style={{fontSize:10,color:"rgba(253,251,247,.72)",marginLeft:7}}>aujourd’hui</span>
      </div>
    </div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginTop:5}}>
      <div style={{fontSize:11,color:"rgba(253,251,247,.76)"}}>Ton rendez-vous avec le Japon</div>
      {!online&&<div role="status" style={{display:"flex",alignItems:"center",gap:4,fontSize:9,color:"rgba(253,251,247,.82)"}}><WifiOff size={11}/>Hors ligne</div>}
    </div>
  </header>;
}

const headerButtonStyle = {
  width:44,
  height:44,
  borderRadius:"50%",
  border:0,
  background:"rgba(253,251,247,.16)",
  color:"#FDFBF7",
  display:"grid",
  placeItems:"center",
  cursor:"pointer",
};
