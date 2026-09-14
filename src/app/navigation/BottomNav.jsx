import { PRIMARY_NAV_ITEMS, primaryDestination } from "./destinations.js";
import { BookOpen, Compass, Heart, Plane, Sun } from "lucide-react";
import { productTheme } from "../../features/shared/ProductUI.jsx";

const ICONS = Object.freeze({home:Sun,voyage:Plane,learn:BookOpen,explore:Compass,profile:Heart});
const TABS = Object.freeze(PRIMARY_NAV_ITEMS.map(item=>Object.freeze({...item,icon:ICONS[item.id]})));

export function BottomNav({C,active,onChange,pulseTab,onPulseEnd}) {
  return <nav aria-label="Navigation principale" className="isekaid-bottom-nav" style={productTheme(C,{position:"absolute",bottom:0,left:0,right:0,height:"var(--isekaid-route-height)",paddingBottom:"env(safe-area-inset-bottom, 0px)",display:"flex",backdropFilter:"blur(18px)",borderTop:`1px solid ${C.border}`,zIndex:100})}>
    {TABS.map(tab=>{
      const selected=tab.id===primaryDestination(active);
      const pulsing=tab.id===pulseTab;
      const Icon=tab.icon;
      return <button type="button" aria-current={selected?"page":undefined} aria-label={`${tab.label} — ${tab.promise}`} title={tab.promise} key={tab.id} onClick={()=>onChange(tab.id)} onAnimationEnd={pulsing?onPulseEnd:undefined} style={{flex:1,minWidth:0,border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,color:selected?C.red:C.t3,transition:"color .2s",position:"relative",borderRadius:16,animation:pulsing?"ring 1s ease-out 2":"none"}}>
        <span className="isekaid-bottom-nav__icon"><Icon size={20} strokeWidth={selected?2.5:2}/></span><span style={{fontSize:9.5,letterSpacing:".01em",fontWeight:selected?700:500,whiteSpace:"nowrap"}}>{tab.label}</span>
      </button>;
    })}
  </nav>;
}

export { TABS as PRIMARY_TABS };
