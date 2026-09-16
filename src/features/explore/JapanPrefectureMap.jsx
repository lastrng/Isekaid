const REGION_COLORS = {
  "Hokkaidō":"#5B7E9B","Tōhoku":"#6E8B74","Kantō":"#C9463D","Chūbu":"#9E7A1A",
  "Kansai":"#8B6FB0","Chūgoku":"#4F7C91","Shikoku":"#B87552","Kyūshū & Okinawa":"#3A6645",
};

// Coastlines simplified from Natural Earth (public domain). Each main island is
// fitted independently to the prefecture cartogram so the real silhouettes stay
// recognizable behind the deliberately schematic, non-geographic hit targets.
const JAPAN_COASTLINES = [
  "M301.3 30.8L312.2 33.9L320.3 27.4L317.3 34.9L317.5 38.3L319.9 44.2L321.8 44.6L324 42.8L326 42.8L322 46.3L320 46.2L314.8 49.1L305.9 49.6L303.1 51.1L296.4 58.7L294 65.5L277 56L271.5 56.6L266.3 59.9L262.9 56.4L260.1 56.4L258.2 60.7L260.7 63.4L263.2 63.6L268.4 68.7L266.5 69.8L262.3 68.6L258.9 73.4L255.3 74.8L254.1 72.5L255.5 67L252.2 61L252.5 56L259.5 49.9L260.2 48.3L259 44.2L260.2 43.6L264.3 45.8L268.2 46.2L271.1 44.6L271.4 38.6L274.4 32.4L275.9 24.8L276.1 21L273.7 13.8L274.7 9.8L278.1 8L289.7 21.8Z",
  "M307.3 64.4L312.5 63.8L311.2 69.2L311.9 75.9L312.7 77.8L320.4 83.5L324.9 92.3L324.6 98.8L322.9 104.4L317.2 106.8L314.6 110.6L312.8 116.9L304.4 118.1L301 121.4L300.2 125L302.8 133.5L302 139.8L301.2 141.8L295.6 146.5L292 155.4L293.1 158.4L299 164.4L293.5 165.5L289.3 168.2L288.4 172.5L286.9 174L280.1 176.5L276.8 179L275.1 178.7L274 178L275 177L274.7 172L280.9 166.8L278.4 165.4L274.8 165.6L273.3 168.4L270.6 170L272.7 172.7L271.1 174.6L266.5 171.9L261.2 172.3L258.6 174.5L257.5 180.1L251.7 183.9L249.9 182.5L250.9 177.7L253.2 176.8L248.9 175L245.6 175.7L236.6 184.4L221.6 183.2L210.4 184.6L215.8 182L209.7 181.4L208.1 180.1L207.7 182.1L206 181.9L205.6 177.6L206.6 176.6L204.4 176.3L201.8 177.5L198.1 182.9L206.2 187.2L205.6 189.2L193.4 191.8L183.8 202.7L178.7 204L173 202.8L165.5 194.8L164.8 189.8L169.7 187.5L172.2 184L163.5 183.7L156.5 181.4L145 182.3L138.5 185.6L126.4 187.2L119.4 189.6L108.1 190.6L102.6 188.7L100.1 189.2L98.3 190.9L96.2 197.8L86.8 194L75 195.8L71.2 194.5L67.7 195.3L67 190.3L69.7 188L77.8 187.6L98.8 176.8L109 169.8L114.3 168.2L122.3 167.4L124.8 169.1L138.8 168.2L166.6 164L168.7 164.4L167.9 166.7L170.1 167.9L178.3 168.3L183.5 166.5L188 163.6L185.9 159.7L187.3 157.4L202 146.4L203.2 142.7L202.5 138.3L205.3 135L216.5 132.5L216.8 134L206.7 139.7L208.9 141.3L209.4 144.7L214.7 146.2L216.9 145.9L220.9 142.6L239.7 137.9L246.9 133.4L252.8 126.8L263.9 122.3L267.6 115.2L274.1 108.5L276.7 102.3L279.5 99.1L280.2 95.3L278.6 91.2L272.7 90.1L276.6 88.3L278.9 84.1L276.9 79.2L277.9 76.7L285.2 73.7L286.7 70.9L286 68.1L287.7 66.9L293.3 67.5L294.5 72.8L296.1 74L300.4 72L304.7 73L307.2 71.2L307.6 67.3L306.6 66.6L297.3 68.5L297.3 66.5L300.5 62Z",
  "M140.7 179.4L144.4 180.7L148.3 180.3L148.2 186.4L149.8 190.2L149.3 192.8L151 193.7L141.2 200.7L137.6 206.3L136 212.7L130 206L127.1 204.6L121.1 204L111.8 208.9L108 218.1L104.5 221.3L103.5 226L100.6 228.9L94.4 228.7L96.2 224L90.5 223.6L90.4 220.6L88.7 218.9L90.9 211.1L88 209.9L88.3 206.6L78 209.6L94.5 198.1L98.3 188.1L102.3 184.7L103.8 184.9L107.7 190.2L109.3 190L119.8 187.3L121.5 183.4L120.4 179.8L123.1 180L129.7 176.3L133.1 176Z",
  "M62.5 182.8L69 183.9L76.5 181.2L80.3 182.8L80.8 186.2L74.9 193.8L87.2 194.4L85.5 199L89 201.3L87.6 203.8L91 205.6L90.8 206.8L81.6 216.5L79.1 220.7L72.3 240.1L72.2 247.2L68.1 256L58.9 255L57.7 256.9L59.9 261L53.2 265.8L45.8 269L49.3 260.5L46.4 250.3L49.6 248.7L48.9 246L44.7 245.6L41.4 250.8L40.8 256.1L44.4 260.6L42.5 263.6L29.2 259.8L27.4 255.9L32.4 254.5L33.4 249.5L28.8 243.9L29 233.2L33.3 231.4L35.8 228.9L44.2 215.6L39.4 214.3L41.8 211.8L41.1 208.5L37.4 204.5L35.4 199.8L30.5 197L26.7 199.4L28.3 202.5L28.3 207.8L33.5 207.8L34.7 211L34 212.8L30.7 213.6L27.5 211.3L24.2 210.5L14.4 217.2L16.4 212L11.8 207.1L11.4 200.9L14.8 203.4L16.5 206.5L22.1 207.8L18.8 202.2L8 195L9 191.5L10.7 190.7L17 192.2L16.4 188.3L24.8 185.5L28.1 183L34.8 181.8L38.9 175.1L46.8 172L54.9 173.9L58.5 180.5Z",
  "M30 262.1L17.4 269.1L13.9 269.6L15.5 273.7L13.2 274L10.8 276.3L11.3 279.9L8.3 281.9L5.1 282L5.2 278.3L8.2 274.4L8.3 269.9L12 268.8L17.1 264.2L14.9 262.9L15.6 260.7L21.3 262.5L23.4 261.6L28.3 257L29.8 254L33 256.5L32.1 259.7Z",
];

function statusColor(prefecture,C){
  if(prefecture.visited)return C.green;
  if(prefecture.favorite)return C.red;
  if(prefecture.discovered)return C.gold;
  return REGION_COLORS[prefecture.region]||C.t3;
}

export function JapanPrefectureMap({C,prefectures=[],selectedId,onSelect}){
  const points=prefectures.map(item=>({...item,x:14+item.mapX*20,y:15+item.mapY*19}));
  return <section aria-label="Carte interactive des 47 préfectures" style={{padding:12,borderRadius:20,border:`1px solid ${C.border}`,background:`linear-gradient(155deg,${C.s1},${C.s2})`,overflow:"hidden"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,padding:"2px 4px 9px"}}><div><strong style={{fontFamily:"'Noto Serif JP',serif",fontSize:15,color:C.text}}>Carte du Japon</strong><div style={{fontSize:9.5,color:C.t3,marginTop:2}}>Contours géographiques · sélectionne une préfecture</div></div><span aria-hidden style={{fontSize:22}}>🗾</span></div>
    <svg viewBox="0 0 330 290" width="100%" role="group" aria-label="47 préfectures sélectionnables" style={{display:"block",minHeight:250}}>
      <defs><linearGradient id="japan-land" x1="1" y1="0" x2="0" y2="1"><stop stopColor={C.t3} stopOpacity=".16"/><stop offset="1" stopColor={C.t3} stopOpacity=".06"/></linearGradient></defs>
      <g data-japan-coastline aria-hidden="true" pointerEvents="none" fill="url(#japan-land)" stroke={C.t3} strokeWidth="1.15" strokeLinejoin="round" opacity=".72">
        {JAPAN_COASTLINES.map((path,index)=><path key={index} d={path}/>) }
        <circle cx="42" cy="243" r="2.5"/><circle cx="35" cy="249" r="1.8"/><circle cx="27" cy="253" r="1.4"/>
      </g>
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
