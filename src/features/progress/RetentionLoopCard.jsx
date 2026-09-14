import { BookOpen, Check, Compass, Map, Stamp } from "lucide-react";

const PHASE_ICONS={discover:Compass,learn:BookOpen,mission:Check};

export function RetentionLoopCard({C,model,onAction}){
  if(!model)return null;
  const progressItems=[
    {id:"prefectures",label:"Préfectures",value:`${model.durable.prefectures.completed} / ${model.durable.prefectures.total}`,Icon:Map},
    {id:"learning",label:"Parcours japonais",value:`${model.durable.learning.completed} / ${model.durable.learning.total}`,Icon:BookOpen},
    {id:"passport",label:"Stamps",value:String(model.durable.passport.completed),Icon:Stamp},
  ];
  return <section aria-label="Le fil de ton Japon" style={{padding:"0 20px 14px"}}>
    <div style={{padding:17,borderRadius:20,background:C.s1,border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
        <div>
          <div style={{fontSize:10,color:C.red,fontWeight:750,letterSpacing:".13em"}}>TON FIL ISEKAID</div>
          <div style={{fontFamily:"'Noto Serif JP',serif",fontSize:18,color:C.text,marginTop:5}}>{model.travel.title}</div>
          <div style={{fontSize:11,color:C.t2,lineHeight:1.5,marginTop:3}}>{model.travel.message}</div>
        </div>
        <div aria-label={`${model.today.completed} rendez-vous du jour terminés sur ${model.today.total}`} style={{fontSize:11,fontWeight:750,color:model.today.complete?C.green:C.red,whiteSpace:"nowrap"}}>{model.today.completed}/{model.today.total}</div>
      </div>

      <div aria-label="Découverte, apprentissage et mission du jour" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginTop:14}}>
        {model.today.phases.map(phase=>{
          const Icon=PHASE_ICONS[phase.id]||Check;
          return <div key={phase.id} style={{padding:"9px 6px",borderRadius:13,background:phase.done?`${C.green}10`:C.s2,border:`1px solid ${phase.done?`${C.green}35`:C.border}`,textAlign:"center"}}>
            <Icon size={15} color={phase.done?C.green:C.t3}/>
            <div style={{fontSize:9,color:phase.done?C.green:C.t2,fontWeight:700,marginTop:4}}>{phase.label}</div>
          </div>;
        })}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:10}}>
        {progressItems.map(({id,label,value,Icon})=><div key={id} style={{minWidth:0,padding:"10px 8px",borderRadius:13,border:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:5,color:C.t3}}><Icon size={12}/><span style={{fontSize:9,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</span></div>
          <div style={{fontSize:14,fontWeight:800,color:C.text,marginTop:5}}>{value}</div>
        </div>)}
      </div>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginTop:13,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:11,fontWeight:750,color:C.text}}>{model.continuity.title}</div>
          <div style={{fontSize:10,color:C.t3,lineHeight:1.45,marginTop:2}}>{model.continuity.message}</div>
        </div>
        <button type="button" onClick={()=>onAction?.(model.nextAction)} style={{border:0,borderRadius:999,background:C.red,color:"#fff",padding:"10px 13px",fontSize:10,fontWeight:750,whiteSpace:"nowrap",cursor:"pointer"}}>{model.nextAction.label} →</button>
      </div>
    </div>
  </section>;
}
