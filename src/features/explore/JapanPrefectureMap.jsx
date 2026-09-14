const REGION_COLORS = {
  "Hokkaidō":"#5B7E9B","Tōhoku":"#6E8B74","Kantō":"#C9463D","Chūbu":"#9E7A1A",
  "Kansai":"#8B6FB0","Chūgoku":"#4F7C91","Shikoku":"#B87552","Kyūshū & Okinawa":"#3A6645",
};

function statusColor(prefecture,C){
  if(prefecture.visited)return C.green;
  if(prefecture.favorite)return C.red;
  if(prefecture.discovered)return C.gold;
  return REGION_COLORS[prefecture.region]||C.t3;
}

export function JapanPrefectureMap({C,prefectures=[],selectedId,onSelect}){
  const points=prefectures.map(item=>({...item,x:14+item.mapX*20,y:15+item.mapY*19}));
  return <section aria-label="Carte interactive des 47 préfectures" style={{padding:12,borderRadius:20,border:`1px solid ${C.border}`,background:`linear-gradient(155deg,${C.s1},${C.s2})`,overflow:"hidden"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,padding:"2px 4px 9px"}}><div><strong style={{fontFamily:"'Noto Serif JP',serif",fontSize:15,color:C.text}}>Carte du Japon</strong><div style={{fontSize:9.5,color:C.t3,marginTop:2}}>Carte schématique · sélectionne une préfecture</div></div><span aria-hidden style={{fontSize:22}}>🗾</span></div>
    <svg viewBox="0 0 330 290" width="100%" role="group" aria-label="47 préfectures sélectionnables" style={{display:"block",minHeight:250}}>
      <path d="M296 34 C290 76 292 116 278 148 C260 188 210 174 183 190 C147 211 110 195 76 217 C49 235 42 253 21 272" fill="none" stroke={C.border} strokeWidth="10" strokeLinecap="round" opacity=".6"/>
      {points.map(item=>{
        const selected=item.id===selectedId;
        const color=statusColor(item,C);
        return <g key={item.id} role="button" tabIndex="0" aria-pressed={selected} aria-label={`${item.nameFr}, ${item.region}${item.visited?", visitée":item.favorite?", sauvegardée":item.discovered?", découverte":", jamais découverte"}`} onClick={()=>onSelect?.(item.id)} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onSelect?.(item.id);}}} style={{cursor:"pointer",outline:"none"}}>
          <rect x={item.x-8.5} y={item.y-8.5} width="17" height="17" rx="5" fill={selected?color:`${color}26`} stroke={color} strokeWidth={selected?2.5:1}/>
          {item.favorite&&<text x={item.x+5.5} y={item.y-5.5} fill={C.red} fontSize="7" fontWeight="800">♥</text>}
          {item.visited&&<circle cx={item.x} cy={item.y} r="3" fill="#fff"/>}
          <title>{item.number}. {item.nameFr}</title>
        </g>;
      })}
    </svg>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",padding:"7px 4px 2px",borderTop:`1px solid ${C.border}`}}>{[
      [C.t3,"Jamais découverte"],[C.gold,"Découverte"],[C.red,"Sauvegardée"],[C.green,"Visitée"],
    ].map(([color,label])=><span key={label} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:8.5,color:C.t3}}><i aria-hidden style={{width:7,height:7,borderRadius:2,background:color,display:"inline-block"}}/>{label}</span>)}</div>
  </section>;
}
