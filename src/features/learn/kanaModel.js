// Données et moteur de progression kana (Leitner simplifié).
// Sans dépendance React : utilisable par l'interface et les tests.
import { readJson, writeJson } from "../../lib/storage.js";

// ─── Kana (hiragana + katakana) ───────────────────────────────────────────────
const HIRAGANA = [
  {k:"あ",r:"a"},{k:"い",r:"i"},{k:"う",r:"u"},{k:"え",r:"e"},{k:"お",r:"o"},
  {k:"か",r:"ka"},{k:"き",r:"ki"},{k:"く",r:"ku"},{k:"け",r:"ke"},{k:"こ",r:"ko"},
  {k:"さ",r:"sa"},{k:"し",r:"shi"},{k:"す",r:"su"},{k:"せ",r:"se"},{k:"そ",r:"so"},
  {k:"た",r:"ta"},{k:"ち",r:"chi"},{k:"つ",r:"tsu"},{k:"て",r:"te"},{k:"と",r:"to"},
  {k:"な",r:"na"},{k:"に",r:"ni"},{k:"ぬ",r:"nu"},{k:"ね",r:"ne"},{k:"の",r:"no"},
  {k:"は",r:"ha"},{k:"ひ",r:"hi"},{k:"ふ",r:"fu"},{k:"へ",r:"he"},{k:"ほ",r:"ho"},
  {k:"ま",r:"ma"},{k:"み",r:"mi"},{k:"む",r:"mu"},{k:"め",r:"me"},{k:"も",r:"mo"},
  {k:"や",r:"ya"},{k:"ゆ",r:"yu"},{k:"よ",r:"yo"},
  {k:"ら",r:"ra"},{k:"り",r:"ri"},{k:"る",r:"ru"},{k:"れ",r:"re"},{k:"ろ",r:"ro"},
  {k:"わ",r:"wa"},{k:"を",r:"wo"},{k:"ん",r:"n"},
];
// Dakuten / handakuten (sons "voisés") — hiragana
const HIRAGANA_DAKUTEN = [
  {k:"が",r:"ga"},{k:"ぎ",r:"gi"},{k:"ぐ",r:"gu"},{k:"げ",r:"ge"},{k:"ご",r:"go"},
  {k:"ざ",r:"za"},{k:"じ",r:"ji"},{k:"ず",r:"zu"},{k:"ぜ",r:"ze"},{k:"ぞ",r:"zo"},
  {k:"だ",r:"da"},{k:"ぢ",r:"ji"},{k:"づ",r:"zu"},{k:"で",r:"de"},{k:"ど",r:"do"},
  {k:"ば",r:"ba"},{k:"び",r:"bi"},{k:"ぶ",r:"bu"},{k:"べ",r:"be"},{k:"ぼ",r:"bo"},
  {k:"ぱ",r:"pa"},{k:"ぴ",r:"pi"},{k:"ぷ",r:"pu"},{k:"ぺ",r:"pe"},{k:"ぽ",r:"po"},
];
// Combinaisons (yōon) — hiragana
const HIRAGANA_COMBO = [
  {k:"きゃ",r:"kya"},{k:"きゅ",r:"kyu"},{k:"きょ",r:"kyo"},
  {k:"しゃ",r:"sha"},{k:"しゅ",r:"shu"},{k:"しょ",r:"sho"},
  {k:"ちゃ",r:"cha"},{k:"ちゅ",r:"chu"},{k:"ちょ",r:"cho"},
  {k:"にゃ",r:"nya"},{k:"にゅ",r:"nyu"},{k:"にょ",r:"nyo"},
  {k:"ひゃ",r:"hya"},{k:"ひゅ",r:"hyu"},{k:"ひょ",r:"hyo"},
  {k:"みゃ",r:"mya"},{k:"みゅ",r:"myu"},{k:"みょ",r:"myo"},
  {k:"りゃ",r:"rya"},{k:"りゅ",r:"ryu"},{k:"りょ",r:"ryo"},
  {k:"ぎゃ",r:"gya"},{k:"ぎゅ",r:"gyu"},{k:"ぎょ",r:"gyo"},
  {k:"じゃ",r:"ja"},{k:"じゅ",r:"ju"},{k:"じょ",r:"jo"},
  {k:"びゃ",r:"bya"},{k:"びゅ",r:"byu"},{k:"びょ",r:"byo"},
];
const KATAKANA = [
  {k:"ア",r:"a"},{k:"イ",r:"i"},{k:"ウ",r:"u"},{k:"エ",r:"e"},{k:"オ",r:"o"},
  {k:"カ",r:"ka"},{k:"キ",r:"ki"},{k:"ク",r:"ku"},{k:"ケ",r:"ke"},{k:"コ",r:"ko"},
  {k:"サ",r:"sa"},{k:"シ",r:"shi"},{k:"ス",r:"su"},{k:"セ",r:"se"},{k:"ソ",r:"so"},
  {k:"タ",r:"ta"},{k:"チ",r:"chi"},{k:"ツ",r:"tsu"},{k:"テ",r:"te"},{k:"ト",r:"to"},
  {k:"ナ",r:"na"},{k:"ニ",r:"ni"},{k:"ヌ",r:"nu"},{k:"ネ",r:"ne"},{k:"ノ",r:"no"},
  {k:"ハ",r:"ha"},{k:"ヒ",r:"hi"},{k:"フ",r:"fu"},{k:"ヘ",r:"he"},{k:"ホ",r:"ho"},
  {k:"マ",r:"ma"},{k:"ミ",r:"mi"},{k:"ム",r:"mu"},{k:"メ",r:"me"},{k:"モ",r:"mo"},
  {k:"ヤ",r:"ya"},{k:"ユ",r:"yu"},{k:"ヨ",r:"yo"},
  {k:"ラ",r:"ra"},{k:"リ",r:"ri"},{k:"ル",r:"ru"},{k:"レ",r:"re"},{k:"ロ",r:"ro"},
  {k:"ワ",r:"wa"},{k:"ヲ",r:"wo"},{k:"ン",r:"n"},
];
const KATAKANA_DAKUTEN = [
  {k:"ガ",r:"ga"},{k:"ギ",r:"gi"},{k:"グ",r:"gu"},{k:"ゲ",r:"ge"},{k:"ゴ",r:"go"},
  {k:"ザ",r:"za"},{k:"ジ",r:"ji"},{k:"ズ",r:"zu"},{k:"ゼ",r:"ze"},{k:"ゾ",r:"zo"},
  {k:"ダ",r:"da"},{k:"ヂ",r:"ji"},{k:"ヅ",r:"zu"},{k:"デ",r:"de"},{k:"ド",r:"do"},
  {k:"バ",r:"ba"},{k:"ビ",r:"bi"},{k:"ブ",r:"bu"},{k:"ベ",r:"be"},{k:"ボ",r:"bo"},
  {k:"パ",r:"pa"},{k:"ピ",r:"pi"},{k:"プ",r:"pu"},{k:"ペ",r:"pe"},{k:"ポ",r:"po"},
];
const KATAKANA_COMBO = [
  {k:"キャ",r:"kya"},{k:"キュ",r:"kyu"},{k:"キョ",r:"kyo"},
  {k:"シャ",r:"sha"},{k:"シュ",r:"shu"},{k:"ショ",r:"sho"},
  {k:"チャ",r:"cha"},{k:"チュ",r:"chu"},{k:"チョ",r:"cho"},
  {k:"ニャ",r:"nya"},{k:"ニュ",r:"nyu"},{k:"ニョ",r:"nyo"},
  {k:"ヒャ",r:"hya"},{k:"ヒュ",r:"hyu"},{k:"ヒョ",r:"hyo"},
  {k:"ミャ",r:"mya"},{k:"ミュ",r:"myu"},{k:"ミョ",r:"myo"},
  {k:"リャ",r:"rya"},{k:"リュ",r:"ryu"},{k:"リョ",r:"ryo"},
  {k:"ギャ",r:"gya"},{k:"ギュ",r:"gyu"},{k:"ギョ",r:"gyo"},
  {k:"ジャ",r:"ja"},{k:"ジュ",r:"ju"},{k:"ジョ",r:"jo"},
  {k:"ビャ",r:"bya"},{k:"ビュ",r:"byu"},{k:"ビョ",r:"byo"},
];
function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

// ── Flashcard mode ──

const LEARN_DECKS = [
  {id:"hira", label:"Hiragana", jp:"ひらがな", emoji:"あ", deck:HIRAGANA, desc:"46 caractères de base · mots japonais", group:"Bases"},
  {id:"kata", label:"Katakana", jp:"カタカナ", emoji:"ア", deck:KATAKANA, desc:"46 caractères de base · mots étrangers", group:"Bases"},
  {id:"hira_dak", label:"Hiragana — dakuten", jp:"濁音", emoji:"が", deck:HIRAGANA_DAKUTEN, desc:"25 sons voisés (が ざ だ ば ぱ)", group:"Avancé"},
  {id:"hira_combo", label:"Hiragana — combinaisons", jp:"拗音", emoji:"きゃ", deck:HIRAGANA_COMBO, desc:"30 combinaisons (きゃ しゅ ちょ…)", group:"Avancé"},
  {id:"kata_dak", label:"Katakana — dakuten", jp:"濁音", emoji:"ガ", deck:KATAKANA_DAKUTEN, desc:"25 sons voisés (ガ ザ ダ バ パ)", group:"Avancé"},
  {id:"kata_combo", label:"Katakana — combinaisons", jp:"拗音", emoji:"キャ", deck:KATAKANA_COMBO, desc:"30 combinaisons (キャ シュ チョ…)", group:"Avancé"},
];


const KANA_KEY = "isekaid_kana_v1"; // { "あ": {seen, known}, ... }
function loadKanaProgress(){
  return readJson(KANA_KEY, {});
}
function saveKanaProgress(progress){ return writeJson(KANA_KEY, progress); }
// Record a result for one character: known=true if recognized
function recordKana(progress, char, known){
  const cur = progress[char] || {seen:0, known:0};
  const next = { seen:cur.seen+1, known:cur.known + (known?1:0) };
  // ─── Répétition espacée (Leitner simplifié) ───
  // box : niveau de maîtrise 0→5. Bonne réponse = monte d'un cran, mauvaise = redescend.
  // due : timestamp de la prochaine révision recommandée.
  const INTERVALS_DAYS = [0, 1, 3, 7, 14, 30]; // box 0..5
  const prevBox = cur.box || 0;
  const box = known ? Math.min(prevBox+1, 5) : Math.max(prevBox-1, 0);
  const now = Date.now();
  const due = now + INTERVALS_DAYS[box]*24*60*60*1000;
  next.box = box;
  next.due = due;
  next.last = now;
  return { ...progress, [char]: next };
}

// Renvoie la liste des caractères "à réviser" (échus), triés par priorité (plus en retard d'abord)
function getDueForReview(kanaProgress, allChars){
  if(!kanaProgress) return [];
  const now = Date.now();
  const due = [];
  for(const c of (allChars||[])){
    const p = kanaProgress[c.k];
    if(!p) continue;                       // jamais vu → pas en révision (c'est de l'apprentissage)
    if((p.box||0) >= 5) continue;          // maîtrisé → plus besoin de réviser souvent
    if(p.due && p.due <= now){             // échu
      due.push({ ...c, _overdue: now - p.due, _box: p.box||0 });
    }
  }
  // Plus en retard d'abord, puis box le plus bas (le plus fragile)
  due.sort((a,b)=> (b._overdue - a._overdue) || (a._box - b._box));
  return due;
}

// Statistiques globales de maîtrise SRS
function srsStats(kanaProgress){
  const kp = kanaProgress || {};
  const vals = Object.values(kp);
  const now = Date.now();
  return {
    studied: vals.length,
    mastered: vals.filter(v=>(v.box||0)>=5).length,
    learning: vals.filter(v=>(v.box||0)>0 && (v.box||0)<5).length,
    due: vals.filter(v=>v.due && v.due<=now && (v.box||0)<5).length,
  };
}


// A char is "mastered" if known at least 3 times and success rate >= 70%
function isMastered(entry){
  if(!entry || entry.seen < 3) return false;
  return (entry.known / entry.seen) >= 0.7;
}
function deckMastery(progress, deck){
  let mastered = 0;
  deck.forEach(c=>{ if(isMastered(progress[c.k])) mastered++; });
  return { mastered, total: deck.length };
}


export {
  HIRAGANA,
  HIRAGANA_COMBO,
  HIRAGANA_DAKUTEN,
  KATAKANA,
  KATAKANA_COMBO,
  KATAKANA_DAKUTEN,
  LEARN_DECKS,
  deckMastery,
  getDueForReview,
  isMastered,
  loadKanaProgress,
  recordKana,
  saveKanaProgress,
  srsStats,
};
