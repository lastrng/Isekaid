import { ChevronRight } from "lucide-react";

const PILLAR_LABELS={explore:"Découvrir",learn:"Apprendre",travel:"Voyage","my-japan":"Mon Japon"};

export function ContextualConnections({C,title="Pour continuer",connections=[],onOpen,compact=false}){
  if(!connections.length)return null;
  return <section aria-label={title} style={{padding:compact?11:14,borderRadius:16,border:`1px solid ${C.border}`,background:C.s1}}>
    <div style={{fontSize:9,color:C.red,fontWeight:800,letterSpacing:".13em",textTransform:"uppercase",marginBottom:7}}>{title}</div>
    <div style={{display:"grid",gap:6}}>{connections.map(connection=>{
      const actionable=Boolean(connection.target&&onOpen);
      return <button key={connection.connectionId||connection.id} type="button" disabled={!actionable} onClick={()=>actionable&&onOpen(connection)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:compact?9:11,borderRadius:12,border:`1px solid ${C.border}`,background:C.s2,color:C.text,textAlign:"left",cursor:actionable?"pointer":"default",opacity:actionable?1:.82}}>
        <span style={{fontSize:20}}>{connection.emoji||"🔗"}</span>
        <span style={{flex:1,minWidth:0}}><strong style={{display:"block",fontSize:11.5,lineHeight:1.3}}>{connection.actionTitle||connection.title}</strong><small style={{display:"block",fontSize:9,color:C.t3,marginTop:2}}>{PILLAR_LABELS[connection.pillar]||"À découvrir"}{connection.reason?` · ${connection.reason}`:""}</small></span>
        {actionable&&<ChevronRight size={15} color={C.t3}/>}
      </button>;
    })}</div>
  </section>;
}
