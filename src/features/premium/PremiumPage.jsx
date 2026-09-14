import { useEffect, useState } from "react";
import { currentSeasonKey, SEASON_ACCENT } from "../../lib/seasons.js";
import { ALWAYS_FREE_PROMISES, PREMIUM_BENEFITS } from "./premiumAccess.js";

const PREMIUM_PLANS = [
  { id:"annual",  label:"Annuel",  price:"29,99 €", per:"/ an",  sub:"soit 2,50 €/mois", badge:"Le plus avantageux · -37%", highlight:true },
  { id:"monthly", label:"Mensuel", price:"3,99 €",  per:"/ mois", sub:"sans engagement", badge:null, highlight:false },
];
export function PremiumPage({C, isPremium, premium, onActivate, onClose, onRedeemCode, billingError, billingBusy, liveOfferings, onRestore}){
  const [sel, setSel] = useState("annual");
  const acc = SEASON_ACCENT[currentSeasonKey()];
  const [codeOpen,setCodeOpen] = useState(false);
  const [codeVal,setCodeVal] = useState("");
  const [codeError,setCodeError] = useState(false);
  const [codeBusy,setCodeBusy] = useState(false);
  // Utilise les prix live RevenueCat si dispos, sinon les prix par défaut codés en dur
  const prices = {
    monthly: liveOfferings?.monthly?.priceLabel || "3,99 €",
    annual:  liveOfferings?.annual?.priceLabel  || "29,99 €",
  };
  useEffect(()=>{ /* getProductDetails() remplacé par liveOfferings de RevenueCat */ },[]);
  // Vérification désormais serveur (voir redeemCode dans IsekaidApp) — plus
  // un simple test synchrone en local.
  const tryCode = async ()=>{
    if(!onRedeemCode || codeBusy) return;
    setCodeBusy(true);
    const ok = await onRedeemCode(codeVal);
    setCodeBusy(false);
    setCodeError(!ok);
  };

  if(isPremium){
    return(
      <div style={{position:"fixed",inset:0,zIndex:400,background:C.bg,overflowY:"auto",fontFamily:"'Inter','Noto Sans JP',sans-serif"}}>
        <div style={{padding:"calc(24px + env(safe-area-inset-top, 0px)) 22px calc(32px + env(safe-area-inset-bottom, 0px))",textAlign:"center"}}>
          <button aria-label="Fermer Premium" onClick={onClose} style={{position:"absolute",top:"calc(18px + env(safe-area-inset-top, 0px))",left:18,background:C.s1,border:`1px solid ${C.border}`,borderRadius:"50%",width:38,height:38,color:C.t2,fontSize:18,cursor:"pointer"}}>×</button>
          <div style={{fontSize:60,margin:"20px 0 16px"}}>🌸</div>
          <div style={{fontSize:13,color:C.gold,letterSpacing:".2em",textTransform:"uppercase",marginBottom:8}}>Membre Premium</div>
          <div style={{fontSize:24,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:12}}>Merci de ton soutien 🙏</div>
          <div style={{fontSize:14,color:C.t2,lineHeight:1.6,maxWidth:320,margin:"0 auto 30px"}}>
            Tu profites de tous les avantages Isekai'd Premium. {premium?.plan==="code" ? <>Accès débloqué via <b style={{color:C.text}}>code d'invitation</b> 🎟️</> : <>Ton abonnement <b style={{color:C.text}}>{premium?.plan==="annual"?"annuel":"mensuel"}</b> est actif.</>}
          </div>
          <div style={{maxWidth:360,margin:"0 auto"}}>
            {PREMIUM_BENEFITS.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,marginBottom:10,textAlign:"left"}}>
                <span style={{fontSize:26}}>{p.emoji}</span>
                <div><div style={{fontSize:14,color:C.text,fontWeight:500}}>{p.title}</div><div style={{fontSize:11,color:C.t2}}>{p.description}</div></div>
                <span style={{marginLeft:"auto",color:C.green,fontSize:18}}>✓</span>
              </div>
            ))}
          </div>
          <button onClick={onClose} style={{marginTop:24,background:"transparent",border:`1px solid ${C.border}`,borderRadius:999,padding:"11px 20px",color:C.t2,fontSize:12,cursor:"pointer"}}>Fermer</button>
        </div>
      </div>
    );
  }

  return(
    <div style={{position:"fixed",inset:0,zIndex:400,background:C.bg,overflowY:"auto",fontFamily:"'Inter','Noto Sans JP',sans-serif"}}>
      {/* Hero */}
      <div style={{padding:"calc(28px + env(safe-area-inset-top, 0px)) 22px 28px",background:`linear-gradient(160deg,rgba(201,70,61,0.18),${acc.soft} 60%,transparent)`,position:"relative",textAlign:"center",maxWidth:480,margin:"0 auto",boxSizing:"border-box"}}>
        <button aria-label="Fermer Premium" onClick={onClose} style={{position:"absolute",top:"calc(18px + env(safe-area-inset-top, 0px))",left:18,background:"rgba(0,0,0,0.25)",border:"none",borderRadius:"50%",width:38,height:38,color:"#fff",fontSize:18,cursor:"pointer"}}>×</button>
        <div style={{fontSize:54,marginBottom:10}}>異</div>
        <div style={{fontSize:11,color:C.gold,letterSpacing:".25em",textTransform:"uppercase",marginBottom:8}}>Isekai'd Premium</div>
        <div style={{fontSize:25,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:10,lineHeight:1.3}}>Va plus loin<br/>dans ton Japon</div>
        <div style={{fontSize:13,color:C.t2,lineHeight:1.6,maxWidth:320,margin:"0 auto"}}>Des outils avancés pour préparer, pratiquer et conserver tes voyages — les essentiels restent gratuits.</div>
      </div>

      <div style={{padding:"6px 22px calc(40px + env(safe-area-inset-bottom, 0px))",maxWidth:480,margin:"0 auto",boxSizing:"border-box"}}>
        {/* Avantages */}
        <div style={{margin:"18px 0 26px"}}>
          {PREMIUM_BENEFITS.map((p,i)=>(
            <div key={i} className="lift" style={{display:"flex",alignItems:"center",gap:14,padding:"15px 16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,marginBottom:10}}>
              <div style={{width:46,height:46,borderRadius:12,background:acc.soft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{p.emoji}</div>
              <div><div style={{fontSize:15,color:C.text,fontWeight:600,marginBottom:2}}>{p.title}</div><div style={{fontSize:12,color:C.t2,lineHeight:1.45}}>{p.description}</div></div>
            </div>
          ))}
        </div>

        <div style={{padding:"16px",borderRadius:16,background:`${C.green}0f`,border:`1px solid ${C.green}35`,margin:"0 0 26px"}}>
          <div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:9}}>Toujours inclus gratuitement</div>
          {ALWAYS_FREE_PROMISES.map(item=><div key={item} style={{display:"flex",gap:8,fontSize:11,color:C.t2,lineHeight:1.45,marginTop:6}}><span style={{color:C.green}}>✓</span><span>{item}</span></div>)}
        </div>

        {/* Plans */}
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:22}}>
          {PREMIUM_PLANS.map(pl=>{
            const on = sel===pl.id;
            return(
              <div key={pl.id} onClick={()=>setSel(pl.id)} style={{position:"relative",cursor:"pointer",padding:"18px 20px",borderRadius:16,background:on?`linear-gradient(135deg,rgba(201,70,61,0.12),transparent)`:C.s1,border:`2px solid ${on?C.red:C.border}`,transition:"all .2s"}}>
                {pl.badge && <div style={{position:"absolute",top:-10,left:18,background:C.red,color:"#fff",fontSize:9,fontWeight:700,padding:"3px 10px",borderRadius:10,letterSpacing:".03em"}}>{pl.badge}</div>}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:15,color:C.text,fontWeight:600,marginBottom:3}}>{pl.label}</div>
                    <div style={{fontSize:11,color:C.t2}}>{pl.sub}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <span style={{fontSize:22,color:C.text,fontWeight:700}}>{prices[pl.id] || pl.price}</span>
                    <span style={{fontSize:11,color:C.t3}}> {pl.per}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <button onClick={()=>!billingBusy && onActivate(sel)} disabled={billingBusy} className="pop-press" style={{width:"100%",padding:"16px",background:C.red,border:"none",borderRadius:999,color:"#fff",fontSize:15,fontWeight:700,cursor:billingBusy?"wait":"pointer",marginBottom:10,boxShadow:"0 4px 16px rgba(201,70,61,0.3)",opacity:billingBusy?0.7:1}}>
          {billingBusy ? "Traitement en cours…" : "Devenir Premium"}
        </button>
        {/* Restaurer les achats (obligatoire sur iOS, pratique sur Android) */}
        {onRestore && (
          <button onClick={()=>!billingBusy && onRestore()} disabled={billingBusy} style={{width:"100%",padding:"11px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:13,cursor:billingBusy?"wait":"pointer",marginBottom:10}}>
            Restaurer mes achats
          </button>
        )}
        {billingError && (
          <div style={{padding:"12px 14px",background:`${C.red}14`,border:`1px solid ${C.red}44`,borderRadius:12,marginBottom:10,fontSize:12,color:C.text,lineHeight:1.5}}>
            {billingError==="unavailable"
              ? "Le paiement est disponible uniquement dans l'application Android ou iOS. Sur le web, utilise un code d'invitation."
              : billingError==="cannot_pay" || billingError==="no_offerings"
              ? "Impossible de contacter le store. Vérifie ta connexion et que tu es bien connecté à ton compte."
              : billingError==="restore_nothing"
              ? "Aucun achat trouvé sur ce compte. Si tu as acheté sur un autre appareil, connecte-toi avec le même compte."
              : billingError==="product_not_found"
              ? "Produit introuvable. L'app n'est peut-être pas encore disponible dans ta région."
              : "Une erreur est survenue. Réessaie ou utilise un code d'invitation."}
          </div>
        )}
        <div style={{fontSize:10,color:C.t3,textAlign:"center",lineHeight:1.6,marginBottom:8}}>
          Paiement sécurisé via Google Play / App Store. Annulable à tout moment.<br/>
          L'abonnement se renouvelle automatiquement sauf résiliation.
        </div>

        {/* Code d'invitation */}
        {!codeOpen ? (
          <button onClick={()=>setCodeOpen(true)} style={{width:"100%",padding:"12px",background:"transparent",border:`1px dashed ${C.border}`,borderRadius:12,color:C.t2,fontSize:13,cursor:"pointer",marginBottom:8}}>
            🎟️ J'ai un code d'invitation
          </button>
        ) : (
          <div style={{padding:"14px",background:C.s1,border:`1px solid ${codeError?C.red:C.border}`,borderRadius:12,marginBottom:8}}>
            <div style={{fontSize:12,color:C.t2,marginBottom:9,textAlign:"center"}}>Entre ton code pour débloquer le Premium</div>
            <div style={{display:"flex",gap:8}}>
              <input value={codeVal} onChange={e=>{setCodeVal(e.target.value);setCodeError(false);}} onKeyDown={e=>{if(e.key==="Enter")tryCode();}} disabled={codeBusy} autoFocus placeholder="CODE-INVITATION" style={{flex:1,boxSizing:"border-box",padding:"11px 13px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:14,fontFamily:"inherit",textTransform:"uppercase"}}/>
              <button onClick={tryCode} disabled={codeBusy} style={{padding:"0 18px",background:C.red,border:"none",borderRadius:999,color:"#fff",fontSize:13,fontWeight:600,cursor:codeBusy?"wait":"pointer",opacity:codeBusy?0.7:1}}>{codeBusy?"…":"OK"}</button>
            </div>
            {codeError && <div style={{fontSize:11,color:C.red,marginTop:8,textAlign:"center"}}>Code invalide. Vérifie et réessaie.</div>}
          </div>
        )}

        <button onClick={onClose} style={{width:"100%",padding:"12px",background:"transparent",border:"none",color:C.t3,fontSize:13,cursor:"pointer"}}>Peut-être plus tard</button>
      </div>
    </div>
  );
}
