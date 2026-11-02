import { getTripTiming } from "../../entities/user/japanJourneyState.js";

export const PHRASE_REVIEWS_KEY = "isekaid_phrase_reviews_v1";
export const MAX_REVIEW_PHRASES = 500;
export const PHRASE_INTERVAL_DAYS = Object.freeze([0,1,3,7,14,30]);
const DAY_MS = 86_400_000;
const text = value => typeof value === "string" ? value.trim() : "";
const timestamp = value => Number.isFinite(value) && value >= 0 && value < 8.64e15 ? Math.floor(value) : 0;
const count = value => Number.isInteger(value) && value >= 0 ? Math.min(value,1_000_000) : 0;

export function phraseReviewId(type, japanese) {
  const canonical=text(japanese).normalize("NFKC").replace(/\s/g,"").replace(/[。.]$/u,"");
  if (!canonical || !["phrase","correction"].includes(type)) return null;
  let hash=14695981039346656037n;
  for (const character of canonical) hash=BigInt.asUintN(64,(hash ^ BigInt(character.codePointAt(0)))*1099511628211n);
  return `${type}:${hash.toString(16).padStart(16,"0")}`;
}

export function phraseCandidate(item, {sourceLabel="Expression",situationId="",explanation=""} = {}) {
  const japanese=text(item?.expression || item?.jp || item?.japanese || item?.kana);
  const answer=text(item?.traduction || item?.fr || item?.answer);
  return japanese && answer ? {type:"phrase",japanese,answer,kana:text(item?.kana),romaji:text(item?.romaji),sourceLabel,situationId,explanation:explanation || text(item?.contexte)} : null;
}

// La correction contient une explication libre. La réponse du tuteur n'est
// jamais utilisée comme si elle était la phrase corrigée de l'utilisateur.
export function tutorCorrectionCandidate(userText, correction, sourceLabel="Correction du tuteur") {
  return text(userText) && text(correction) ? {type:"correction",japanese:text(userText),answer:text(correction),kana:"",romaji:"",sourceLabel,situationId:"",explanation:"Retrouve l’erreur dans ta phrase, puis rappelle-toi l’explication du tuteur."} : null;
}

function cleanCard(value) {
  if (!value || typeof value !== "object") return null;
  if (timestamp(value.removedAt) && /^(?:phrase|correction):[a-f0-9]{16}$/.test(value.id)) return {id:value.id,removedAt:timestamp(value.removedAt),updatedAt:Math.max(timestamp(value.updatedAt),timestamp(value.removedAt))};
  const japanese=text(value.japanese),answer=text(value.answer),id=phraseReviewId(value.type,japanese);
  if (!id || !answer || japanese.length > 600 || answer.length > 1600) return null;
  const seen=count(value.seen);
  return {id,type:value.type,japanese,answer,kana:text(value.kana).slice(0,600),romaji:text(value.romaji).slice(0,600),
    sourceLabel:text(value.sourceLabel).slice(0,120) || (value.type === "correction" ? "Correction du tuteur" : "Expression"),
    situationId:text(value.situationId).slice(0,80),explanation:text(value.explanation).slice(0,1200),
    box:Math.min(count(value.box),5),seen,known:Math.min(count(value.known),seen),due:timestamp(value.due),last:timestamp(value.last),
    updatedAt:timestamp(value.updatedAt),removedAt:0};
}

export function normalizePhraseReviews(value) {
  const cards=value?.version === 1 && value.cards && typeof value.cards === "object" && !Array.isArray(value.cards) ? Object.values(value.cards) : [];
  const unique=new Map();
  for(const card of cards.map(cleanCard).filter(Boolean)) unique.set(card.id,preferredCard(unique.get(card.id),card));
  // Conserver les retraits et les ajouts concurrents : tronquer par date peut
  // effacer une ancienne carte active ou ressusciter une carte supprimée.
  return {version:1,cards:Object.fromEntries([...unique.values()].sort((a,b)=>b.updatedAt-a.updatedAt||a.id.localeCompare(b.id)).map(card=>[card.id,card]))};
}

function preferredCard(previous,card) {
  if(!previous || card.updatedAt>previous.updatedAt || (card.updatedAt===previous.updatedAt && ((card.removedAt||0)>(previous.removedAt||0) || (Boolean(card.removedAt)===Boolean(previous.removedAt) && JSON.stringify(card)>JSON.stringify(previous)))))return card;
  return previous;
}

export function activePhraseReviews(state) { return Object.values(normalizePhraseReviews(state).cards).filter(card=>!card.removedAt); }

export function addPhraseReview(state, candidate, now=Date.now()) {
  if (!candidate) throw new Error("Cette phrase ne peut pas être ajoutée aux révisions.");
  if (text(candidate.japanese).length>600 || text(candidate.answer).length>1600) throw new Error("Cette correction est trop longue pour une carte de révision.");
  const card=cleanCard(candidate);
  if (!card) throw new Error("Ajoute une phrase et sa traduction, ou une correction du tuteur.");
  const current=normalizePhraseReviews(state),previous=current.cards[card.id];
  if (previous && !previous.removedAt) return current;
  if (activePhraseReviews(current).length>=MAX_REVIEW_PHRASES) throw new Error("Ton carnet contient déjà 500 cartes. Retire une carte avant d’en ajouter une.");
  return {...current,cards:{...current.cards,[card.id]:{...card,due:timestamp(now),updatedAt:Math.max(timestamp(now),(previous?.updatedAt||0)+1)}}};
}

export function recordPhraseReview(state, id, rating, now=Date.now()) {
  const current=normalizePhraseReviews(state),card=current.cards[id];
  if (!card || card.removedAt) throw new Error("Cette carte n’est plus dans tes révisions.");
  if (!["again","known"].includes(rating)) throw new Error("Choisis « À revoir » ou « Je connais ».");
  const box=rating === "known" ? Math.min(card.box+1,5) : Math.max(card.box-1,0);
  const interval=rating === "again" ? 10*60*1000 : PHRASE_INTERVAL_DAYS[box]*DAY_MS;
  return {...current,cards:{...current.cards,[id]:{...card,box,seen:card.seen+1,known:card.known+(rating === "known" ? 1 : 0),last:timestamp(now),due:timestamp(now+interval),updatedAt:Math.max(timestamp(now),card.updatedAt+1)}}};
}

export function removePhraseReview(state, id, now=Date.now()) {
  const current=normalizePhraseReviews(state),card=current.cards[id];
  if (!card || card.removedAt) return current;
  const updatedAt=Math.max(timestamp(now),card.updatedAt+1);
  // Le marqueur de retrait ne conserve pas la phrase ni la correction privée.
  return {...current,cards:{...current.cards,[id]:{id,removedAt:updatedAt,updatedAt}}};
}

export function restorePhraseReview(state, card, now=Date.now()) {
  const current=normalizePhraseReviews(state),clean=cleanCard(card);
  if (!clean || clean.removedAt) throw new Error("Cette carte ne peut pas être restaurée.");
  if (activePhraseReviews(current).length>=MAX_REVIEW_PHRASES) throw new Error("Ton carnet contient déjà 500 cartes.");
  return {...current,cards:{...current.cards,[clean.id]:{...clean,updatedAt:Math.max(timestamp(now),(current.cards[clean.id]?.updatedAt||0)+1)}}};
}

/** Chaque observation SRS reste atomique ; une suppression ne ressuscite pas. */
export function mergePhraseReviews(local, remote) {
  const a=normalizePhraseReviews(local),b=normalizePhraseReviews(remote),cards={...a.cards};
  for (const card of Object.values(b.cards)) cards[card.id]=preferredCard(cards[card.id],card);
  return normalizePhraseReviews({version:1,cards});
}

export function duePhraseReviews(state, now=Date.now(), limit=10) {
  return activePhraseReviews(state).filter(card=>card.due<=now).sort((a,b)=>a.due-b.due||a.box-b.box||a.id.localeCompare(b.id)).slice(0,Math.max(0,limit));
}

export function phraseReviewStats(state, now=Date.now()) {
  const cards=activePhraseReviews(state),future=cards.filter(card=>card.due>now).map(card=>card.due);
  return {total:cards.length,due:cards.filter(card=>card.due<=now).length,mastered:cards.filter(card=>card.box>=5).length,nextDue:future.length?Math.min(...future):null};
}

const TRAVEL_TOPICS=[
  [/restaurant|ramen|sushi|izakaya|café|repas|gastronom/i,"restaurant"],
  [/gare|train|métro|station|transport/i,"train"],
  [/hôtel|hotel|ryokan|hébergement/i,"hotel"],
  [/shopping|boutique|magasin|marché/i,"shopping"],
  [/konbini|supérette/i,"konbini"],
  [/temple|sanctuaire|musée|museum|jardin/i,"tourisme"],
];

export function tripPhraseSuggestions({trips=[],db={},state,currentDate=new Date(),limit=6}={}) {
  const candidates=(Array.isArray(trips)?trips:[]).filter(trip=>trip&&!['completed','cancelled'].includes(trip.status))
    .map(trip=>({trip,timing:getTripTiming(trip,currentDate)})).filter(({timing})=>!timing||timing.status!=="past")
    .sort((a,b)=>(a.timing?.status==="active"?-1:a.timing?.daysUntil??Infinity)-(b.timing?.status==="active"?-1:b.timing?.daysUntil??Infinity));
  const trip=candidates[0]?.trip;
  if (!trip) return [];
  const places=new Map([...(db.lieux||[]),...(trip.customLieux||[])].map(place=>[String(place.id),place]));
  const topics=new Map();
  for (const [index,day] of (trip.jours||[]).entries()) for (const activity of day.activites||[]) {
    const place=places.get(String(activity.lieuId));
    const source=`${place?.nom||""} ${place?.categorie||""} ${place?.type||""}`;
    for (const [pattern,id] of TRAVEL_TOPICS) if (pattern.test(source)&&!topics.has(id)) topics.set(id,`Pour ${place.nom} · jour ${day.num||index+1}`);
  }
  if (!topics.size) topics.set("politesse","Pour tes premières rencontres au Japon");
  const active=new Set(activePhraseReviews(state).map(card=>card.id)),seen=new Set(),result=[];
  for (const [id,reason] of topics) {
    const situation=(db.situations||[]).find(item=>item.id===id);
    for (const phrase of (situation?.phrases||[]).slice(0,3)) {
      const candidate=phraseCandidate(phrase,{sourceLabel:situation.titre,situationId:id});
      const identity=candidate&&phraseReviewId(candidate.type,candidate.japanese);
      if (!identity||active.has(identity)||seen.has(identity)) continue;
      seen.add(identity);result.push({candidate,reason});
      if (result.length>=limit) return result;
    }
  }
  return result;
}
