import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookmarkPlus, Check, RotateCcw, Trash2 } from "lucide-react";
import { SpeakButton } from "../../tts.jsx";
import { Romaji } from "../../components/JapaneseDisplay.jsx";
import { productTheme } from "../shared/ProductUI.jsx";
import { activePhraseReviews, duePhraseReviews, phraseCandidate, phraseReviewId, phraseReviewStats, tripPhraseSuggestions } from "./phraseReviewModel.js";
import { usePhraseReviews } from "./phraseReviewStore.jsx";
import "./phraseReviews.css";

const nextDate=value=>new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value));

export function SavePhraseButton({ C, candidate, label="Ajouter aux révisions" }) {
  const store=usePhraseReviews();
  const [error,setError]=useState("");
  if (!store || !candidate) return null;
  const id=phraseReviewId(candidate.type,candidate.japanese);
  const saved=Boolean(id&&store.state.cards[id]&&!store.state.cards[id].removedAt);
  const add=()=>{try{store.add(candidate);setError("");}catch(failure){setError(failure.message);}};
  return <div className="phrase-save" style={productTheme(C)}>
    <button type="button" disabled={saved} onClick={event=>{event.stopPropagation();add();}}>{saved?<Check size={13} aria-hidden/>:<BookmarkPlus size={13} aria-hidden/>}{saved?"Dans mes révisions":label}</button>
    {error&&<p role="alert">{error}</p>}
  </div>;
}

export function PhraseReviewEntry({ C, onOpen, home=false }) {
  const store=usePhraseReviews();
  if(!store)return null;
  const stats=phraseReviewStats(store.state,store.now);
  if(home&&!stats.total)return null;
  return <section className={`phrase-review-entry${home?" phrase-review-entry--home":""}`} style={productTheme(C)} aria-label="Révisions des phrases utiles">
    <button type="button" onClick={onOpen}><span className="phrase-review-entry__icon" aria-hidden>🔁</span><span><strong>{stats.due?`${stats.due} carte${stats.due>1?"s":""} à revoir`:"Mes phrases utiles"}</strong><small>{stats.total?`${stats.total} carte${stats.total>1?"s":""} dans ton carnet${stats.nextDue&&!stats.due?` · prochaine révision le ${nextDate(stats.nextDue)}`:""}`:"Expressions, corrections et phrases pour ton voyage"}</small></span><ArrowRight size={17} aria-hidden/></button>
    {store.error&&<p role="alert">{store.error}</p>}
  </section>;
}

export function PhraseReviewScreen({ C, db, trips=[], script="kana", onBack, onSessionComplete }) {
  const store=usePhraseReviews();
  const [queue,setQueue]=useState(null);
  const [position,setPosition]=useState(0);
  const [revealed,setRevealed]=useState(false);
  const [result,setResult]=useState({known:0,again:0});
  const [error,setError]=useState("");
  const [removed,setRemoved]=useState(null);
  const [manual,setManual]=useState({japanese:"",answer:"",romaji:""});
  const [showAll,setShowAll]=useState(false);
  const suggestions=useMemo(()=>tripPhraseSuggestions({trips,db,state:store?.state,currentDate:new Date(store?.now||Date.now())}),[trips,db,store?.state,store?.now]);
  if(!store)return null;
  const stats=phraseReviewStats(store.state,store.now);
  const cards=activePhraseReviews(store.state).sort((a,b)=>a.due-b.due||b.updatedAt-a.updatedAt);
  const current=queue ? store.state.cards[queue[position]] : null;
  const finished=queue&&position>=queue.length;
  const start=()=>{
    const due=duePhraseReviews(store.state,Date.now());
    if(!due.length)return;
    setQueue(due.map(card=>card.id));setPosition(0);setRevealed(false);setResult({known:0,again:0});setError("");
  };
  const leave=()=>{setQueue(null);setRevealed(false);setError("");};
  const grade=rating=>{
    if(!current||current.removedAt||!revealed)return;
    try {
      store.grade(current.id,rating);
      const nextResult={...result,[rating]:result[rating]+1};
      setResult(nextResult);setPosition(value=>value+1);setRevealed(false);setError("");
      if(position+1===queue.length)onSessionComplete?.({reviewed:nextResult.known+nextResult.again,...nextResult});
    } catch(failure){setError(failure.message);}
  };
  const remove=card=>{try{store.remove(card.id);setRemoved(card);setError("");}catch(failure){setError(failure.message);}};
  const saveManual=event=>{
    event.preventDefault();
    try {store.add(phraseCandidate(manual,{sourceLabel:"Ma phrase"}));setManual({japanese:"",answer:"",romaji:""});setError("");}
    catch(failure){setError(failure.message);}
  };
  const back=()=>queue?leave():onBack?.();
  return <div className="phrase-review-screen" style={productTheme(C)}>
    <header><button type="button" onClick={back}><ArrowLeft size={16} aria-hidden/>{queue?"Mes phrases":"Apprendre"}</button><h1>{queue?"Ma séance de révision":"Mes phrases utiles"}</h1><p>{queue?"Rappelle-toi la réponse avant de la révéler.":"Un peu de pratique, au moment où tu risques d’oublier."}</p></header>
    <main>
      {error&&<p className="phrase-review__error" role="alert">{error}</p>}
      {!error&&store.error&&<p className="phrase-review__error" role="alert">{store.error}</p>}
      {finished?<section className="phrase-review__card phrase-review__finish" role="status">
        <Check size={30} color={C.green} aria-hidden/><h2>Séance terminée</h2><p>{result.known} réponse{result.known>1?"s":""} connue{result.known>1?"s":""} · {result.again} carte{result.again>1?"s":""} à revoir.</p><p>Les cartes difficiles reviennent dans 10 minutes. Les autres sont espacées progressivement, jusqu’à 30 jours.</p><button type="button" className="phrase-review__primary" onClick={leave}>Retour au carnet</button>
      </section>:queue?current&&!current.removedAt?<section key={current.id} className="phrase-review__card phrase-review__session" aria-label="Carte de révision">
        <div className="phrase-review__session-top"><span>Carte {position+1} sur {queue.length}</span><span>{current.type==="correction"?"Correction du tuteur":"Phrase utile"}</span></div>
        <div role="progressbar" aria-label="Progression de la séance" aria-valuenow={position} aria-valuemin={0} aria-valuemax={queue.length} className="phrase-review__progress"><span style={{width:`${position/queue.length*100}%`}}/></div>
        <p className="phrase-review__source">{current.sourceLabel}</p>
        <h2>{current.type==="correction"?"Quelle erreur corriger ?":"Comment le dire en japonais ?"}</h2>
        {current.type==="correction"&&<p className="phrase-review__hint">Ta phrase à corriger :</p>}
        <p className={current.type==="correction"?"phrase-review__japanese":"phrase-review__question"} lang={current.type==="correction"?"ja":undefined}>{current.type==="correction"?current.japanese:current.answer}</p>
        {!revealed?<button type="button" className="phrase-review__primary" onClick={()=>setRevealed(true)}>Révéler la réponse</button>:<>
          <div className="phrase-review__answer" role="status">
            {current.type==="correction"?<><h3>Correction du tuteur</h3><p>{current.answer}</p></>:<>
              <div className="phrase-review__answer-line"><p lang={script==="romaji"?"ja-Latn":"ja"} className="phrase-review__japanese">{script==="romaji"?current.romaji||current.japanese:script==="kana"?current.kana||current.japanese:current.japanese}</p><SpeakButton C={C} text={current.japanese} size={34}/></div>
              {script!=="romaji"&&current.romaji&&<Romaji style={{fontSize:12,color:C.gold,fontStyle:"italic"}}>{current.romaji}</Romaji>}
              {current.explanation&&<p className="phrase-review__hint">{current.explanation}</p>}
            </>}
          </div>
          <div className="phrase-review__ratings"><button type="button" onClick={()=>grade("again")}><RotateCcw size={15} aria-hidden/>À revoir<small>Dans 10 min</small></button><button type="button" onClick={()=>grade("known")}><Check size={15} aria-hidden/>Je connais<small>Révision espacée</small></button></div>
        </>}
      </section>:<section className="phrase-review__card"><p>Cette carte a été retirée du carnet.</p><button type="button" className="phrase-review__primary" onClick={()=>{setPosition(value=>value+1);setRevealed(false);}}>Continuer</button></section>:<>
        <section className="phrase-review__card" aria-label="État de mes révisions">
          <div className="phrase-review__stats"><span><strong>{stats.total}</strong>cartes</span><span><strong>{stats.due}</strong>à revoir</span><span><strong>{stats.mastered}</strong>bien retenues</span></div>
          {stats.due?<button type="button" className="phrase-review__primary" onClick={start}>Réviser {Math.min(stats.due,10)} carte{stats.due>1?"s":""}<ArrowRight size={15} aria-hidden/></button>:<p>{stats.total?`Tout est à jour${stats.nextDue?` · prochaine révision le ${nextDate(stats.nextDue)}`:""}.`:"Ajoute une expression, une correction ou une phrase utile à ton voyage pour commencer."}</p>}
          <p className="phrase-review__hint">« Je connais » espace les révisions : 1, 3, 7, 14 puis 30 jours. « À revoir » fait revenir la carte dans 10 minutes.</p>
        </section>
        {suggestions.length>0&&<section aria-label="Phrases pour mon voyage"><h2>Pour mon voyage</h2><p className="phrase-review__hint">Choisis les phrases que tu veux retenir pour les lieux de ton itinéraire.</p><div className="phrase-review__suggestions">{suggestions.map(({candidate,reason})=><article className="phrase-review__card" key={phraseReviewId(candidate.type,candidate.japanese)}><p className="phrase-review__source">{reason}</p><p className="phrase-review__japanese" lang="ja">{script==="kana"?candidate.kana||candidate.japanese:candidate.japanese}</p><p>{candidate.answer}</p><SavePhraseButton C={C} candidate={candidate}/></article>)}</div></section>}
        <details className="phrase-review__card"><summary>Ajouter ma propre phrase</summary><form onSubmit={saveManual} className="phrase-review__manual">
          <label>Phrase japonaise<textarea aria-label="Phrase japonaise" required maxLength={600} value={manual.japanese} onChange={event=>setManual({...manual,japanese:event.target.value})}/></label>
          <label>Traduction française<textarea aria-label="Traduction française" required maxLength={1600} value={manual.answer} onChange={event=>setManual({...manual,answer:event.target.value})}/></label>
          <label>Romaji (facultatif)<input aria-label="Romaji (facultatif)" maxLength={600} value={manual.romaji} onChange={event=>setManual({...manual,romaji:event.target.value})}/></label>
          <button type="submit" className="phrase-review__primary">Ajouter ma phrase</button>
        </form></details>
        {removed&&<div className="phrase-review__undo" role="status">Carte retirée.<button type="button" onClick={()=>{try{store.undo(removed);setRemoved(null);setError("");}catch(failure){setError(failure.message);}}}>Annuler le retrait</button></div>}
        {cards.length>0&&<section aria-label="Mes cartes enregistrées"><h2>Dans mon carnet</h2><div className="phrase-review__list">{cards.slice(0,showAll?cards.length:20).map(card=><article className="phrase-review__card" key={card.id}><div><strong lang="ja">{card.japanese}</strong><p>{card.answer}</p><small>{card.type==="correction"?"Correction · ":""}{card.due<=store.now?"À revoir maintenant":`Prochaine révision le ${nextDate(card.due)}`}</small></div><button type="button" aria-label={`Retirer ${card.type==="correction"?"la correction":"la phrase"} ${card.japanese}`} onClick={()=>remove(card)}><Trash2 size={16} aria-hidden/></button></article>)}</div>{cards.length>20&&!showAll&&<button type="button" className="phrase-review__quiet" onClick={()=>setShowAll(true)}>Voir toutes mes cartes</button>}</section>}
      </>}
    </main>
  </div>;
}
