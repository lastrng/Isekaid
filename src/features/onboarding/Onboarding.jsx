import { useState } from "react";
import { BookOpen, Check, Coffee, Landmark, Plane, Sparkles, UtensilsCrossed } from "lucide-react";
import { JAPAN_RELATIONSHIP } from "../../entities/user/profileModel.js";

const WHY=[{id:"anime",label:"Anime & Manga",emoji:"⛩️",Icon:Sparkles},{id:"voyage",label:"Voyager au Japon",emoji:"✈️",Icon:Plane},{id:"culture",label:"Culture & Art",emoji:"🎋",Icon:Landmark},{id:"langue",label:"Apprendre le japonais",emoji:"🈶",Icon:BookOpen},{id:"lifestyle",label:"Lifestyle japonais",emoji:"🍵",Icon:Coffee},{id:"gastro",label:"Gastronomie",emoji:"🍣",Icon:UtensilsCrossed}];
const LEVELS=[{id:"beginner",label:"Débutant",sub:"Je découvre le Japon",emoji:"🌱"},{id:"intermediate",label:"Intermédiaire",sub:"Je connais les bases",emoji:"🌿"},{id:"advanced",label:"Avancé",sub:"Je maîtrise l’essentiel",emoji:"🎍"}];
const JAPAN_RELATIONSHIP_OPTIONS=[{id:JAPAN_RELATIONSHIP.DREAMING,label:"Je rêve d’y aller",sub:"Je cherche de l’inspiration",emoji:"✨"},{id:JAPAN_RELATIONSHIP.PLANNING,label:"Je prépare mon premier voyage",sub:"Je construis mon projet",emoji:"🗺️"},{id:JAPAN_RELATIONSHIP.SOON,label:"Je pars bientôt",sub:"Mon départ approche",emoji:"🧳"},{id:JAPAN_RELATIONSHIP.IN_JAPAN,label:"Je suis actuellement au Japon",sub:"J’ai besoin d’aide sur place",emoji:"🇯🇵"},{id:JAPAN_RELATIONSHIP.RETURNED,label:"J’en reviens",sub:"Je veux garder mes souvenirs",emoji:"📔"},{id:JAPAN_RELATIONSHIP.JAPAN_LOVER,label:"J’y suis déjà allé",sub:"Je veux rester connecté au Japon",emoji:"⛩️"}];
const LEGACY_GOAL_FOR_RELATIONSHIP={[JAPAN_RELATIONSHIP.PLANNING]:"travel",[JAPAN_RELATIONSHIP.SOON]:"travel",[JAPAN_RELATIONSHIP.IN_JAPAN]:"travel",[JAPAN_RELATIONSHIP.RETURNED]:"imm",[JAPAN_RELATIONSHIP.JAPAN_LOVER]:"imm",[JAPAN_RELATIONSHIP.DREAMING]:"imm"};

// ─── Onboarding ───────────────────────────────────────────────────────────────
const AVATAR_PLACEHOLDERS = ["🦊","🐼","🐯","🐰","🦉","🐣","🍡","🌸","⛩️","🗻","🍜","🎌"];

export function Onboarding({C,onComplete,googleInfo}){
  const [step,setStep]=useState(0);
  const [relationship,setRelationship]=useState("");
  const [why,setWhy]=useState([]);
  const [level,setLevel]=useState("");
  const [departureDate,setDepartureDate]=useState("");
  const [firstTrip,setFirstTrip]=useState(null);
  // Pré-remplit le nom depuis Google si dispo
  const [name,setName]=useState(googleInfo?.name || "");
  // Photo : soit la photo Google, soit un emoji placeholder choisi
  const [photo,setPhoto]=useState(googleInfo?.photo || null);
  const [emojiAvatar,setEmojiAvatar]=useState(googleInfo?.photo ? null : "🦊");
  const ok=[!!relationship,why.length>0,!!level,true][step];
  const toggle=id=>setWhy(w=>w.includes(id)?w.filter(x=>x!==id):[...w,id]);
  const chip=active=>({padding:"15px 12px",borderRadius:16,cursor:"pointer",background:active?`${C.red}0d`:C.s1,border:`2px solid ${active?C.red:C.s3}`,transition:"all .2s"});
  const titles=[{jp:"今のあなた",fr:"Où en es-tu avec le Japon ?"},{jp:"なぜ日本？",fr:"Qu’est-ce qui t’attire ?"},{jp:"日本語",fr:"Quel est ton niveau ?"},{jp:"あなたは？",fr:"Parle-moi de toi"}];
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:C.bg,fontFamily:"'Inter','Noto Sans JP',sans-serif"}}>
      <div style={{padding:"50px 26px 0",flexShrink:0}}>
        <div style={{display:"flex",gap:5,marginBottom:28}}>
          {[0,1,2,3].map(i=>(<div key={i} style={{height:2,flex:1,borderRadius:1,background:i<=step?C.red:"rgba(26,20,16,0.1)",transition:"background .4s"}}/>))}
        </div>
        <div key={step} style={{animation:"fadeUp .35s ease"}}>
          <div style={{fontSize:11,color:C.t3,letterSpacing:".28em",marginBottom:5}}>{step+1} / 4</div>
          <div style={{fontSize:26,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:4}}>{titles[step].jp}</div>
          <div style={{fontSize:14,color:C.t2}}>{titles[step].fr}</div>
        </div>
      </div>
      <div key={`b${step}`} style={{flex:1,overflowY:"auto",padding:"22px 26px",animation:"fadeUp .35s ease"}}>
        {step===0&&(<div style={{display:"flex",flexDirection:"column",gap:9}}>{JAPAN_RELATIONSHIP_OPTIONS.map(o=>{ const active=relationship===o.id; return(
          <div key={o.id} style={{...chip(active),display:"flex",alignItems:"center",gap:13,padding:"13px 15px"}} onClick={()=>setRelationship(o.id)}>
            <span style={{fontSize:25}}>{o.emoji}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:active?C.red:C.text}}>{o.label}</div><div style={{fontSize:11,color:C.t3,marginTop:2}}>{o.sub}</div></div>{active&&<Check size={19} color={C.red}/>}
          </div>
        );})}</div>)}
        {step===1&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{WHY.map(o=>{ const active=why.includes(o.id); return(
          <div key={o.id} style={{...chip(active),display:"flex",flexDirection:"column",alignItems:"center",gap:8}} onClick={()=>toggle(o.id)}>
            <o.Icon size={26} color={active?C.red:C.t3}/>
            <div style={{fontSize:12,fontWeight:500,color:active?C.red:C.t2,textAlign:"center",lineHeight:1.3}}>{o.label}</div>
          </div>
        );})}</div>)}
        {step===2&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>{LEVELS.map(o=>(<div key={o.id} style={{...chip(level===o.id),display:"flex",alignItems:"center",gap:14,padding:"16px"}} onClick={()=>setLevel(o.id)}><span style={{fontSize:28}}>{o.emoji}</span><div style={{flex:1}}><div style={{fontSize:14,color:level===o.id?C.text:C.t2,marginBottom:2}}>{o.label}</div><div style={{fontSize:11,color:C.t3}}>{o.sub}</div></div>{level===o.id&&<span style={{color:C.red}}>✓</span>}</div>))}</div>)}
        {step===3&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[JAPAN_RELATIONSHIP.PLANNING,JAPAN_RELATIONSHIP.SOON].includes(relationship)&&<div><div style={{fontSize:11,color:C.t3,marginBottom:8,letterSpacing:".12em"}}>Date de départ (facultatif)</div><input type="date" value={departureDate} onChange={e=>setDepartureDate(e.target.value)} style={{background:"rgba(26,20,16,0.04)",border:`1px solid ${C.border}`,color:C.text}}/><div style={{display:"flex",gap:8,marginTop:10}}>{[{v:true,l:"Premier voyage"},{v:false,l:"Déjà allé au Japon"}].map(x=><button type="button" key={String(x.v)} onClick={()=>setFirstTrip(x.v)} style={{flex:1,padding:10,borderRadius:12,border:`1px solid ${firstTrip===x.v?C.red:C.border}`,background:firstTrip===x.v?`${C.red}0d`:C.s1,color:firstTrip===x.v?C.red:C.t2}}>{x.l}</button>)}</div></div>}
            <div style={{marginTop:6}}>
              <div style={{fontSize:11,color:C.t3,marginBottom:8,letterSpacing:".12em"}}>Ta photo de profil</div>
              {/* Aperçu photo actuelle */}
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
                <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(201,70,61,0.09)",border:`2px solid rgba(201,70,61,0.25)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,overflow:"hidden",flexShrink:0}}>
                  {photo
                    ? <img src={photo} alt="" referrerPolicy="no-referrer" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    : emojiAvatar}
                </div>
                <div style={{fontSize:12,color:C.t2,flex:1}}>
                  {photo ? "Photo de ton compte Google" : "Choisis un avatar ci-dessous"}
                  {photo && <div onClick={()=>{setPhoto(null);setEmojiAvatar("🦊");}} style={{fontSize:11,color:C.red,cursor:"pointer",marginTop:3}}>Utiliser un avatar à la place</div>}
                </div>
              </div>
              {/* Grille d'emojis placeholder (si pas de photo Google) */}
              {!photo && (
                <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:16}}>
                  {AVATAR_PLACEHOLDERS.map(em=>(
                    <div key={em} onClick={()=>setEmojiAvatar(em)} style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,borderRadius:10,cursor:"pointer",background:emojiAvatar===em?"rgba(201,70,61,0.12)":"rgba(26,20,16,0.04)",border:`1px solid ${emojiAvatar===em?"rgba(201,70,61,0.35)":C.border}`}}>
                      {em}
                    </div>
                  ))}
                </div>
              )}
              <div style={{fontSize:11,color:C.t3,marginBottom:8,letterSpacing:".12em"}}>Ton prénom</div>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex : Léa" style={{background:"rgba(26,20,16,0.04)",border:`1px solid ${C.border}`,color:C.text}}/>
            </div>
          </div>
        )}
      </div>
      <div style={{padding:"14px 26px 34px",flexShrink:0}}>
        <button onClick={()=>step<3?setStep(s=>s+1):onComplete({japanRelationship:relationship,why,goal:LEGACY_GOAL_FOR_RELATIONSHIP[relationship]||"imm",level,name:name||"Voyageur",photo:photo||null,emojiAvatar:photo?null:emojiAvatar,plannedDeparture:departureDate||null,firstTrip})} disabled={!ok}
          style={{width:"100%",padding:"15px",background:ok?C.red:"rgba(26,20,16,0.08)",border:"none",borderRadius:999,color:ok?"#fff":C.t3,fontSize:15,cursor:ok?"pointer":"default",letterSpacing:".04em",transition:"all .2s"}}>
          {step<3?"Continuer →":"Commencer l'aventure 🌸"}
        </button>
      </div>
    </div>
  );
}
