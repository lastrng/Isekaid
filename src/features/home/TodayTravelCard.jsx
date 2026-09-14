import { ArrowRight, CalendarDays, Check, MapPin } from "lucide-react";

export function TodayTravelCard({ C, model, onAction }) {
  if (!model) return null;
  const active = model.state === "active";
  const completed = model.state === "completed";
  return <section aria-labelledby="today-travel-title" className="today-travel" style={{padding:"0 20px 24px",marginTop:18,position:"relative",zIndex:2}}>
    <div style={{fontSize:10,fontWeight:750,letterSpacing:".14em",color:C.t3,margin:"0 2px 8px"}}>MON VOYAGE</div>
    <article style={{padding:"16px 16px 15px",borderRadius:20,border:`1px solid ${active?`${C.red}45`:C.border}`,background:active?`linear-gradient(145deg,${C.s1},${C.red}09)`:C.s1,boxShadow:active?C.shadow:"none"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
        <span aria-hidden="true" style={{width:38,height:38,borderRadius:13,display:"grid",placeItems:"center",flexShrink:0,background:completed?`${C.green}14`:`${C.red}11`,color:completed?C.green:C.red}}>{completed?<Check size={18}/>:active?<MapPin size={18}/>:<CalendarDays size={18}/>}</span>
        <div style={{minWidth:0,flex:1}}>
          {model.eyebrow!=="MON VOYAGE"&&<div style={{fontSize:9,fontWeight:800,letterSpacing:".12em",color:active?C.red:C.t3,marginBottom:4}}>{model.eyebrow}</div>}
          <h2 id="today-travel-title" style={{fontFamily:"'Noto Serif JP',serif",fontSize:18,lineHeight:1.25,fontWeight:650,color:C.text,margin:0}}>{model.title}</h2>
          {model.meta&&<div style={{fontSize:11,color:C.t3,marginTop:4,lineHeight:1.4}}>{model.meta}</div>}
        </div>
      </div>

      {model.next&&<div style={{marginTop:12,paddingTop:11,borderTop:`1px solid ${C.border}`}}>
        <div style={{fontSize:9,color:C.t3,textTransform:"uppercase",letterSpacing:".1em"}}>{model.next.label}</div>
        <div style={{fontSize:13,color:C.text,fontWeight:650,marginTop:3}}>{model.next.title}{model.next.detail&&<span style={{fontWeight:400,color:C.t3}}> · {model.next.detail}</span>}</div>
      </div>}
      {model.following&&<div style={{fontSize:11,color:C.t2,marginTop:8}}>Ensuite · {model.following}</div>}
      {model.description&&<p style={{fontSize:12,color:C.t2,lineHeight:1.5,margin:"10px 0 0"}}>{model.description}</p>}
      {model.recommendation&&<button type="button" onClick={()=>onAction?.(model.recommendation)} style={{display:"flex",alignItems:"center",gap:5,minHeight:44,padding:"8px 0 4px",border:0,background:"transparent",color:C.red,fontSize:11,fontWeight:700,textAlign:"left",cursor:"pointer"}}><span style={{color:C.t3,fontWeight:500}}>{model.recommendation.prefix} :</span> {model.recommendation.label} <ArrowRight size={13}/></button>}

      <button type="button" onClick={()=>onAction?.(model.primary)} style={{minHeight:44,marginTop:model.recommendation?2:12,padding:0,border:0,background:"transparent",color:C.red,fontSize:12,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>{model.primary.label}<ArrowRight size={14}/></button>
    </article>
  </section>;
}
