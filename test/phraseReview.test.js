import test from "node:test";
import assert from "node:assert/strict";
import { activePhraseReviews, addPhraseReview, duePhraseReviews, MAX_REVIEW_PHRASES, mergePhraseReviews, normalizePhraseReviews, phraseCandidate, phraseReviewId, phraseReviewStats, recordPhraseReview, removePhraseReview, restorePhraseReview, tripPhraseSuggestions, tutorCorrectionCandidate } from "../src/features/learn/phraseReviewModel.js";
import { mergeProgress } from "../src/services/sync/progressMerge.js";
import { createCloudBackup, restoreCloudBackup } from "../src/services/sync/cloudBackup.js";
import { activateAccountStorage } from "../src/services/auth/accountStorage.js";
import { PHRASE_REVIEWS_KEY } from "../src/features/learn/phraseReviewModel.js";

const now=Date.parse("2026-11-02T10:00:00Z"),day=86_400_000;
const candidate=phraseCandidate({jp:"水をください。",fr:"De l’eau, s’il vous plaît.",romaji:"Mizu o kudasai."});
const initial=()=>addPhraseReview(null,candidate,now);
const id=phraseReviewId("phrase",candidate.japanese);

test("un ajout est immédiatement dû et un doublon conserve toute sa progression",()=>{
  const fresh=initial();
  assert.equal(duePhraseReviews(fresh,now).length,1);
  const reviewed=recordPhraseReview(fresh,id,"known",now);
  assert.deepEqual(addPhraseReview(reviewed,{...candidate,japanese:"水 をください"},now+5000),reviewed);
  assert.equal(phraseReviewId("phrase","Ａ 。"),phraseReviewId("phrase","A"));
  assert.equal(phraseReviewId("phrase","  "),null);
});

test("les intervalles suivent 1, 3, 7, 14 et 30 jours puis maintiennent une révision mensuelle",()=>{
  let state=initial(),time=now;
  for(const [index,days] of [1,3,7,14,30,30].entries()){
    state=recordPhraseReview(state,id,"known",time);
    assert.equal(state.cards[id].due,time+days*day);
    assert.equal(state.cards[id].box,Math.min(index+1,5));
    assert.equal(duePhraseReviews(state,time+days*day-1).length,0);
    assert.equal(duePhraseReviews(state,time+days*day).length,1);
    time+=days*day;
  }
  assert.equal(phraseReviewStats(state,time).mastered,1);
  state=recordPhraseReview(state,id,"again",time);
  assert.equal(state.cards[id].box,4);
  assert.equal(state.cards[id].due,time+600_000);
  assert.equal(state.cards[id].known,6);
  assert.equal(state.cards[id].seen,7);
  assert.throws(()=>recordPhraseReview(state,id,"arbitrary",time));
});

test("une correction conserve la phrase de l’apprenant et l’explication exacte",()=>{
  const correction=tutorCorrectionCandidate("私を学生です","Utilise は : 私は学生です。","Restaurant");
  assert.equal(correction.japanese,"私を学生です");
  assert.equal(correction.answer,"Utilise は : 私は学生です。");
  assert.equal(correction.type,"correction");
  assert.notEqual(phraseReviewId("correction",candidate.japanese),id);
  assert.equal(tutorCorrectionCandidate("","Explication"),null);
  assert.equal(tutorCorrectionCandidate("こんにちは",null),null);
});

test("retrait sans texte privé, aucune résurrection par une vieille copie et annulation explicite",()=>{
  const old=initial(),removed=removePhraseReview(old,id,now+1);
  assert.deepEqual(Object.keys(removed.cards[id]).sort(),["id","removedAt","updatedAt"]);
  assert.equal(activePhraseReviews(mergePhraseReviews(removed,old)).length,0);
  assert.equal(activePhraseReviews(mergePhraseReviews(old,removed)).length,0);
  const restored=restorePhraseReview(removed,old.cards[id],now+2);
  assert.equal(activePhraseReviews(mergePhraseReviews(removed,restored)).length,1);
  const readded=addPhraseReview(removed,candidate,now+3);
  assert.equal(readded.cards[id].box,0);
  assert.equal(readded.cards[id].due,now+3);
});

test("fusion atomique, commutative et déterministe des évaluations concurrentes",()=>{
  const base=initial(),known=recordPhraseReview(base,id,"known",now+1),again=recordPhraseReview(base,id,"again",now+2);
  assert.deepEqual(mergePhraseReviews(known,again).cards[id],again.cards[id]);
  assert.deepEqual(mergePhraseReviews(known,again),mergePhraseReviews(again,known));
  const sameTime=recordPhraseReview(base,id,"known",now+2);
  assert.deepEqual(mergePhraseReviews(sameTime,again),mergePhraseReviews(again,sameTime));
  const removed=removePhraseReview(base,id,now+2);
  assert.equal(activePhraseReviews(mergePhraseReviews(sameTime,removed)).length,0);
  const other=addPhraseReview(null,phraseCandidate({jp:"ありがとう",fr:"Merci"}),now);
  assert.equal(activePhraseReviews(mergePhraseReviews(base,other)).length,2);
});

test("la fusion de progression conserve les cartes malgré les raccourcis d’égalité des réglages",()=>{
  const base={settings:{phraseReviews:initial(),script:"kana"}};
  const removed={settings:{...base.settings,phraseReviews:removePhraseReview(initial(),id,now+1)}};
  assert.equal(activePhraseReviews(mergeProgress(base,base,removed).snapshot.settings.phraseReviews).length,0);
  const legacy={settings:{script:"kanji"}};
  assert.equal(activePhraseReviews(mergeProgress({},base,legacy).snapshot.settings.phraseReviews).length,1);
  assert.equal(activePhraseReviews(mergeProgress({},legacy,base).snapshot.settings.phraseReviews).length,1);
});

test("le carnet est isolé entre comptes et une ancienne sauvegarde respecte les retraits",()=>{
  const values=new Map();
  const storage={get length(){return values.size;},key:index=>[...values.keys()][index],getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
  activateAccountStorage("A",storage);
  storage.setItem(PHRASE_REVIEWS_KEY,JSON.stringify(initial()));
  const backup=createCloudBackup(storage);
  assert.ok(backup.values[PHRASE_REVIEWS_KEY]);
  activateAccountStorage("B",storage);
  assert.equal(storage.getItem(PHRASE_REVIEWS_KEY),null);
  activateAccountStorage("A",storage);
  assert.equal(activePhraseReviews(JSON.parse(storage.getItem(PHRASE_REVIEWS_KEY))).length,1);
  storage.setItem(PHRASE_REVIEWS_KEY,JSON.stringify(removePhraseReview(initial(),id,now+1)));
  restoreCloudBackup(backup,storage);
  assert.equal(activePhraseReviews(JSON.parse(storage.getItem(PHRASE_REVIEWS_KEY))).length,0);
  restoreCloudBackup({version:1,values:{[PHRASE_REVIEWS_KEY]:"invalid json"}},storage);
  assert.equal(activePhraseReviews(JSON.parse(storage.getItem(PHRASE_REVIEWS_KEY))).length,0);
});

test("validation des entrées, plafond d’ajout et normalisation sans perte des anciennes cartes",()=>{
  assert.deepEqual(normalizePhraseReviews({version:2,cards:{}}),{version:1,cards:{}});
  assert.throws(()=>addPhraseReview(null,{...candidate,japanese:"a".repeat(601)},now));
  assert.throws(()=>addPhraseReview(null,null,now));
  let state={version:1,cards:{}};
  for(let n=0;n<MAX_REVIEW_PHRASES;n++){
    const next=addPhraseReview(null,{...candidate,japanese:`phrase ${n}`},now);
    Object.assign(state.cards,next.cards);
  }
  assert.throws(()=>addPhraseReview(state,candidate,now),/500/);
  const historical={...initial(),cards:{...initial().cards}};
  for(let n=0;n<1100;n++){
    const next=addPhraseReview(null,{...candidate,japanese:`retirée ${n}`},now);
    Object.assign(historical.cards,removePhraseReview(next,Object.keys(next.cards)[0],now+1).cards);
  }
  assert.equal(Object.keys(normalizePhraseReviews(historical).cards).length,1101);
  assert.equal(activePhraseReviews(historical).length,1);
  const duplicate={version:1,cards:{older:initial().cards[id],newer:recordPhraseReview(initial(),id,"known",now+1).cards[id]}};
  assert.equal(normalizePhraseReviews(duplicate).cards[id].box,1);
});

const trip=(dateDebut="2026-11-22")=>({dateDebut,customLieux:[{id:"restaurant",nom:"Mon restaurant à Kyoto",categorie:"Restaurant"}],jours:[{num:1,activites:[{lieuId:"restaurant"}]}]});
const db={situations:[{id:"restaurant",titre:"Au restaurant",phrases:[{jp:candidate.japanese,fr:candidate.answer}]},{id:"politesse",titre:"Politesse",phrases:[{jp:"こんにちは",fr:"Bonjour"}]}]};
test("les suggestions utilisent le voyage actif ou le plus proche, ses lieux personnalisés et les inscriptions explicites",()=>{
  const args={db,currentDate:new Date(now),trips:[trip()]};
  const suggestions=tripPhraseSuggestions(args);
  assert.equal(suggestions.length,1);
  assert.match(suggestions[0].reason,/Mon restaurant à Kyoto · jour 1/);
  assert.equal(tripPhraseSuggestions({...args,state:initial()}).length,0);
  for(const status of ["cancelled","completed"]) assert.equal(tripPhraseSuggestions({...args,trips:[{...trip(),status}]}).length,0);
  assert.equal(tripPhraseSuggestions({...args,trips:[trip("2026-10-02")]}).length,0);
  const active={...trip("2026-11-02"),jours:[{activites:[]}]};
  assert.equal(tripPhraseSuggestions({...args,trips:[trip(),active]})[0].candidate.answer,"Bonjour");
  assert.equal(tripPhraseSuggestions({...args,trips:[trip("2026-12-22"),trip()]})[0].candidate.situationId,"restaurant");
  assert.deepEqual(tripPhraseSuggestions({trips:[],db}),[]);
});
