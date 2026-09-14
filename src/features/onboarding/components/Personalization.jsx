import { useState } from "react";
import { JAPAN_RELATIONSHIP, normalizeProfile } from "../../../entities/user/profileModel.js";
import "./personalization.css";

const INTERESTS=[
  {id:"voyage",label:"Voyage"},{id:"culture",label:"Culture"},{id:"gastro",label:"Gastronomie"},
  {id:"anime",label:"Anime / manga"},{id:"lifestyle",label:"Vie quotidienne"},{id:"langue",label:"Japonais"},
];
const LEVELS=[
  {id:"beginner",label:"Débutant complet",sub:"Je découvre le japonais"},
  {id:"intermediate",label:"Quelques bases",sub:"Je comprends des phrases simples"},
  {id:"advanced",label:"Intermédiaire",sub:"Je peux déjà échanger"},
];
const RELATIONSHIPS=[
  {id:JAPAN_RELATIONSHIP.DREAMING,label:"Je découvre le Japon"},
  {id:JAPAN_RELATIONSHIP.PLANNING,label:"Je prépare un voyage"},
  {id:JAPAN_RELATIONSHIP.SOON,label:"Je pars bientôt"},
  {id:JAPAN_RELATIONSHIP.IN_JAPAN,label:"Je suis au Japon"},
  {id:JAPAN_RELATIONSHIP.RETURNED,label:"Je reviens du Japon"},
  {id:JAPAN_RELATIONSHIP.JAPAN_LOVER,label:"Je veux rester connecté au Japon"},
];

/** Optional preferences, separate from the product presentation. */
export function Personalization({user,onSave,onClose}) {
  const [draft,setDraft]=useState(()=>({...user,why:user?.why||[]}));
  const [error,setError]=useState("");
  const submit=event=>{
    event.preventDefault();
    try { onSave(normalizeProfile(draft)); onClose(); }
    catch(cause){setError(cause.message||"Enregistrement impossible. Réessaie.");}
  };
  return <form className="personalization" onSubmit={submit}>
    <button type="button" onClick={onClose}>Retour aux réglages</button>
    <h1>Ce qui te ressemble</h1>
    <p>Ces choix adaptent tes découvertes et ton apprentissage. Tu peux les changer à tout moment.</p>
    <label>Ton prénom <input autoComplete="given-name" maxLength={80} value={draft.name||""} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
    <fieldset><legend>Ce qui t’attire</legend><div className="personalization-choices">{INTERESTS.map(item=><button type="button" key={item.id} aria-pressed={draft.why.includes(item.id)} onClick={()=>setDraft({...draft,why:draft.why.includes(item.id)?draft.why.filter(id=>id!==item.id):[...draft.why,item.id]})}>{item.label}</button>)}</div></fieldset>
    <label>Ton niveau de japonais<select value={draft.level||"beginner"} onChange={e=>setDraft({...draft,level:e.target.value})}>{LEVELS.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
    <label>Où en es-tu avec le Japon ?<select value={draft.japanRelationship||"dreaming"} onChange={e=>setDraft({...draft,japanRelationship:e.target.value,goal:["planning","soon","in_japan"].includes(e.target.value)?"travel":"imm"})}>{RELATIONSHIPS.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
    {error&&<p role="alert">{error}</p>}
    <button className="personalization-save" type="submit">Enregistrer mes préférences</button>
  </form>;
}
