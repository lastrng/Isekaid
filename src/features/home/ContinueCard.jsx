export function ContinueCard({ C, item, onOpen }) {
  if (!item) return null;
  return <section aria-label="Continuer une activité" style={{ padding:"0 20px", marginTop:18, position:"relative", zIndex:2 }}>
    <div style={{fontSize:10,fontWeight:700,letterSpacing:".13em",color:C.t3,margin:"0 2px 8px"}}>CONTINUER</div>
    <button className="lift" onClick={() => onOpen?.(item)} style={{width:"100%",minHeight:72,padding:"12px 14px",borderRadius:18,border:`1px solid ${C.border}`,background:C.s1,color:C.text,boxShadow:"none",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:12}}>
      <span aria-hidden="true" style={{width:40,height:40,borderRadius:13,background:`${C.indigo}13`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{item.emoji}</span>
      <span style={{flex:1,minWidth:0}}>
        <span style={{display:"block",fontSize:9,color:C.indigo,fontWeight:700,letterSpacing:".11em",textTransform:"uppercase",marginBottom:3}}>{item.eyebrow}</span>
        <strong style={{display:"block",fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</strong>
        {item.subtitle && <span style={{display:"block",fontSize:11,color:C.t3,marginTop:3,lineHeight:1.35,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.subtitle}</span>}
      </span>
      <span aria-hidden="true" style={{fontSize:19,color:C.t3,flexShrink:0}}>›</span>
    </button>
  </section>;
}
