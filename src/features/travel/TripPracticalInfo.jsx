import { ArrowLeft, Clock3, MapPin, TrainFront, WifiOff } from "lucide-react";
import { itineraryCityIds, itineraryPlaceIds, relatedGuides } from "./tripPracticalModel.js";

export function TripPracticalInfo({ C, trip, db, onBack }) {
  const placeMap = new Map([...(db?.lieux || []), ...(trip?.customLieux || [])].map(place => [place.id, place]));
  const places = itineraryPlaceIds(trip).map(id => placeMap.get(id)).filter(Boolean);
  const cityMap = new Map((db?.villes || []).map(city => [city.id, city]));
  const cities = itineraryCityIds(trip, places).map(id => cityMap.get(id)).filter(Boolean);
  const guides = relatedGuides(db, places);

  return <div style={{height:"100%",overflowY:"auto",background:C.bg,color:C.text,fontFamily:"'Inter','Noto Sans JP',sans-serif"}}>
    <header style={{position:"sticky",top:0,zIndex:10,padding:"calc(18px + env(safe-area-inset-top, 0px)) 20px 14px",borderBottom:`1px solid ${C.border}`,background:`${C.bg}ee`,backdropFilter:"blur(12px)"}}>
      <button type="button" onClick={onBack} style={{minHeight:40,display:"inline-flex",alignItems:"center",gap:6,padding:"6px 4px",border:0,background:"transparent",color:C.t2,cursor:"pointer",fontSize:12}}><ArrowLeft size={16}/> Mon voyage</button>
      <div style={{fontFamily:"'Noto Serif JP',serif",fontSize:21,fontWeight:650}}>Infos pratiques</div>
      <div style={{fontSize:11,color:C.t3,marginTop:3}}>{trip?.titre || "Mon voyage au Japon"}{cities.length ? ` · ${cities.map(city => city.nom).join(" & ")}` : ""}</div>
    </header>

    <main style={{padding:"18px 20px calc(105px + env(safe-area-inset-bottom, 0px))",display:"grid",gap:20}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:13,background:`${C.green}0d`,border:`1px solid ${C.green}30`,fontSize:10.5,color:C.t2}}><WifiOff size={15} color={C.green}/><span>Ces repères viennent de ton itinéraire et restent lisibles hors ligne.</span></div>

      {places.length > 0 && <section>
        <div className="isekaid-eyebrow" style={{marginBottom:9}}>SUR TON ITINÉRAIRE</div>
        <div style={{display:"grid",gap:9}}>{places.map(place => <article key={place.id} className="isekaid-card isekaid-card--paper" style={{padding:14}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}><span aria-hidden style={{fontSize:20}}>{place.emoji || "📍"}</span><div style={{minWidth:0,flex:1}}><strong style={{display:"block",fontFamily:"'Noto Serif JP',serif",fontSize:13.5}}>{place.nom}</strong>{place.acces&&<p style={{display:"flex",gap:6,margin:"7px 0 0",fontSize:10.5,color:C.t2,lineHeight:1.45}}><MapPin size={13} style={{flexShrink:0,marginTop:1}}/>{place.acces}</p>}{place.horaires&&<p style={{display:"flex",gap:6,margin:"6px 0 0",fontSize:10.5,color:C.t2,lineHeight:1.45}}><Clock3 size={13} style={{flexShrink:0,marginTop:1}}/>{place.horaires}</p>}{place.conseil&&<p style={{margin:"8px 0 0",paddingTop:8,borderTop:`1px solid ${C.border}`,fontSize:10.5,color:C.t3,lineHeight:1.5}}>{place.conseil}</p>}</div></div>
        </article>)}</div>
      </section>}

      <section>
        <div className="isekaid-eyebrow" style={{marginBottom:9}}>REPÈRES UTILES POUR CE VOYAGE</div>
        <div style={{display:"grid",gap:9}}>{guides.map(guide => <details key={guide.id} className="isekaid-card isekaid-card--quiet" style={{padding:"12px 14px"}}>
          <summary style={{minHeight:36,display:"flex",alignItems:"center",gap:9,cursor:"pointer",listStyle:"none"}}><TrainFront size={16} color={C.red}/><strong style={{fontSize:12}}>{guide.titre}</strong></summary>
          <p style={{margin:"7px 0 0",fontSize:10.5,color:C.t2,lineHeight:1.55}}>{guide.resume || guide.description}</p>
          {(guide.infos_pratiques || []).slice(0,3).map(info => <p key={info} style={{margin:"7px 0 0",fontSize:10.5,color:C.t2,lineHeight:1.5}}>• {info}</p>)}
        </details>)}</div>
      </section>

      {!places.length && <section className="isekaid-card isekaid-card--quiet" style={{padding:17}}><strong style={{fontFamily:"'Noto Serif JP',serif",fontSize:15}}>Ajoute des lieux à ton itinéraire</strong><p style={{margin:"6px 0 0",fontSize:11,color:C.t2,lineHeight:1.55}}>Leurs accès, horaires et conseils apparaîtront ici automatiquement.</p></section>}
    </main>
  </div>;
}
