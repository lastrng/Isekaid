import { primaryDestination } from "./destinations.js";
import { Compass, Heart, Home, Plane } from "lucide-react";

const TABS = [
  {id:"home",label:"Aujourd’hui",icon:Home},
  {id:"voyage",label:"Voyager",icon:Plane},
  {id:"explore",label:"Découvrir",icon:Compass},
  {id:"profile",label:"Mon Japon",icon:Heart},
];

export function BottomNav({C,active,onChange,pulseTab,onPulseEnd}) {
  return <nav aria-label="Navigation principale" style={{position:"absolute",bottom:0,left:0,right:0,height:72,display:"flex",background:C.navBg,backdropFilter:"blur(18px)",borderTop:`1px solid ${C.border}`,zIndex:100}}>
    {TABS.map(tab=>{
      const selected=tab.id===primaryDestination(active);
      const pulsing=tab.id===pulseTab;
      const Icon=tab.icon;
      return <button type="button" aria-current={selected?"page":undefined} key={tab.id} onClick={()=>onChange(tab.id)} onAnimationEnd={pulsing?onPulseEnd:undefined} style={{flex:1,border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,color:selected?C.red:C.t3,transition:"color .2s",position:"relative",borderRadius:16,animation:pulsing?"ring 1s ease-out 2":"none"}}>
        <Icon size={22} strokeWidth={selected?2.5:2}/><span style={{fontSize:9,letterSpacing:".04em"}}>{tab.label}</span>{selected&&<span aria-hidden="true" style={{position:"absolute",bottom:8,width:4,height:4,borderRadius:"50%",background:C.red}}/>}
      </button>;
    })}
  </nav>;
}

export { TABS as PRIMARY_TABS };
