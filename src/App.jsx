import DATA from "./japan-data.json";
import AUDIO_MANIFEST from "./audio-manifest.json";
import { useState, useEffect, useRef, useMemo } from "react";
import { supabase, supabaseEnabled, signUpEmail, signInEmail, signInGoogle, signOut, getSession, onAuthChange, fetchProgress, saveProgress, fetchTrips, saveTripsCloud, handleOAuthCallback } from "./supabase";
import { isNativePlatform, initRevenueCat, checkPremiumStatus, getOfferings, purchasePlan, restorePurchases, identifyUser, logoutRevenueCat } from "./purchases";

// ─── Themes ───────────────────────────────────────────────────────────────────
const LIGHT = {
  bg:"#FAF7F2", s1:"#FFFFFF", s2:"#F3EDE3", s3:"#EAE2D6",
  text:"#1C1410", t2:"#7A6858", t3:"#A89880",
  red:"#C9463D", gold:"#9E7A1A", green:"#3A6645", indigo:"#2E4374",
  border:"rgba(26,20,16,0.09)", navBg:"rgba(250,247,242,0.97)",
};
const DARK = {
  bg:"#0F0B08", s1:"#1A1410", s2:"#241C15", s3:"#2E231B",
  text:"#F0E6D3", t2:"#9C8A74", t3:"#5E4E3C",
  red:"#C9463D", gold:"#C9A84C", green:"#4E8060", indigo:"#6B82C4",
  border:"rgba(240,230,211,0.07)", navBg:"rgba(15,11,8,0.97)",
};

// Accent saisonnier dynamique (selon le mois réel)
function currentSeasonKey(date=new Date()){
  const m = date.getMonth(); // 0-11
  if(m>=2 && m<=4) return "printemps";
  if(m>=5 && m<=7) return "été";
  if(m>=8 && m<=10) return "automne";
  return "hiver";
}
// ─── Affichage du japonais selon le mode de script (kana par défaut) ───
// modes : "kana" (hiragana, défaut pédagogique) | "kanji" (japonais natif) | "romaji"
// Texte principal affiché en grand
function jpMain(entry, script, jpField="jp"){
  if(!entry) return "";
  const jp = entry[jpField] || entry.jp || "";
  if(script==="romaji") return entry.romaji || jp;
  if(script==="kana")   return entry.kana   || jp;  // si pas de kana, fallback kanji
  return jp;
}
// Texte secondaire (sous le principal) : on montre une autre forme utile
function jpSub(entry, script, jpField="jp"){
  if(!entry) return "";
  const jp = entry[jpField] || entry.jp || "";
  if(script==="romaji") return jp;                  // sous le romaji → le japonais
  if(script==="kana")   return entry.romaji || "";  // sous le kana → le romaji
  return entry.romaji || "";                        // sous le kanji → le romaji
}
const SEASON_ACCENT = {
  printemps:{accent:"#E08BA8", soft:"rgba(224,139,168,0.10)", emoji:"🌸", particle:"🌸", label:"Printemps"},
  "été":    {accent:"#3C9DC4", soft:"rgba(60,157,196,0.10)",  emoji:"🎐", particle:"💧", label:"Été"},
  automne:  {accent:"#C97D3C", soft:"rgba(201,125,60,0.10)",  emoji:"🍁", particle:"🍁", label:"Automne"},
  hiver:    {accent:"#7B9BB5", soft:"rgba(123,155,181,0.12)", emoji:"❄️", particle:"❄️", label:"Hiver"},
};

// ─── Static data ──────────────────────────────────────────────────────────────
// All content loaded from japan-data.json — no API calls needed

// Inline fallback data (mirrored from japan-data.json)
const FALLBACK = {
  expressions:[
    {expression:"いただきます",romaji:"Itadakimasu",traduction:"Je reçois humblement",contexte:"Dit avant chaque repas, ce mot exprime la gratitude envers tout ce qui a contribué à la nourriture — la nature, les agriculteurs, les cuisiniers. C'est bien plus qu'un simple 'bon appétit'.",exemple_jp:"さあ、食べましょう。いただきます！",exemple_fr:"Allez, mangeons. Itadakimasu !",emoji:"🍱"},
    {expression:"木漏れ日",romaji:"Komorebi",traduction:"Lumière filtrant à travers les feuilles",contexte:"Ce mot désigne ce moment visuel où la lumière du soleil se glisse entre les feuilles des arbres. Il n'existe aucun équivalent direct en français.",exemple_jp:"森の木漏れ日がとても美しい。",exemple_fr:"Le komorebi dans la forêt est vraiment magnifique.",emoji:"🌿"},
    {expression:"一期一会",romaji:"Ichigo ichie",traduction:"Une fois, une rencontre",contexte:"Philosophie du thé selon laquelle chaque rencontre est unique et ne se reproduira jamais exactement. Elle invite à être pleinement présent dans chaque moment partagé.",exemple_jp:"この出会いを一期一会として大切にしよう。",exemple_fr:"Chérissons cette rencontre comme un moment unique.",emoji:"🍵"},
    {expression:"仕方がない",romaji:"Shikata ga nai",traduction:"On n'y peut rien",contexte:"Expression de résilience tranquille face à ce qu'on ne peut changer. Ni résignation amère ni indifférence, mais une forme d'acceptation sereine et mature.",exemple_jp:"電車が遅れた。仕方がない、待つしかない。",exemple_fr:"Le train est en retard. On n'y peut rien, il faut attendre.",emoji:"🌊"},
    {expression:"もったいない",romaji:"Mottainai",traduction:"Quel gâchis",contexte:"Concept profond qui exprime le regret face au gaspillage. Il résume à lui seul une philosophie du respect des ressources, très ancrée dans la culture japonaise.",exemple_jp:"食べ物を捨てるなんて、もったいない！",exemple_fr:"Jeter de la nourriture, quel gâchis !",emoji:"♻️"},
    {expression:"懐かしい",romaji:"Natsukashii",traduction:"Nostalgie douce et chaleureuse",contexte:"Ce mot exprime la nostalgie positive, celle qui réchauffe le cœur en évoquant de bons souvenirs. Différent de la tristesse du passé, c'est une douce mélancolie.",exemple_jp:"この歌を聴くと懐かしい気持ちになる。",exemple_fr:"Cette chanson me donne un sentiment de douce nostalgie.",emoji:"🌸"},
    {expression:"間",romaji:"Ma",traduction:"L'intervalle, le vide porteur",contexte:"Concept esthétique qui valorise l'espace entre les choses — le silence entre deux notes, le vide dans une pièce, la pause dans une conversation. Le 'ma' n'est pas un manque, c'est une présence.",exemple_jp:"この部屋の間がとても心地よい。",exemple_fr:"Le 'ma' de cette pièce est très apaisant.",emoji:"🪷"},
    {expression:"縁",romaji:"En",traduction:"Destin, lien invisible entre les personnes",contexte:"Le concept d'en désigne les liens invisibles qui unissent les personnes — les rencontres, les relations, les hasards. Croire en l'en, c'est croire que les connexions ont un sens.",exemple_jp:"これも何かの縁ですね。",exemple_fr:"C'est sans doute un signe du destin.",emoji:"🔴"},
    {expression:"七転び八起き",romaji:"Nana korobi ya oki",traduction:"Tomber sept fois, se relever huit",contexte:"L'un des proverbes les plus célèbres du Japon, qui incarne l'esprit de résilience. Peu importe le nombre de chutes — ce qui compte, c'est de se relever à chaque fois.",exemple_jp:"七転び八起き、あきらめないで！",exemple_fr:"Tomber sept fois, se relever huit — n'abandonne pas !",emoji:"🌅"},
    {expression:"初心忘るべからず",romaji:"Shoshin wasuru bekarazu",traduction:"Ne jamais oublier l'esprit du débutant",contexte:"Enseignement zen fondamental : garder la fraîcheur et l'humilité du débutant, même après des années d'expérience. L'expert qui pense tout savoir ne peut plus rien apprendre.",exemple_jp:"初心忘るべからず — 常に謙虚でいること。",exemple_fr:"Ne jamais oublier l'esprit du débutant — rester toujours humble.",emoji:"🌱"},
  ],
  culture:[
    {titre:"Le konbini, temple de la vie quotidienne",contenu:"Les convenience stores japonais (7-Eleven, FamilyMart, Lawson) sont bien plus que des épiceries — on y paie ses factures, envoie des colis, imprime des documents, mange chaud à toute heure. Ouverts 24h/24, 365 jours par an.",insight:"Le konbini révèle l'obsession japonaise pour la commodité, la qualité et l'efficacité — même un onigiri emballé est une expérience gustative soignée.",tag:"Vie quotidienne",emoji:"🏪"},
    {titre:"Hanami : l'art de contempler les cerisiers",contenu:"Chaque printemps, le Japon est traversé par un 'front des cerisiers' suivi à la télévision comme une météo nationale. Des millions de Japonais s'installent sous les sakura pour pique-niquer et célébrer la beauté fugace des fleurs.",insight:"Hanami incarne le mono no aware : la beauté est d'autant plus précieuse qu'elle est éphémère. Les fleurs ne durent qu'une semaine — et c'est pour ça qu'on les chérit.",tag:"Traditions",emoji:"🌸"},
    {titre:"Honne et tatemae : la double vérité",contenu:"Au Japon, on distingue le honne (ses vrais sentiments) du tatemae (ce qu'on montre publiquement). Dire 'non' directement étant souvent impoli, on préférera 'c'est un peu difficile' pour exprimer un refus.",insight:"Cette dualité n'est pas de la malhonnêteté — c'est une forme de respect et d'harmonie sociale. Comprendre ce code est la clé pour vraiment communiquer au Japon.",tag:"Social",emoji:"🎭"},
    {titre:"Kintsugi : réparer avec de l'or",contenu:"Quand un objet en céramique se brise, le kintsugi consiste à recoller les morceaux avec de la laque dorée — rendant les fissures visibles et belles. L'objet réparé est considéré plus précieux qu'avant.",insight:"Le kintsugi est une philosophie de vie : nos blessures ne nous diminuent pas, elles nous forgent et nous rendent uniques.",tag:"Traditions",emoji:"🏺"},
    {titre:"Obon : la fête des ancêtres",contenu:"En août, pendant trois jours, les Japonais croient que les esprits de leurs ancêtres reviennent. On allume des lanternes pour les guider, on danse la Bon Odori en cercle, et on prépare leurs plats préférés sur l'autel familial.",insight:"Obon rappelle que la mort n'est pas une rupture définitive — les ancêtres restent présents, protecteurs, et méritent d'être honorés régulièrement.",tag:"Traditions",emoji:"🏮"},
    {titre:"Le shokunin : la philosophie du maître artisan",contenu:"Le shokunin est l'artisan qui consacre toute sa vie à maîtriser un unique savoir-faire — sculpter des sushis, fabriquer des couteaux. Ce chemin de perfection dure des décennies et est considéré comme un art de vivre.",insight:"Le concept de shokunin redéfinit le travail comme vocation — non pas pour gagner sa vie, mais pour honorer son art et servir autrui avec excellence.",tag:"Vie quotidienne",emoji:"🔪"},
    {titre:"La cérémonie du thé : le temps suspendu",contenu:"La cérémonie du thé (chado) suit des règles précises codifiées depuis des siècles : chaque geste est prescrit et répété jusqu'à devenir méditation en mouvement.",insight:"La cérémonie du thé est une façon de sortir du temps ordinaire : pendant une heure, rien n'existe que ce moment, ce bol, cet invité. Ichigo ichie.",tag:"Traditions",emoji:"🍵"},
    {titre:"Ikigai : la raison d'être",contenu:"L'ikigai ('raison de vivre') est l'intersection entre ce qu'on aime, ce en quoi on est doué, ce dont le monde a besoin, et ce pour quoi on peut être payé. Les habitants d'Okinawa attribuent leur longévité à un ikigai fort.",insight:"Trouver son ikigai n'est pas un luxe mais une nécessité vitale — les personnes ayant un ikigai fort vivent plus longtemps et en meilleure santé.",tag:"Vie quotidienne",emoji:"🌟"},
  ],
  repas:[
    {nom_jp:"おにぎり",romaji:"Onigiri",traduction:"Boule de riz",moment:"petit-déjeuner",description:"Triangle de riz blanc emballé dans une feuille de nori, fourré de saumon, thon mayo ou prune umeboshi. Disponible dans tout konbini japonais.",fun_fact:"L'emballage en trois parties du konbini onigiri est une invention géniale : on tire sur une languette et le nori reste croustillant jusqu'à la dernière seconde.",emoji:"🍙"},
    {nom_jp:"ラーメン",romaji:"Ramen",traduction:"Nouilles en bouillon",moment:"déjeuner",description:"Bol généreux de nouilles dans un bouillon riche — shoyu, miso, tonkotsu ou shio — garni de chashu, œuf mollet mariné, nori et ciboulette.",fun_fact:"À Sapporo, le ramen miso est né d'une erreur d'un chef qui tomba son riz dans la soupe — une heureuse improvisation devenue tradition.",emoji:"🍜"},
    {nom_jp:"寿司",romaji:"Sushi",traduction:"Riz vinaigré et garnitures",moment:"déjeuner",description:"Petites boulettes de riz assaisonné coiffées de poisson cru, crevettes ou tamago, à tremper délicatement dans la sauce soja avec une pointe de wasabi.",fun_fact:"Le sushi était à l'origine un mode de conservation : le poisson était fermenté plusieurs mois avec du riz. La version actuelle n'a que deux siècles.",emoji:"🍣"},
    {nom_jp:"たこ焼き",romaji:"Takoyaki",traduction:"Boulettes de pieuvre",moment:"goûter",description:"Petites boules de pâte croustillante farcies de morceaux de pieuvre, gingembre mariné et ciboule. Servies brûlantes couvertes de sauce, mayo et katsuobushi.",fun_fact:"À Osaka, le takoyaki est une obsession culturelle — les Osakiens possèdent souvent leur propre moule à la maison.",emoji:"🐙"},
    {nom_jp:"焼き鳥",romaji:"Yakitori",traduction:"Brochettes de poulet grillé",moment:"dîner",description:"Morceaux de poulet grillés sur charbon de bois (binchōtan), nappés de tare ou simplement salés. Servis dans les izakaya avec une bière.",fun_fact:"Le binchōtan est un charbon blanc très pur qui crée une chaleur infrarouge douce qui cuit le yakitori de l'intérieur sans le brûler.",emoji:"🍢"},
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickByLevel(arr, level) {
  // For expressions, spread randomly regardless of level for now
  return pick(arr);
}
// Deterministic hash from a string → 32-bit int (same string = same number)
function hashStr(str){
  let h = 2166136261;
  for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}
// Pick a stable item for a given day + category (same all day, changes at midnight)
function pickDaily(arr, dateKey, salt){
  if(!arr || arr.length===0) return null;
  const idx = hashStr(dateKey + ":" + salt) % arr.length;
  return arr[idx];
}

// Chaque centre d'intérêt → catégories de contenu privilégiées
const INTEREST_MAP = {
  anime:     {keys:["culture"],            label:"Anime & Manga",  emoji:"⛩️"},
  voyage:    {keys:["regions","vie_quotidienne","traditions"], label:"Voyage", emoji:"✈️"},
  culture:   {keys:["culture","traditions"],        label:"Culture & Art",  emoji:"🎋"},
  langue:    {keys:["expressions","situations"],    label:"Langue",         emoji:"🈶"},
  lifestyle: {keys:["vie_quotidienne","culture"],   label:"Lifestyle",      emoji:"🍵"},
  gastro:    {keys:["repas"],                       label:"Gastronomie",    emoji:"🍣"},
};
// Construit une recommandation personnalisée (1 item) selon les intérêts de l'user
function recommendForUser(db, why, today){
  if(!db || !why || why.length===0) return null;
  // Rassemble les catégories pertinentes
  const cats = [...new Set(why.flatMap(w => INTEREST_MAP[w]?.keys || []))].filter(k => db[k]?.length);
  if(cats.length===0) return null;
  // Choisit une catégorie du jour (déterministe), puis un item du jour dedans
  const cat = cats[hashStr(today+":reco-cat") % cats.length];
  const item = pickDaily(db[cat], today, "reco-item");
  if(!item) return null;
  return { cat, item };
}

const JP_MONTHS = ["睦月","如月","弥生","卯月","皐月","水無月","文月","葉月","長月","神無月","霜月","師走"];
const JP_DAYS   = ["日","月","火","水","木","金","土"];
function getJPDate() {
  const d = new Date();
  return {month:JP_MONTHS[d.getMonth()],day:d.getDate(),weekday:JP_DAYS[d.getDay()],hour:d.getHours()};
}
function greet(hour,name) {
  const s = name ? `、${name}` : "";
  if(hour<12) return {jp:`おはようございます${s}`,fr:`Bonjour${name?", "+name:""}`};
  if(hour<18) return {jp:`こんにちは${s}`,fr:"Bon après-midi"};
  return {jp:`こんばんは${s}`,fr:`Bonsoir${name?", "+name:""}`};
}

// ─── Onboarding data ──────────────────────────────────────────────────────────
const WHY    = [{id:"anime",label:"Anime & Manga",emoji:"⛩️"},{id:"voyage",label:"Voyager au Japon",emoji:"✈️"},{id:"culture",label:"Culture & Art",emoji:"🎋"},{id:"langue",label:"Apprendre le japonais",emoji:"🈶"},{id:"lifestyle",label:"Lifestyle japonais",emoji:"🍵"},{id:"gastro",label:"Gastronomie",emoji:"🍣"}];
const GOALS  = [{id:"travel",label:"Préparer un voyage",emoji:"🗾"},{id:"live",label:"Vivre au Japon",emoji:"🏯"},{id:"learn",label:"Apprendre la langue",emoji:"📚"},{id:"imm",label:"Immersion culturelle",emoji:"🌸"}];
const LEVELS = [{id:"beginner",label:"Débutant",sub:"Je découvre le Japon",emoji:"🌱"},{id:"intermediate",label:"Intermédiaire",sub:"Je connais les bases",emoji:"🌿"},{id:"advanced",label:"Avancé",sub:"Je maîtrise l'essentiel",emoji:"🎍"}];
// Achievements réels — chaque badge a une condition basée sur l'activité de l'user
// check(ctx) reçoit { streak, xp, unlocks, scenProgress, kanaProgress, favs }
const ACHIEVEMENTS = [
  {id:"first_day",  emoji:"🌸", label:"Premier jour",      desc:"Lance l'app pour la première fois",        check:()=>true},
  {id:"streak3",    emoji:"🔥", label:"En route",           desc:"Atteins 3 jours de streak",                check:c=>(c.streak?.count||0)>=3 || (c.streak?.best||0)>=3},
  {id:"streak7",    emoji:"⚡", label:"Régulier",           desc:"Atteins 7 jours de streak",                check:c=>(c.streak?.count||0)>=7 || (c.streak?.best||0)>=7},
  {id:"streak30",   emoji:"🏯", label:"Inébranlable",       desc:"Atteins 30 jours de streak",               check:c=>(c.streak?.best||0)>=30},
  {id:"first_day2", emoji:"✨", label:"Première étincelle", desc:"Commence ton aventure",                    check:c=>(c.streak?.count||0)>=1},
  {id:"unlock1",    emoji:"🗝️", label:"Explorateur",        desc:"Débloque une catégorie",                   check:c=>Object.values(c.unlocks||{}).filter(Boolean).length>=2},
  {id:"unlock_all", emoji:"🗾", label:"Tout vu",            desc:"Débloque toutes les catégories",           check:c=>["traditions","vie_quotidienne","codes_sociaux","regions"].every(k=>c.unlocks?.[k])},
  {id:"scen1",      emoji:"🗣️", label:"Premier dialogue",   desc:"Réussis ton premier scénario",             check:c=>(c.scenProgress?.done?.length||0)>=1},
  {id:"scen_all",   emoji:"🎭", label:"Acteur né",          desc:"Réussis tous les scénarios",               check:c=>(c.scenProgress?.done?.length||0)>=4},
  {id:"kana10",     emoji:"🎴", label:"Apprenti lecteur",   desc:"Maîtrise 10 caractères kana",              check:c=>kanaMastered(c.kanaProgress)>=10},
  {id:"kana_hira",  emoji:"📜", label:"Maître hiragana",    desc:"Maîtrise tout l'hiragana",                 check:c=>kanaMasteredIn(c.kanaProgress,"hira")>=46},
  {id:"kana_kata",  emoji:"📖", label:"Maître katakana",    desc:"Maîtrise tout le katakana",                check:c=>kanaMasteredIn(c.kanaProgress,"kata")>=46},
  {id:"fav5",       emoji:"❤️", label:"Collectionneur",     desc:"Ajoute 5 favoris",                         check:c=>(c.favs?.length||0)>=5},
  {id:"day14",      emoji:"🧭", label:"Connaisseur",        desc:"Atteins 14 jours de streak",              check:c=>(c.streak?.count||0)>=14||(c.streak?.best||0)>=14},
  {id:"day30",      emoji:"🎌", label:"Maître du Japon",    desc:"Atteins 30 jours de streak",              check:c=>(c.streak?.count||0)>=30||(c.streak?.best||0)>=30},
  {id:"tokyo_ready",emoji:"🗼", label:"Prêt pour Tokyo",     desc:"Termine le parcours « Survivre à Tokyo »", check:c=>(c.pathProgress?.completed?.length||0)>=8},
];
// Helpers de comptage kana (dépendent de HIRAGANA/KATAKANA définis plus bas)
function kanaMastered(kp){
  if(!kp) return 0;
  return Object.values(kp).filter(v=>(v?.known||0)>=2).length;
}
function kanaMasteredIn(kp, which){
  if(!kp) return 0;
  const deck = which==="hira" ? HIRAGANA : KATAKANA;
  if(!deck) return 0;
  return deck.filter(c=>(kp[c.k]?.known||0)>=2).length;
}
function computeAchievements(ctx){
  return ACHIEVEMENTS.map(a=>({ ...a, unlocked: !!a.check(ctx) }));
}
// Explorer — 3 sections organisées
const EXPLORE_SECTIONS = [
  {
    id:"traditions_section", label:"Traditions & Coutumes", emoji:"🌸", jp:"伝統",
    mods:[
      {emoji:"⛩️", title:"Traditions saisonnières", sub:"Hanami, Obon, Hatsumōde, matsuri…", route:"traditions", cat:"traditions", filter:"saison"},
      {emoji:"🏮", title:"Coutumes du quotidien",   sub:"Itadakimasu, konbini, ojigi, furin…", route:"traditions", cat:"traditions", filter:"quotidien"},
    ]
  },
  {
    id:"culture_section", label:"Société & Régions", emoji:"🗾", jp:"文化",
    mods:[
      {emoji:"🏙️", title:"Vie quotidienne",  sub:"Konbini, école, travail, sento",     route:"vie",    cat:"vie_quotidienne"},
      {emoji:"🤫", title:"Codes sociaux",    sub:"Honne, tatemae, hiérarchie, groupes", route:"codes",  cat:"codes_sociaux"},
      {emoji:"🗾", title:"Régions du Japon", sub:"Tokyo, Osaka, Kyoto, Okinawa",        route:"regions",cat:"regions"},
    ]
  },
  {
    id:"histoire_section", label:"Histoire", emoji:"📜", jp:"歴史",
    mods:[
      {emoji:"📜", title:"Histoire du Japon", sub:"Jōmon, Heian, Edo, Meiji… 8 grandes périodes", route:"histoire", cat:"histoire"},
    ]
  },
];
const SCENS  = [{emoji:"🍜",title:"Au restaurant",diff:"Débutant",color:"#3A6645"},{emoji:"🏪",title:"Au konbini",diff:"Débutant",color:"#3A6645"},{emoji:"🚉",title:"Gare / Transports",diff:"Intermédiaire",color:"#9E7A1A"},{emoji:"🤝",title:"Rencontre sociale",diff:"Intermédiaire",color:"#9E7A1A"},{emoji:"💼",title:"En entreprise",diff:"Avancé",color:"#C9463D"}];
const LEARN_S = [{emoji:"💬",title:"Expressions utiles",sub:"Restaurants, trains, shopping"},{emoji:"👂",title:"Prononciation audio",sub:"Voix natives, écoute lente"},{emoji:"🔤",title:"Kana & Kanji",sub:"Reconnaissance, lecture pratique"},{emoji:"🧠",title:"Révision intelligente",sub:"Spaced repetition adaptatif"}];

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@200;300;400&family=Noto+Sans+JP:wght@300;400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
::-webkit-scrollbar{width:0;height:0;}
input{font-family:inherit;padding:12px 16px;width:100%;outline:none;border-radius:10px;font-size:14px;}
button{font-family:inherit;}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{opacity:.3}50%{opacity:.65}}
@keyframes glow{0%,100%{box-shadow:0 0 8px rgba(201,70,61,.18)}50%{box-shadow:0 0 20px rgba(201,70,61,.42)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes slideUp{from{transform:translateX(-50%) translateY(100%)}to{transform:translateX(-50%) translateY(0)}}
@keyframes popIn{from{opacity:0;transform:translate(-50%,-50%) scale(.85)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@keyframes fall{0%{transform:translateY(-20px) rotate(0);opacity:0}10%{opacity:1}100%{transform:translateY(420px) rotate(540deg);opacity:0}}
@keyframes drawReveal{0%{opacity:0;clip-path:inset(0 100% 0 0)}30%{opacity:.9}100%{opacity:.9;clip-path:inset(0 0 0 0)}}
@keyframes p1{0%{transform:translateY(-10px) rotate(0);opacity:0}10%{opacity:.55}90%{opacity:.2}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}
@keyframes p2{0%{transform:translateY(-10px) translateX(0) rotate(0);opacity:0}10%{opacity:.4}100%{transform:translateY(110vh) translateX(38px) rotate(-540deg);opacity:0}}
@keyframes floatDown{0%{transform:translateY(-20px) translateX(0) rotate(0);opacity:0}10%{opacity:.5}90%{opacity:.3}100%{transform:translateY(108vh) translateX(20px) rotate(360deg);opacity:0}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
/* ── Animations dynamiques & ludiques ── */
@keyframes bounceIn{0%{opacity:0;transform:scale(.3)}50%{opacity:1;transform:scale(1.08)}70%{transform:scale(.96)}100%{transform:scale(1)}}
@keyframes popBounce{0%{transform:translate(-50%,-50%) scale(.5);opacity:0}55%{transform:translate(-50%,-50%) scale(1.06);opacity:1}75%{transform:translate(-50%,-50%) scale(.97)}100%{transform:translate(-50%,-50%) scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}
@keyframes wobble{0%,100%{transform:rotate(0)}25%{transform:rotate(-3deg)}75%{transform:rotate(3deg)}}
@keyframes heartbeat{0%,100%{transform:scale(1)}15%{transform:scale(1.15)}30%{transform:scale(1)}45%{transform:scale(1.1)}60%{transform:scale(1)}}
@keyframes flameFlicker{0%,100%{transform:scale(1) rotate(-2deg);filter:brightness(1)}50%{transform:scale(1.12) rotate(2deg);filter:brightness(1.25)}}
@keyframes slideInUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes bubbleIn{0%{opacity:0;transform:translateY(34px) scale(.92)}60%{opacity:1;transform:translateY(-4px) scale(1.02)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes slideInRight{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
@keyframes zoomBadge{0%{transform:scale(0) rotate(-180deg);opacity:0}60%{transform:scale(1.15) rotate(10deg);opacity:1}100%{transform:scale(1) rotate(0)}}
@keyframes ring{0%{box-shadow:0 0 0 0 rgba(201,70,61,.5)}70%{box-shadow:0 0 0 14px rgba(201,70,61,0)}100%{box-shadow:0 0 0 0 rgba(201,70,61,0)}}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes countUp{0%{transform:translateY(8px) scale(.8);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}
@keyframes toastUp{0%{transform:translateX(-50%) translateY(40px) scale(.8);opacity:0}55%{transform:translateX(-50%) translateY(-4px) scale(1.04);opacity:1}100%{transform:translateX(-50%) translateY(0) scale(1)}}
.lift{transition:transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease;}
.lift:active{transform:scale(.96);}
@media(hover:hover){.lift:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,0.12);}}
/* Classes ludiques réutilisables */
.pop-press{transition:transform .15s cubic-bezier(.34,1.56,.64,1);}
.pop-press:active{transform:scale(.9);}
.screen-in{animation:slideInUp .35s cubic-bezier(.22,1,.36,1) both;}
.float-y{animation:floatY 3s ease-in-out infinite;}
.stagger>*{animation:fadeUp .5s ease both;}
.stagger>*:nth-child(1){animation-delay:.04s}.stagger>*:nth-child(2){animation-delay:.10s}.stagger>*:nth-child(3){animation-delay:.16s}.stagger>*:nth-child(4){animation-delay:.22s}.stagger>*:nth-child(5){animation-delay:.28s}.stagger>*:nth-child(6){animation-delay:.34s}.stagger>*:nth-child(7){animation-delay:.40s}.stagger>*:nth-child(8){animation-delay:.46s}
`;

// Particules saisonnières flottantes (pétales, flocons, gouttes, feuilles)
function SeasonParticles({season}){
  const conf = SEASON_ACCENT[season] || SEASON_ACCENT.printemps;
  const isEmoji = season!=="printemps"; // printemps = forme CSS, autres = emoji léger
  return(
    <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:0}}>
      {Array.from({length:8},(_,i)=>(
        isEmoji
          ? <div key={i} style={{position:"absolute",top:"-24px",left:`${6+i*12}%`,fontSize:10+i%3*3,opacity:0.5,animation:`floatDown ${9+i*1.2}s ${i*0.9}s infinite linear`}}>{conf.particle}</div>
          : <div key={i} style={{position:"absolute",top:"-20px",left:`${8+i*12}%`,width:6+i%3*2,height:6+i%3*2,borderRadius:"50% 0 50% 0",background:conf.accent,opacity:0.4,animation:`${i%2?"p1":"p2"} ${7+i}s ${i*.8}s infinite linear`}}/>
      ))}
    </div>
  );
}

function Petals() {
  return(
    <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:0}}>
      {Array.from({length:7},(_,i)=>(
        <div key={i} style={{position:"absolute",top:"-20px",left:`${8+i*13}%`,width:6+i%3*2,height:6+i%3*2,borderRadius:"50% 0 50% 0",background:"rgba(201,70,61,.28)",animation:`${i%2?"p1":"p2"} ${6+i}s ${i*.8}s infinite linear`}}/>
      ))}
    </div>
  );
}

// ─── Reusable primitives ─────────────────────────────────────────────────────
function SH({C,kanji,title,sub,onRefresh}){
  return(
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:13,marginTop:8}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:24,fontFamily:"'Noto Serif JP',serif",fontWeight:200,color:C.red,lineHeight:1}}>{kanji}</div>
        <div>
          <div style={{fontSize:14,fontWeight:500,color:C.text,lineHeight:1.2}}>{title}</div>
          <div style={{fontSize:10,color:C.t3,letterSpacing:".1em",marginTop:1}}>{sub}</div>
        </div>
      </div>
      {onRefresh&&(
        <button onClick={onRefresh} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:20,padding:"4px 12px",color:C.t2,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
          <span style={{fontSize:12}}>↻</span> Découvrir
        </button>
      )}
    </div>
  );
}

// ─── Wiki system ──────────────────────────────────────────────────────────────
function buildWikiMap(wiki) {
  if (!wiki) return {};
  const map = {};
  wiki.forEach(e => { map[e.mot.toLowerCase()] = e; });
  return map;
}

// Category colors
const WIKI_COLORS = {
  Gastronomie:"#3A6645", Lieux:"#5B9BD5", Société:"#C9463D",
  Culture:"#8B6FB0", Traditions:"#C4956A", Arts:"#9E7A1A",
  Nature:"#4E8060", "Vie quotidienne":"#7B9BB5",
};

// Bottom-sheet wiki panel
function WikiPanel({C, entry, onClose, script}) {
  if (!entry) return null;
  const color = WIKI_COLORS[entry.categorie] || C.red;
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,backdropFilter:"blur(2px)"}}/>
      {/* Sheet */}
      <div style={{
        position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
        width:"min(100vw,390px)", zIndex:201,
        background:C.s1, borderRadius:"20px 20px 0 0",
        padding:"0 22px 40px", animation:"slideUp .25s ease",
        boxShadow:"0 -4px 40px rgba(0,0,0,0.25)"
      }}>
        {/* Handle */}
        <div style={{width:36,height:4,borderRadius:2,background:C.s3,margin:"12px auto 18px"}}/>
        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14}}>
          <div>
            <div style={{fontSize:26,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:2}}>{jpMain(entry, script)}</div>
            <div style={{fontSize:12,color:color,fontStyle:"italic",marginBottom:2}}>{jpSub(entry, script)}</div>
            <div style={{fontSize:16,fontWeight:500,color:C.text}}>{entry.mot}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:9,padding:"4px 10px",background:`${color}18`,border:`1px solid ${color}44`,borderRadius:20,color,letterSpacing:".1em"}}>{entry.categorie}</span>
            <SpeakButton C={C} text={entry.jp} color={color} size={34}/>
          </div>
        </div>
        {/* Divider */}
        <div style={{height:1,background:C.border,marginBottom:14}}/>
        {/* Image (Wikimedia Commons) si disponible */}
        {entry.image && (
          <div style={{marginBottom:14}}>
            <img src={entry.image} alt={entry.mot} loading="lazy"
              style={{width:"100%",height:180,objectFit:"cover",borderRadius:12,display:"block",background:C.s2}}
              onError={(e)=>{ e.target.parentNode.style.display="none"; }}/>
            {(entry.author || entry.licence) && (
              <div style={{fontSize:9,color:C.t3,marginTop:5,textAlign:"right"}}>
                {entry.author && `Photo : ${entry.author}`}{entry.author && entry.licence && " · "}{entry.licence && `${entry.licence}`} · Wikimedia Commons
              </div>
            )}
          </div>
        )}
        {/* Definition */}
        <p style={{fontSize:14,color:C.t2,lineHeight:1.8,margin:0}}>{entry.definition}</p>
        {/* Close */}
        <button onClick={onClose} style={{marginTop:20,width:"100%",padding:"12px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:13,cursor:"pointer"}}>
          Fermer
        </button>
      </div>
    </>
  );
}

// WikiText: renders text with wiki terms highlighted and tapable
// ─── Audio (synthèse vocale japonaise) ────────────────────────────────────────
let _currentAudio = null;
// Partage via l'API native (mobile) avec repli sur copie presse-papier
async function shareContent(text){
  try {
    if(navigator.share){ await navigator.share({ text }); return; }
  } catch(e){ /* user cancelled or unsupported */ return; }
  try {
    await navigator.clipboard.writeText(text);
    alert("Copié dans le presse-papier ! Tu peux le coller où tu veux.");
  } catch(e){}
}
function speakJP(text){
  if(!text) return;
  // 1) Prefer the pre-generated high-quality MP3 if available
  const file = AUDIO_MANIFEST[text.trim()];
  if(file){
    try {
      if(_currentAudio){ _currentAudio.pause(); _currentAudio = null; }
      _currentAudio = new Audio("/" + file);
      _currentAudio.play().catch(()=> browserSpeak(text)); // fallback if play fails
      return;
    } catch(e){ /* fall through */ }
  }
  // 2) Fallback: browser speech synthesis (dev / missing file)
  browserSpeak(text);
}
function browserSpeak(text){
  try {
    if(!window.speechSynthesis || !text) return;
    const speak = ()=>{
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = 0.85;
      u.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const jp = voices.find(v=>v.lang==="ja-JP") || voices.find(v=>v.lang?.toLowerCase().startsWith("ja"));
      if(jp) u.voice = jp;
      window.speechSynthesis.speak(u);
    };
    const voices = window.speechSynthesis.getVoices();
    if(voices && voices.length){
      speak();
    } else {
      // Les voix se chargent de façon asynchrone sur certains navigateurs (iOS, Chrome)
      window.speechSynthesis.onvoiceschanged = ()=>{ speak(); window.speechSynthesis.onvoiceschanged = null; };
      // Filet de sécurité : tente quand même après un court délai
      setTimeout(speak, 250);
    }
  } catch(e){}
}

function SpeakButton({C, text, size=30, color}){
  const [playing,setPlaying] = useState(false);
  if(!text) return null;
  const col = color || C.red;
  const onClick = (e)=>{
    e.stopPropagation();
    speakJP(text);
    setPlaying(true);
    setTimeout(()=>setPlaying(false), 900);
  };
  const s = size; // total button size
  const r = s/2;  // circle radius
  return(
    <button onClick={onClick} aria-label="Écouter la prononciation" style={{
      width:s, height:s, borderRadius:"50%", flexShrink:0, cursor:"pointer",
      background: playing ? `rgba(201,70,61,0.18)` : `rgba(201,70,61,0.08)`,
      border:`1px solid ${playing ? "rgba(201,70,61,0.5)" : "rgba(201,70,61,0.22)"}`,
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      padding:0, transition:"all .2s", transform: playing ? "scale(1.12)" : "scale(1)",
    }}>
      <svg width={s*0.58} height={s*0.58} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Speaker body */}
        <rect x="2" y="7.5" width="5" height="7" rx="1.2" fill={col} opacity={playing?1:0.85}/>
        {/* Speaker cone */}
        <path d="M7 7L13 3V19L7 15" fill={col} opacity={playing?1:0.85}/>
        {/* Wave 1 */}
        <path d="M15.5 8.5 Q18.5 11 15.5 13.5" stroke={col} strokeWidth="1.7" strokeLinecap="round"
          opacity={playing ? 1 : 0.7}
          style={{transition:"opacity .2s"}}
        />
        {/* Wave 2 */}
        <path d="M17.5 6 Q22.5 11 17.5 16" stroke={col} strokeWidth="1.5" strokeLinecap="round"
          opacity={playing ? 0.75 : 0.4}
          style={{transition:"opacity .2s"}}
        />
      </svg>
    </button>
  );
}

function FavButton({C,active,onClick}){
  return(
    <button onClick={onClick} aria-label="Sauvegarder" style={{
      background:active?"rgba(201,70,61,0.12)":"transparent",
      border:`1px solid ${active?"rgba(201,70,61,0.35)":C.border}`,
      borderRadius:20, width:30, height:30, cursor:"pointer", flexShrink:0,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:14, lineHeight:1, transition:"all .2s", padding:0
    }}>
      <span style={{color:active?C.red:C.t3}}>{active?"♥":"♡"}</span>
    </button>
  );
}

function ExprCard({C,data,fav,onFav,wikiMap,onWikiTap,script}){
  if(!data) return null;
  const wt = (text,style) => <WikiText C={C} text={text} style={style} wikiMap={wikiMap} onWikiTap={onWikiTap}/>;
  return(
    <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:18,animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:10,color:C.gold,letterSpacing:".2em",textTransform:"uppercase"}}>表現 · Expression du jour {data.emoji}</div>
        {onFav&&<FavButton C={C} active={fav} onClick={onFav}/>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
        <div style={{fontSize:34,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,lineHeight:1.2}}>{jpMain(data, script, "expression")}</div>
        <SpeakButton C={C} text={data.expression} color={C.gold} size={34}/>
      </div>
      <div style={{fontSize:12,color:C.gold,fontStyle:"italic",marginBottom:3}}>{data.romaji}</div>
      <div style={{fontSize:14,color:C.t2,fontWeight:500,marginBottom:13}}>{data.traduction}</div>
      <div style={{fontSize:13,color:C.t2,lineHeight:1.78,marginBottom:13}}>{wt(data.contexte)}</div>
      <div style={{padding:"11px 13px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8}}>
        <div style={{fontSize:9,color:C.gold,letterSpacing:".18em",marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}>EXEMPLE <SpeakButton C={C} text={data.exemple_jp} color={C.gold} size={26}/></div>
        <div style={{fontSize:13,color:C.text,marginBottom:3}}>{data.exemple_jp}</div>
        <div style={{fontSize:11,color:C.t3,fontStyle:"italic"}}>{data.exemple_fr}</div>
      </div>
    </div>
  );
}

function CultCard({C,data,fav,onFav,wikiMap,onWikiTap}){
  if(!data) return null;
  const wt = (text,style) => <WikiText C={C} text={text} style={style} wikiMap={wikiMap} onWikiTap={onWikiTap}/>;
  return(
    <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:18,animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:11}}>
        <div style={{fontSize:10,color:C.red,letterSpacing:".2em",textTransform:"uppercase"}}>文化 · Culture {data.emoji}</div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <span style={{fontSize:9,padding:"3px 8px",background:`rgba(201,70,61,0.07)`,border:`1px solid rgba(201,70,61,0.2)`,borderRadius:20,color:C.red,whiteSpace:"nowrap"}}>{data.tag}</span>
          {onFav&&<FavButton C={C} active={fav} onClick={onFav}/>}
        </div>
      </div>
      <div style={{fontSize:17,fontFamily:"'Noto Serif JP',serif",color:C.text,marginBottom:11,lineHeight:1.45}}>{data.titre}</div>
      <p style={{fontSize:13,color:C.t2,lineHeight:1.82,marginBottom:13}}>{wt(data.contenu)}</p>
      <div style={{padding:"11px 13px",background:C.s2,borderLeft:`3px solid ${C.red}`,borderRadius:"0 7px 7px 0"}}>
        <div style={{fontSize:9,color:C.red,letterSpacing:".18em",marginBottom:4}}>À RETENIR</div>
        <p style={{fontSize:12,color:C.t2,lineHeight:1.65,margin:0,fontStyle:"italic"}}>{wt(data.insight)}</p>
      </div>
    </div>
  );
}

function RepasCard({C,data,fav,onFav,wikiMap,onWikiTap,script}){
  if(!data) return null;
  const wt=(text,style)=><WikiText C={C} text={text} style={style} wikiMap={wikiMap} onWikiTap={onWikiTap}/>;
  return(
    <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:18,animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
        <div style={{fontSize:10,color:C.green,letterSpacing:".2em",textTransform:"uppercase"}}>🍱 Repas · {data.moment}</div>
        {onFav&&<FavButton C={C} active={fav} onClick={onFav}/>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
        <div style={{fontSize:32,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,lineHeight:1.2}}>{jpMain(data, script, "nom_jp")} {data.emoji}</div>
        <SpeakButton C={C} text={data.nom_jp} color={C.green} size={30}/>
      </div>
      <div style={{fontSize:12,color:C.green,fontStyle:"italic",marginBottom:11}}>{data.romaji} — {data.traduction}</div>
      <p style={{fontSize:13,color:C.t2,lineHeight:1.8,marginBottom:12}}>{wt(data.description)}</p>
      <div style={{padding:"11px 13px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{fontSize:15,flexShrink:0}}>💡</span>
        <p style={{fontSize:12,color:C.t2,margin:0,lineHeight:1.6,fontStyle:"italic"}}>{wt(data.fun_fact)}</p>
      </div>
    </div>
  );
}

function StreakSection({C,streak,isPremium}){
  const count = streak?.count || 0;
  const best  = streak?.best  || 0;
  const freezes = streak?.freezes || 0;
  const dow=new Date().getDay(), todayIdx=dow===0?6:dow-1;
  const days=["L","M","M","J","V","S","D"];

  // Prochain DÉBLOCAGE de contenu (bien plus motivant qu'un jalon abstrait)
  const nextUnlock = UNLOCK_SCHEDULE.find(u=>u.day>count);
  const nextGoal = nextUnlock ? nextUnlock.day : (count || 1);
  const prevUnlockDay = [...UNLOCK_SCHEDULE].reverse().find(u=>u.day<=count)?.day || 0;
  const progress = nextUnlock ? Math.min((count-prevUnlockDay)/(nextGoal-prevUnlockDay),1) : 1;

  return(
    <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:18,animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <div style={{fontSize:10,color:C.t3,letterSpacing:".2em",marginBottom:5,textTransform:"uppercase"}}>Streak actuel</div>
          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
            <span style={{fontSize:42,fontWeight:500,color:C.text,fontFamily:"'Noto Serif JP',serif",lineHeight:1}}>{count}</span>
            <span style={{fontSize:13,color:C.t2}}>jour{count>1?"s":""}</span>
          </div>
          <div style={{fontSize:11,color:C.t3,marginTop:3}}>
            {isPremium ? "✨ Premium — tout débloqué" : nextUnlock ? `Bientôt : ${nextUnlock.emoji} ${nextUnlock.label}` : "Tout débloqué ! 🎉"}
          </div>
        </div>
        <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(201,70,61,0.08)",border:"1.5px solid rgba(201,70,61,0.22)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:count>0?"glow 2.5s ease infinite":"none"}}>
          <span style={{fontSize:22}}>🔥</span>
        </div>
      </div>
      {!isPremium && nextUnlock && <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:10,color:C.t3}}>{nextUnlock.emoji} {nextUnlock.label} au jour {nextGoal}</span>
          <span style={{fontSize:11,color:C.red,fontWeight:500}}>{count} / {nextGoal}</span>
        </div>
        <div style={{height:4,background:C.s3,borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${progress*100}%`,background:C.red,borderRadius:2,transition:"width .5s ease"}}/>
        </div>
      </div>}
      {/* Weekly view — fill the last `count` days up to today */}
      <div style={{display:"flex",gap:5,justifyContent:"space-between",marginBottom:18}}>
        {days.map((lbl,i)=>{
          const isToday=i===todayIdx;
          // a past day this week is "done" if it's within the current streak window
          const daysAgo = todayIdx - i;
          const done = daysAgo>0 && daysAgo < count;
          return(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{fontSize:9,color:C.t3}}>{lbl}</div>
              <div style={{width:"100%",maxWidth:34,aspectRatio:"1",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:isToday?C.red:done?"rgba(201,70,61,0.1)":C.s2,border:`1px solid ${isToday?"transparent":done?"rgba(201,70,61,0.22)":C.border}`,fontSize:11}}>
                {done&&<span style={{color:C.red}}>✓</span>}
                {isToday&&<span style={{color:"#fff",fontSize:14}}>🔥</span>}
              </div>
            </div>
          );
        })}
      </div>
      {/* Best streak record + jokers */}
      <div style={{paddingTop:14,borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>🏆</span>
          <span style={{fontSize:12,color:C.t2}}>Meilleur : <b style={{color:C.text}}>{best}j</b></span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 11px",background:"rgba(90,184,232,0.08)",border:"1px solid rgba(90,184,232,0.25)",borderRadius:16}} title="Un joker protège ton streak si tu rates un jour">
          <span style={{fontSize:14}}>🧊</span>
          <span style={{fontSize:12,color:C.text,fontWeight:600}}>{freezes} joker{freezes>1?"s":""}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Wiki engine ──────────────────────────────────────────────────────────────
// Split text into segments, marking known wiki terms as tapable
// Détecte si une chaîne contient des caractères japonais (kana/kanji)
function hasJapanese(str){
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(str);
}

// Test unique : le navigateur supporte-t-il le lookbehind regex ?
let _lookbehindOK = null;
function supportsLookbehind(){
  if(_lookbehindOK !== null) return _lookbehindOK;
  try { new RegExp("(?<!x)y"); _lookbehindOK = true; }
  catch { _lookbehindOK = false; }
  return _lookbehindOK;
}

function parseWikiText(text, wikiMap){
  if (!text || !wikiMap || Object.keys(wikiMap).length === 0)
    return [{type:"text", value:text}];
  const triggers = Object.keys(wikiMap).sort((a,b)=>b.length-a.length);

  // Deux familles de termes, traitées différemment :
  //  - LATINS : encadrés de frontières (évite "ma" dans "amants", "wa" dans "wagon")
  //  - JAPONAIS : match direct (la notion de frontière de mot regex ne s'applique pas)
  const L = "A-Za-zÀ-ÖØ-öø-ÿ";
  const latinTerms = [], jpTerms = [];
  triggers.forEach(w=>{
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    if(hasJapanese(w)) jpTerms.push(esc); else latinTerms.push(esc);
  });

  const groups = [];
  if(supportsLookbehind()){
    // Chemin moderne : frontières propres via lookarounds
    if(latinTerms.length) groups.push(`(?<![${L}])(?:${latinTerms.join("|")})(?![${L}])`);
    if(jpTerms.length)    groups.push(`(?:${jpTerms.join("|")})`);
    if(!groups.length) return [{type:"text", value:text}];
    const pattern = new RegExp(`(${groups.join("|")})`, "gi");
    const parts = text.split(pattern);
    return parts.filter(p => p !== "" && p !== undefined).map(part => {
      const entry = wikiMap[part.toLowerCase()] || wikiMap[part];
      return entry ? {type:"wiki", value:part, term:entry} : {type:"text", value:part};
    });
  }

  // Fallback sans lookbehind (vieux Safari) : on scanne manuellement
  // en vérifiant les frontières latines à la main.
  const allTerms = [...latinTerms, ...jpTerms];
  if(!allTerms.length) return [{type:"text", value:text}];
  const pattern = new RegExp(`(${allTerms.join("|")})`, "gi");
  const out = [];
  let last = 0, m;
  pattern.lastIndex = 0;
  const isLetter = (ch)=> ch && new RegExp(`[${L}]`).test(ch);
  while((m = pattern.exec(text)) !== null){
    const matched = m[0];
    const start = m.index, end = start + matched.length;
    // Si terme latin, vérifier les frontières manuellement
    if(!hasJapanese(matched)){
      const before = text[start-1], after = text[end];
      if(isLetter(before) || isLetter(after)){
        if(pattern.lastIndex === m.index) pattern.lastIndex++;
        continue; // frontière invalide → on ignore ce match
      }
    }
    if(start > last) out.push({type:"text", value:text.slice(last,start)});
    const entry = wikiMap[matched.toLowerCase()] || wikiMap[matched];
    out.push(entry ? {type:"wiki", value:matched, term:entry} : {type:"text", value:matched});
    last = end;
    if(pattern.lastIndex === m.index) pattern.lastIndex++;
  }
  if(last < text.length) out.push({type:"text", value:text.slice(last)});
  return out.length ? out : [{type:"text", value:text}];
}

function WikiText({C, text, style, wikiMap, onWikiTap}){
  if (!wikiMap || !text || typeof text !== "string") return <span style={style}>{text}</span>;
  const segments = parseWikiText(text, wikiMap);
  return (
    <span style={style}>
      {segments.map((seg,i) =>
        seg.type === "wiki"
          ? <span key={i} onClick={e=>{e.stopPropagation();onWikiTap&&onWikiTap(seg.term);}}
              style={{color:C.gold,borderBottom:`1px dotted ${C.gold}`,cursor:"pointer",fontStyle:"inherit"}}>
              {seg.value}
            </span>
          : <span key={i}>{seg.value}</span>
      )}
    </span>
  );
}

// Bottom-sheet panel showing a wiki term
const CAT_COLOR = {
  Gastronomie:"#C9A84C", Lieux:"#4E8060", Culture:"#8B6FB0",
  Concept:"#5B9BD5", Quotidien:"#C9463D", Fêtes:"#D98BA8",
};
function Slider({C, children, onIndexChange}){
  const items = Array.isArray(children) ? children.filter(Boolean) : [children];
  const [idx, setIdx] = useState(0);
  const ref = useRef(null);

  const onScroll = ()=>{
    const el = ref.current;
    if(!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if(i !== idx){ setIdx(i); onIndexChange && onIndexChange(i, items.length); }
  };

  const goTo = (i)=>{
    const el = ref.current;
    if(!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setIdx(i);
    onIndexChange && onIndexChange(i, items.length);
  };

  return(
    <div>
      <div ref={ref} onScroll={onScroll} style={{
        display:"flex", overflowX:"auto", scrollSnapType:"x mandatory",
        gap:0, scrollbarWidth:"none", WebkitOverflowScrolling:"touch",
        margin:"0 -2px"
      }}>
        {items.map((child,i)=>(
          <div key={i} style={{flex:"0 0 100%", scrollSnapAlign:"center", padding:"0 2px", boxSizing:"border-box"}}>
            {child}
          </div>
        ))}
      </div>
      {/* Dots */}
      <div style={{display:"flex",justifyContent:"center",gap:7,marginTop:13}}>
        {items.map((_,i)=>(
          <button key={i} onClick={()=>goTo(i)} aria-label={`Carte ${i+1}`} style={{
            width: i===idx ? 22 : 7, height:7, borderRadius:4, padding:0, cursor:"pointer",
            border:"none", background: i===idx ? C.red : C.s3,
            transition:"all .3s"
          }}/>
        ))}
      </div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
// ─── Rappel intelligent in-app : combine streak en danger, défi non fait,
//     et déblocage imminent. Choisit le message le plus pertinent du moment.
function computeReminder({ streak, mission, db, isPremium, today }){
  const count = streak?.count || 0;
  const last = streak?.last || null;
  const freezes = streak?.freezes || 0;
  const activeToday = last === today;
  const missionDone = (mission?.done?.length || 0) >= 3;

  // 1. Streak en danger : pas encore actif aujourd'hui ET un streak en cours à protéger
  if(!activeToday && count >= 1){
    const willUseFreeze = freezes > 0;
    return {
      kind:"danger",
      emoji:"🔥",
      title:`Protège ton streak de ${count} jour${count>1?"s":""} !`,
      text: willUseFreeze
        ? `Fais une activité aujourd'hui. Sinon, un joker 🧊 sera utilisé pour te sauver.`
        : `Tu n'as plus de joker — fais une activité aujourd'hui pour ne pas repartir de zéro.`,
      cta:"Faire une activité", target:"learn",
      color:"#C9463D", bg:"rgba(201,70,61,0.08)", border:"rgba(201,70,61,0.3)",
    };
  }

  // 2. Déblocage imminent (demain ou après-demain) — la carotte
  if(!isPremium){
    const nextUnlock = UNLOCK_SCHEDULE.find(u=>u.day>count);
    if(nextUnlock){
      const remaining = nextUnlock.day - count;
      if(remaining <= 2 && remaining >= 1){
        return {
          kind:"unlock",
          emoji: nextUnlock.emoji,
          title:`${nextUnlock.label} dans ${remaining} jour${remaining>1?"s":""} !`,
          text:`Continue ton streak : « ${nextUnlock.label} » se débloque très bientôt 🔓`,
          cta:"Voir ma progression", target:"home",
          color:"#4E8060", bg:"rgba(78,128,96,0.08)", border:"rgba(78,128,96,0.3)",
        };
      }
    }
  }

  // 3. Défi du jour non terminé (actif aujourd'hui mais mission incomplète)
  if(activeToday && !missionDone){
    const defi = db?.defis_jour?.length ? pickDaily(db.defis_jour, today, "defi") : null;
    if(defi){
      return {
        kind:"challenge",
        emoji: defi.emoji,
        title:"Ton défi du jour t'attend",
        text: defi.titre,
        cta: defi.cta || "Relever", target: defi.cible || "home",
        color:"#C97D3C", bg:"rgba(201,125,60,0.08)", border:"rgba(201,125,60,0.3)",
      };
    }
  }

  return null; // rien de pertinent à rappeler
}

function SmartReminder({ C, reminder, onGo, onDismiss }){
  if(!reminder) return null;
  return(
    <div style={{marginBottom:22,padding:"15px 16px",borderRadius:15,background:reminder.bg,border:`1px solid ${reminder.border}`,position:"relative",animation:"bubbleIn .45s cubic-bezier(.34,1.56,.64,1) both"}}>
      <div onClick={onDismiss} style={{position:"absolute",top:10,right:12,fontSize:15,color:C.t3,cursor:"pointer",lineHeight:1,padding:2}}>×</div>
      <div style={{display:"flex",alignItems:"flex-start",gap:13}}>
        <span style={{fontSize:30,flexShrink:0,animation:reminder.kind==="danger"?"heartbeat 1.4s ease infinite":"floatY 3s ease-in-out infinite"}}>{reminder.emoji}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,color:C.text,fontWeight:600,marginBottom:3,paddingRight:14}}>{reminder.title}</div>
          <div style={{fontSize:12,color:C.t2,lineHeight:1.5,marginBottom:11}}>{reminder.text}</div>
          <button onClick={()=>onGo(reminder.target)} className="pop-press" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 15px",background:reminder.color,border:"none",borderRadius:20,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>
            {reminder.cta} <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({C,user,db,streak,isFav,toggleFav,wikiMap,onWikiTap,script,toggleScript,onSearch,onProfile,mission,onTask,onGoTab,isPremium}){
  const [expr,  setExpr]  = useState(null);
  const [cult,  setCult]  = useState(null);
  const [repas, setRepas] = useState(null);
  const [streakFlip, setStreakFlip] = useState(false); // false=flamme, true=titre
  const [recoOpen, setRecoOpen] = useState(false);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [shareProverb, setShareProverb] = useState(null);
  const loaded = useRef(false);

  // Auto-alternate streak badge every 3s
  useEffect(()=>{
    const t = setInterval(()=> setStreakFlip(f=>!f), 5000);
    return ()=> clearInterval(t);
  },[]);

  // Marque "lire le contenu du jour" à l'arrivée sur l'accueil.
  // Se redéclenche si le jour de la mission change (ex. après chargement cloud).
  // La mission "Lire le contenu du jour" (trigger "daily") ne se valide plus au
  // montage — elle se valide quand l'utilisateur atteint la dernière carte du
  // carrousel "Daily Japan" (voir onIndexChange sur le Slider ci-dessous).

  const {month,day,weekday,hour} = getJPDate();
  const g = greet(hour, user.name==="Voyageur"?"":user.name);
  const rankLabel = {beginner:"Curious Tourist",intermediate:"Konbini Explorer",advanced:"Tokyo Wanderer"};

  const today = dayKey();

  // explore=false → fixed content for today (the daily rendez-vous)
  // explore=true  → random pick (manual "discover more" via ↻)
  const refresh = (which, explore=false) => {
    if(!db) return;
    if(!which || which==="daily") {
      setExpr(  explore ? pick(db.expressions) : pickDaily(db.expressions, today, "expr"));
      setCult(  explore ? pick(db.culture)     : pickDaily(db.culture,     today, "cult"));
      setRepas( explore ? pick(db.repas)       : pickDaily(db.repas,       today, "repas"));
    }
  };

  useEffect(() => {
    if(!loaded.current && db) { loaded.current=true; refresh(); } // initial = today's fixed content
  }, [db]);

  const seasonKey = currentSeasonKey();
  const seasonAccent = SEASON_ACCENT[seasonKey];
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif",position:"relative"}}>
      {/* Sticky header */}
      <div style={{padding:"50px 20px 14px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
        {/* Row 1 — date + badges alignés */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div>
            <div style={{fontSize:10,color:C.t3,letterSpacing:".2em",marginBottom:2}}>{month} {day}日（{weekday}）</div>
            <div style={{fontSize:11,color:C.t2}}>{g.fr}</div>
          </div>
          {/* Script toggle + profil alignés */}
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {/* Script toggle */}
            <button onClick={toggleScript} style={{width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",background:C.s2,border:`1px solid ${C.border}`,borderRadius:"50%",cursor:"pointer",fontFamily:"'Noto Serif JP',serif",fontSize:13,color:C.t2,lineHeight:1}}>
              {script==="kana" ? "あ" : script==="kanji" ? "漢" : "A"}
            </button>
            {/* Profil */}
            <button onClick={onProfile} aria-label="Profil" style={{width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",background:C.s2,border:`1px solid ${C.border}`,borderRadius:"50%",cursor:"pointer",padding:0}}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.t2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 21v-1a7 7 0 0 1 14 0v1"/>
              </svg>
            </button>
          </div>
        </div>
        {/* Row 2 — salutation japonaise */}
        <div style={{fontSize:21,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text}}>{g.jp}</div>
      </div>

      <div style={{padding:"18px 20px 110px",position:"relative",zIndex:1}}>
        {/* Search tap target */}
        <div onClick={onSearch} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 15px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,cursor:"pointer",marginBottom:24}}>
          <span style={{fontSize:15,color:C.t3}}>🔍</span>
          <span style={{fontSize:13,color:C.t3}}>Rechercher un mot, plat, tradition…</span>
        </div>

        {/* Rappel intelligent (streak en danger / défi / déblocage imminent) */}
        {!reminderDismissed && (()=>{
          let remindersOn = true;
          try { remindersOn = localStorage.getItem("isekaid_reminders_v1")!=="off"; } catch {}
          if(!remindersOn) return null;
          const reminder = computeReminder({ streak, mission, db, isPremium, today });
          return <SmartReminder C={C} reminder={reminder} onGo={(t)=>onGoTab && onGoTab(t)} onDismiss={()=>setReminderDismissed(true)}/>;
        })()}

        {/* Mission du jour */}
        {mission && (()=>{
          const todays = dailyMissions(mission.day || today);
          const done = mission.done || [];
          const allDone = done.length >= todays.length;
          const pct = Math.round((done.length/todays.length)*100);
          // Onglet cible selon le trigger de la mission
          const targetFor = (tr)=>({daily:"home",kana:"learn",review:"learn",comp:"learn",path:"learn",fav:"explore",scenario:"scenarios",explore:"explore"}[tr]||"home");
          return(
            <div style={{marginBottom:24,padding:"16px 18px",background:allDone?"rgba(78,128,96,0.08)":C.s1,border:`1px solid ${allDone?"rgba(78,128,96,0.3)":C.border}`,borderRadius:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:11,color:allDone?C.green:C.gold,letterSpacing:".15em",textTransform:"uppercase",fontWeight:600}}>
                  {allDone ? "✓ Mission accomplie !" : "🎯 Mission du jour"}
                </div>
                <div style={{fontSize:11,color:C.t3}}>{done.length}/{todays.length}</div>
              </div>
              <div style={{height:5,background:C.s3,borderRadius:3,overflow:"hidden",marginBottom:14}}>
                <div style={{height:"100%",width:`${pct}%`,background:allDone?C.green:`linear-gradient(90deg,${C.gold},${C.red})`,borderRadius:3,transition:"width .5s"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {todays.map(t=>{
                  const ok = done.includes(t.id);
                  return(
                    <div key={t.id} onClick={()=>{ if(!ok && onGoTab) onGoTab(targetFor(t.trigger)); }} style={{display:"flex",alignItems:"center",gap:11,cursor:ok?"default":"pointer",opacity:ok?0.6:1}}>
                      <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,background:ok?C.green:C.s2,border:`1px solid ${ok?C.green:C.border}`,color:"#fff"}}>{ok?"✓":t.emoji}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,color:C.text,textDecoration:ok?"line-through":"none"}}>{t.label}</div>
                      </div>
                      {!ok && <span style={{fontSize:10,color:C.t3}}>{t.hint} ›</span>}
                    </div>
                  );
                })}
              </div>
              {allDone && <div style={{marginTop:12,fontSize:11,color:C.green,textAlign:"center"}}>🎉 Mission du jour accomplie !</div>}
            </div>
          );
        })()}

        {/* Proverbe du jour */}
        {db?.proverbes && (()=>{
          const prov = pickDaily(db.proverbes, today, "prov");
          if(!prov) return null;
          return(
            <div className="lift" style={{marginBottom:26,padding:"20px 18px 16px",background:`linear-gradient(155deg,${seasonAccent.soft},transparent 70%)`,border:`1px solid ${C.border}`,borderRadius:18,position:"relative",overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.03)"}}>
              <div style={{fontSize:72,position:"absolute",top:-14,right:0,opacity:0.05,fontFamily:"'Noto Serif JP',serif"}}>諺</div>
              <div style={{fontSize:9,color:C.gold,letterSpacing:".2em",marginBottom:9,textTransform:"uppercase"}}>諺 · Proverbe du jour</div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                <div style={{fontSize:18,fontFamily:"'Noto Serif JP',serif",color:C.text,lineHeight:1.4}}>{jpMain(prov, script)}</div>
                <SpeakButton C={C} text={prov.jp} color={C.gold} size={26}/>
              </div>
              <div style={{fontSize:11,color:C.gold,fontStyle:"italic",marginBottom:8}}>{jpSub(prov, script)}</div>
              <div style={{fontSize:13,color:C.text,fontWeight:500,marginBottom:4}}>« {prov.fr} »</div>
              <div style={{fontSize:12,color:C.t2,lineHeight:1.5,marginBottom:12}}>{prov.sens}</div>
              <button onClick={()=>setShareProverb(prov)} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 13px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,color:C.t2,fontSize:11,cursor:"pointer"}}>
                <span style={{fontSize:13}}>📤</span> Partager
              </button>
            </div>
          );
        })()}

        {/* Recommandé pour toi (selon les intérêts d'onboarding) */}
        {db && user?.why?.length>0 && (()=>{
          const reco = recommendForUser(db, user.why, today);
          if(!reco) return null;
          const {cat, item} = reco;
          // Titre + sous-titre + contenu complet selon la catégorie
          const META = {
            culture:{label:"Culture",emoji:"🎴",title:item.titre,sub:item.contenu,full:item.contenu,extra:item.insight},
            traditions:{label:"Tradition",emoji:item.emoji||"⛩️",title:item.nom,sub:item.tagline,full:item.histoire||item.tagline,extra:item.comment_vivre},
            repas:{label:"Gastronomie",emoji:item.emoji||"🍱",title:item.nom_jp,sub:item.description||item.romaji,full:item.description,extra:item.romaji?`Lecture : ${item.romaji}`:""},
            regions:{label:"Région",emoji:item.emoji||"🗾",title:item.nom,sub:item.tagline,full:item.ambiance||item.tagline,extra:""},
            vie_quotidienne:{label:"Vie quotidienne",emoji:item.emoji||"🏙️",title:item.titre,sub:item.resume,full:item.description||item.resume,extra:""},
            expressions:{label:"Expression",emoji:"💬",title:item.expression,sub:item.traduction,full:item.contexte,extra:item.exemple_jp?`${item.exemple_jp} — ${item.exemple_fr||""}`:""},
            situations:{label:"Phrase utile",emoji:"🗣️",title:item.titre,sub:(item.phrases?.[0]?.fr)||"",full:"",extra:""},
          }[cat] || {label:"Pour toi",emoji:"✨",title:"",sub:"",full:"",extra:""};
          const jpText = cat==="repas"?item.nom_jp:(cat==="expressions"?item.expression:null);
          return(
            <div style={{marginBottom:26}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:11}}>
                <span style={{fontSize:11,color:C.red,letterSpacing:".15em",textTransform:"uppercase"}}>✨ Recommandé pour toi</span>
              </div>
              <div onClick={()=>setRecoOpen(o=>!o)} style={{padding:"16px",background:`linear-gradient(160deg,rgba(201,70,61,0.08),transparent)`,border:`1px solid rgba(201,70,61,0.2)`,borderRadius:14,cursor:"pointer",transition:"all .2s"}}>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <span style={{fontSize:32,flexShrink:0}}>{META.emoji}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:9,color:C.red,letterSpacing:".1em",marginBottom:3,textTransform:"uppercase"}}>{META.label} · selon tes goûts</div>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <span style={{fontSize:15,color:C.text,fontWeight:500,overflow:recoOpen?"visible":"hidden",textOverflow:"ellipsis",whiteSpace:recoOpen?"normal":"nowrap"}}>{META.title}</span>
                      {jpText && recoOpen && <SpeakButton C={C} text={jpText} color={C.red} size={24}/>}
                    </div>
                    {!recoOpen && <div style={{fontSize:12,color:C.t2,lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:1,WebkitBoxOrient:"vertical",marginTop:2}}>{META.sub}</div>}
                  </div>
                  <span style={{fontSize:13,color:C.t3,flexShrink:0,transform:recoOpen?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
                </div>
                {recoOpen && (
                  <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`,animation:"fadeUp .3s ease"}}>
                    {META.full && <div style={{fontSize:13,color:C.t2,lineHeight:1.6,marginBottom:META.extra?10:0}}>{META.full}</div>}
                    {META.extra && <div style={{fontSize:12,color:C.t3,lineHeight:1.5,fontStyle:"italic"}}>{META.extra}</div>}
                    {!META.full && !META.extra && <div style={{fontSize:13,color:C.t2}}>{META.sub}</div>}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Section 1 — Daily Japan (slider) */}
        <SH C={C} kanji="日" title="Daily Japan" sub="Ta sélection du jour" onRefresh={()=>refresh("daily",true)}/>
        <div style={{marginBottom:28}}>
          {db ? (
            <Slider C={C} onIndexChange={(i,len)=>{ if(i>=len-1 && onTask) onTask("daily"); }}>
              <ExprCard  C={C} data={expr}  fav={expr&&isFav("expr",expr)}   onFav={expr&&(()=>toggleFav("expr",expr))}  wikiMap={wikiMap} onWikiTap={onWikiTap} script={script}/>
              <CultCard  C={C} data={cult}  fav={cult&&isFav("cult",cult)}   onFav={cult&&(()=>toggleFav("cult",cult))}  wikiMap={wikiMap} onWikiTap={onWikiTap}/>
              <RepasCard C={C} data={repas} fav={repas&&isFav("repas",repas)} onFav={repas&&(()=>toggleFav("repas",repas))} wikiMap={wikiMap} onWikiTap={onWikiTap} script={script}/>
            </Slider>
          ) : (
            <div style={{padding:"24px",textAlign:"center",background:C.s1,border:`1px solid ${C.border}`,borderRadius:14}}>
              <div style={{fontSize:20,marginBottom:8}}>⏳</div>
              <div style={{fontSize:12,color:C.t3}}>Chargement du contenu…</div>
            </div>
          )}
        </div>

        {/* Section 2 — Défi du jour (varie chaque jour) */}
        {db?.defis_jour?.length > 0 && (()=>{
          const defi = pickDaily(db.defis_jour, today, "defi");
          if(!defi) return null;
          return(
            <>
              <SH C={C} kanji="挑" title="Défi du jour" sub="Ton objectif pour aujourd'hui" />
              <div className="lift" onClick={()=>onGoTab && onGoTab(defi.cible)} style={{marginBottom:28,padding:"22px 20px",borderRadius:18,cursor:"pointer",position:"relative",overflow:"hidden",background:`linear-gradient(140deg,${seasonAccent.soft},transparent 75%)`,border:`1px solid ${seasonAccent.accent}33`,boxShadow:"0 2px 14px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:80,position:"absolute",top:-18,right:-6,opacity:0.06}}>{defi.emoji}</div>
                <div style={{position:"relative"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                    <span style={{fontSize:38,display:"inline-block",animation:"floatY 3s ease-in-out infinite"}}>{defi.emoji}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:9,color:seasonAccent.accent,letterSpacing:".2em",textTransform:"uppercase",marginBottom:2}}>挑戦 · Challenge</div>
                      <div style={{fontSize:17,color:C.text,fontWeight:600,lineHeight:1.25}}>{defi.titre}</div>
                    </div>
                  </div>
                  <div style={{fontSize:13,color:C.t2,lineHeight:1.55,marginBottom:14}}>{defi.desc}</div>
                  <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"9px 16px",background:seasonAccent.accent,borderRadius:22,boxShadow:`0 4px 12px ${seasonAccent.accent}44`}}>
                    <span style={{fontSize:13,color:"#fff",fontWeight:600}}>{defi.cta}</span>
                    <span style={{fontSize:13,color:"#fff"}}>→</span>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* Section 3 — Streak */}
        <SH C={C} kanji="火" title="Streak & Fidélisation" sub="Ta progression quotidienne"/>
        <StreakSection C={C} streak={streak} isPremium={isPremium}/>
      </div>
      {shareProverb && <ProverbShareSheet C={C} prov={shareProverb} script={script} onClose={()=>setShareProverb(null)}/>}
    </div>
  );
}

// ─── Other screens
// Bandeau d'explication du déblocage progressif par streak — fermable, avec
// option "ne plus afficher" persistée en localStorage (voir dismissUnlockHint).
function UnlockHintBanner({C, onDismiss}){
  const [dontShow, setDontShow] = useState(false);
  return (
    <div style={{position:"relative",padding:"14px 40px 14px 16px",background:C.s2,border:`1px dashed ${C.border}`,borderRadius:12,fontSize:12,color:C.t3,lineHeight:1.6,marginBottom:20}}>
      <button onClick={()=>onDismiss(dontShow)} aria-label="Fermer" style={{position:"absolute",top:10,right:10,width:24,height:24,borderRadius:"50%",border:"none",background:"transparent",color:C.t3,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      <div style={{marginBottom:10}}>
        🔓 Le contenu se débloque <b style={{color:C.t2}}>au fil de ton streak</b> : reviens chaque jour et les sections s'ouvrent progressivement. <b style={{color:C.t2}}>Premium</b> débloque tout immédiatement.
      </div>
      <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontSize:11,color:C.t3}}>
        <input type="checkbox" checked={dontShow} onChange={e=>setDontShow(e.target.checked)} style={{width:14,height:14,cursor:"pointer",accentColor:C.red}}/>
        Ne plus afficher ce message
      </label>
    </div>
  );
}
function ExploreScreen({C,db,isFav,toggleFav,wikiMap,onWikiTap,script,streak,isUnlocked,unlockCategory,onOpenPremium}){
  const [view,setView] = useState(null);
  const [viewFilter,setViewFilter] = useState(null);
  const [confirmCat,setConfirmCat] = useState(null);
  const [toast,setToast] = useState(null);
  const [sectionFilter,setSectionFilter] = useState("all");
  const [showUnlockHint,setShowUnlockHint] = useState(()=>{
    try { return localStorage.getItem("isekaid_hide_unlock_hint_v1") !== "1"; } catch { return true; }
  });
  const dismissUnlockHint = (dontShowAgain)=>{
    setShowUnlockHint(false);
    if(dontShowAgain){ try { localStorage.setItem("isekaid_hide_unlock_hint_v1","1"); } catch {} }
  };
  const seasonKey = currentSeasonKey();
  const acc = SEASON_ACCENT[seasonKey];

  if(view==="traditions") return <TraditionsScreen C={C} db={db} isFav={isFav} toggleFav={toggleFav} wikiMap={wikiMap} onWikiTap={onWikiTap} script={script} initialSeason={viewFilter} onBack={()=>{setView(null);setViewFilter(null);}}/>;
  if(view==="codes")      return <CodesScreen C={C} db={db} isFav={isFav} toggleFav={toggleFav} wikiMap={wikiMap} onWikiTap={onWikiTap} script={script}/>;
  if(view==="regions")    return <RegionsScreen C={C} db={db} isFav={isFav} toggleFav={toggleFav} wikiMap={wikiMap} onWikiTap={onWikiTap} script={script}/>;
  if(view==="vie")        return <VieScreen C={C} db={db} isFav={isFav} toggleFav={toggleFav} wikiMap={wikiMap} onWikiTap={onWikiTap} script={script}/>;
  if(view==="histoire")   return <HistoireScreen C={C} db={db} script={script} onBack={()=>setView(null)}/>;

  const tryOpen = (mod)=>{
    if(!mod.cat) return;
    if(isUnlocked(mod.cat)){ setViewFilter(mod.filter||null); setView(mod.route); return; }
    setConfirmCat(mod.cat);
  };
  const doUnlock = (catKey)=>{
    // Plus de déblocage manuel : on ferme juste la modale (info seulement).
    setConfirmCat(null);
  };

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
      {/* En-tête sticky */}
      <div style={{padding:"50px 20px 12px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>探 · EXPLORER</div>
            <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text}}>{script==="romaji"?"Bunka wo sagasu":script==="kana"?"ぶんかをさがす":"文化を探す"}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",background:`${acc.soft}`,border:`1px solid ${acc.accent}44`,borderRadius:20}}>
            <span style={{fontSize:14}}>🔥</span>
            <span style={{fontSize:14,fontWeight:700,color:C.text}}>{streak?.count||0}j</span>
          </div>
        </div>
        {/* Filtre par section */}
        <div style={{display:"flex",gap:8,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:2}}>
          {[{id:"all",label:"Tout",emoji:"✨"}, ...EXPLORE_SECTIONS.map(s=>({id:s.id,label:s.label,emoji:s.emoji}))].map(f=>{
            const on = sectionFilter===f.id;
            return(
              <button key={f.id} onClick={()=>setSectionFilter(f.id)} className="pop-press" style={{flexShrink:0,padding:"7px 13px",borderRadius:18,border:`1px solid ${on?acc.accent:C.border}`,background:on?acc.accent:C.s1,color:on?"#fff":C.t2,fontSize:12,fontWeight:on?600:500,cursor:"pointer",whiteSpace:"nowrap"}}>
                {f.emoji} {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{padding:"18px 20px 110px"}}>
        {/* Hint déblocage par streak — en haut, fermable */}
        {showUnlockHint && <UnlockHintBanner C={C} onDismiss={dismissUnlockHint}/>}

        {/* 3 sections (filtrées) */}
        {EXPLORE_SECTIONS.filter(section=> sectionFilter==="all" || section.id===sectionFilter).map(section=>(
          <div key={section.id} style={{marginBottom:28}}>
            {/* Titre de section */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{flex:1,height:1,background:C.border}}/>
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 13px",background:C.s2,borderRadius:20,flexShrink:0}}>
                <span style={{fontSize:14}}>{section.emoji}</span>
                <span style={{fontSize:11,color:C.t2,fontWeight:500}}>{section.label}</span>
                <span style={{fontSize:11,fontFamily:"'Noto Serif JP',serif",color:C.t3}}>{section.jp}</span>
              </div>
              <div style={{flex:1,height:1,background:C.border}}/>
            </div>

            {/* Modules de la section */}
            <div style={{display:"flex",flexDirection:"column",gap:10}} className="stagger">
              {section.mods.map((mod,i)=>{
                const unlocked = mod.cat && isUnlocked(mod.cat);
                const lockDef = mod.cat && LOCKABLE[mod.cat];
                return(
                  <div key={i} className="lift" onClick={()=>tryOpen(mod)}
                    style={{position:"relative",background:C.s1,border:`1px solid ${unlocked?`${acc.accent}44`:C.border}`,borderRadius:16,padding:"16px 18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",overflow:"hidden",boxShadow:unlocked?"0 2px 12px rgba(0,0,0,0.05)":"none"}}>
                    {unlocked && <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${acc.accent},transparent)`}}/>}
                    <div style={{width:46,height:46,borderRadius:12,background:unlocked?`${acc.soft}`:`${C.s2}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                      {mod.emoji}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,color:C.text,fontWeight:500,marginBottom:2}}>{mod.title}</div>
                      <div style={{fontSize:11,color:C.t2}}>{mod.sub}</div>
                    </div>
                    {unlocked
                      ? <span style={{fontSize:18,color:acc.accent}}>›</span>
                      : <span style={{fontSize:11,padding:"5px 11px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:16,color:C.t2,whiteSpace:"nowrap",flexShrink:0}}>🔒 Jour {lockDef?.day}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:C.text,color:C.bg,padding:"11px 22px",borderRadius:20,fontSize:13,fontWeight:600,zIndex:200,animation:"toastUp .5s cubic-bezier(.34,1.56,.64,1)",boxShadow:"0 8px 24px rgba(0,0,0,0.25)",whiteSpace:"nowrap"}}>{toast}</div>}

      {/* Modale info déblocage */}
      {confirmCat && (()=>{
        const def = LOCKABLE[confirmCat];
        const current = streak?.count || 0;
        const remaining = def ? Math.max(def.day - current, 0) : 0;
        return(
          <div onClick={()=>setConfirmCat(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
            <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:440,background:C.s1,borderRadius:"22px 22px 0 0",padding:"26px 22px 32px",animation:"fadeUp .3s ease"}}>
              <div style={{textAlign:"center",marginBottom:18}}>
                <div style={{fontSize:36,marginBottom:8}}>{def?.emoji}</div>
                <div style={{fontSize:18,color:C.text,fontWeight:600,marginBottom:6}}>{def?.label}</div>
                <div style={{fontSize:13,color:C.t2,lineHeight:1.6}}>
                  Se débloque au <b style={{color:C.text}}>jour {def?.day}</b> de ton streak.<br/>
                  {remaining>0
                    ? <>Plus que <b style={{color:C.red}}>{remaining} jour{remaining>1?"s":""}</b> de connexion quotidienne 🔥</>
                    : <span style={{color:C.green}}>Tu as atteint ce palier ! Rouvre l'app demain pour confirmer.</span>}
                </div>
              </div>
              <div style={{padding:"12px 14px",background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.25)",borderRadius:12,marginBottom:16,textAlign:"center"}}>
                <div style={{fontSize:12,color:C.t2}}>✨ Pas envie d'attendre ? <b style={{color:C.text}}>Premium</b> débloque tout, tout de suite.</div>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setConfirmCat(null)} style={{flex:1,padding:"13px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:14,cursor:"pointer"}}>Compris</button>
                <button onClick={()=>{setConfirmCat(null); onOpenPremium&&onOpenPremium();}} style={{flex:1,padding:"13px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Voir Premium</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Vie quotidienne ──────────────────────────────────────────────────────────
const VIE_CATS = [
  {id:"all",        label:"Tous",       emoji:"🏙️"},
  {id:"Commerces",  label:"Commerces",  emoji:"🏪"},
  {id:"Transports", label:"Transports", emoji:"🚃"},
  {id:"Services",   label:"Services",   emoji:"🏤"},
  {id:"Logement",   label:"Logement",   emoji:"🏠"},
  {id:"Travail",    label:"Travail",    emoji:"💼"},
];

function VieDetail({C,v,onBack,fav,onFav,wikiMap,onWikiTap,script}){
  const wt=(text,style)=><WikiText C={C} text={text} style={style} wikiMap={wikiMap||{}} onWikiTap={onWikiTap}/>;
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,animation:"fadeIn .3s ease"}}>
      <div style={{padding:"50px 20px 24px",background:`linear-gradient(160deg,rgba(123,155,181,0.12) 0%,transparent 90%)`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <button onClick={onBack} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.t2,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>‹ Vie quotidienne</button>
          {onFav&&<FavButton C={C} active={fav} onClick={onFav}/>}
        </div>
        <div style={{fontSize:54,marginBottom:8}}>{v.emoji}</div>
        <span style={{fontSize:9,padding:"3px 9px",background:"rgba(123,155,181,0.12)",border:"1px solid rgba(123,155,181,0.3)",borderRadius:20,color:"#5B7E9B",letterSpacing:".05em"}}>{v.categorie}</span>
        <div style={{fontSize:28,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginTop:8,marginBottom:2}}>{v.titre}</div>
        <div style={{fontSize:15,color:C.t3,fontFamily:"'Noto Serif JP',serif",marginBottom:10}}>{v.nom_jp}</div>
        <div style={{fontSize:14,color:C.t2,fontStyle:"italic",lineHeight:1.5}}>{v.resume}</div>
      </div>

      <div style={{padding:"4px 20px 110px",display:"flex",flexDirection:"column",gap:20}}>
        {/* Description */}
        <div>
          <div style={{fontSize:10,color:"#5B7E9B",letterSpacing:".2em",marginBottom:10,textTransform:"uppercase"}}>📖 Comprendre</div>
          <p style={{fontSize:14,color:C.t2,lineHeight:1.85,margin:0}}>{wt(v.description)}</p>
        </div>

        {/* Infos pratiques */}
        <div>
          <div style={{fontSize:10,color:"#5B7E9B",letterSpacing:".2em",marginBottom:12,textTransform:"uppercase"}}>💡 Infos pratiques</div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {(v.infos_pratiques||[]).map((x,i)=>(
              <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 14px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:10}}>
                <span style={{minWidth:22,height:22,borderRadius:"50%",background:"rgba(123,155,181,0.15)",color:"#5B7E9B",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                <span style={{fontSize:13,color:C.t2,lineHeight:1.55}}>{wt(x)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vocabulaire utile */}
        {v.vocabulaire && v.vocabulaire.length>0 && (
          <div style={{padding:"16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12}}>
            <div style={{fontSize:10,color:C.gold,letterSpacing:".18em",marginBottom:12,textTransform:"uppercase"}}>🗣️ Vocabulaire utile</div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              {v.vocabulaire.map((w,i)=>(
                <div key={i} style={{paddingBottom:i<v.vocabulaire.length-1?11:0,borderBottom:i<v.vocabulaire.length-1?`1px solid ${C.border}`:"none"}}>
                  <div style={{fontSize:16,fontFamily:"'Noto Serif JP',serif",color:C.text,marginBottom:2}}>{jpMain(w, script)}</div>
                  <div style={{fontSize:11,color:C.gold,fontStyle:"italic",marginBottom:2}}>{jpSub(w, script)}</div>
                  <div style={{fontSize:12,color:C.t2}}>{w.fr}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Étiquette */}
        <div style={{padding:"14px 16px",background:"rgba(78,128,96,0.06)",border:"1px solid rgba(78,128,96,0.18)",borderRadius:12,display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:20,flexShrink:0}}>🎌</span>
          <div>
            <div style={{fontSize:10,color:C.green,letterSpacing:".15em",marginBottom:5,textTransform:"uppercase"}}>Étiquette & savoir-vivre</div>
            <p style={{fontSize:13,color:C.t2,margin:0,lineHeight:1.6}}>{wt(v.etiquette)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VieScreen({C,db,isFav,toggleFav,wikiMap,onWikiTap,script}){
  const [cat,setCat] = useState("all");
  const [selected,setSelected] = useState(null);
  const items = db?.vie_quotidienne || [];

  if(selected) return <VieDetail C={C} v={selected} onBack={()=>setSelected(null)} fav={isFav&&isFav("vie",selected)} onFav={toggleFav&&(()=>toggleFav("vie",selected))} wikiMap={wikiMap} onWikiTap={onWikiTap} script={script}/>;

  const filtered = cat==="all" ? items : items.filter(v=>v.categorie===cat);

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 12px"}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>暮 · VIE QUOTIDIENNE</div>
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:3}}>{script==="romaji"?"Nichijō seikatsu":script==="kana"?"にちじょうせいかつ":"日常生活"}</div>
        <div style={{fontSize:13,color:C.t2,marginBottom:18}}>Vivre le Japon au jour le jour</div>
      </div>

      {/* Category filter */}
      <div style={{display:"flex",gap:8,padding:"0 20px 18px",overflowX:"auto"}}>
        {VIE_CATS.map(k=>{
          const on=k.id===cat;
          return(
            <button key={k.id} onClick={()=>setCat(k.id)} style={{flexShrink:0,padding:"9px 14px",borderRadius:20,cursor:"pointer",background:on?"rgba(123,155,181,0.15)":C.s1,border:`1px solid ${on?"#5B7E9B":C.border}`,color:on?"#5B7E9B":C.t2,fontSize:12,display:"flex",alignItems:"center",gap:6,transition:"all .2s"}}>
              <span style={{fontSize:14}}>{k.emoji}</span>{k.label}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div style={{padding:"0 20px 110px",display:"flex",flexDirection:"column",gap:11}}>
        {filtered.map((v,i)=>(
          <div key={i} onClick={()=>setSelected(v)} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",animation:"fadeUp .4s ease"}}>
            <span style={{fontSize:30,flexShrink:0}}>{v.emoji}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:3}}>
                <span style={{fontSize:15,color:C.text,fontWeight:500}}>{v.titre}</span>
                <span style={{fontSize:11,color:C.t3,fontFamily:"'Noto Serif JP',serif"}}>{v.nom_jp}</span>
              </div>
              <div style={{fontSize:12,color:C.t2,lineHeight:1.45,marginBottom:6}}>{v.resume}</div>
              <span style={{fontSize:9,padding:"2px 8px",background:"rgba(123,155,181,0.1)",border:"1px solid rgba(123,155,181,0.25)",borderRadius:20,color:"#5B7E9B"}}>{v.categorie}</span>
            </div>
            <div style={{fontSize:18,color:C.t3,flexShrink:0}}>›</div>
          </div>
        ))}
        {filtered.length===0 && <div style={{padding:"24px",textAlign:"center",color:C.t3,fontSize:12}}>Chargement…</div>}
      </div>
    </div>
  );
}

// ─── Régions du Japon ─────────────────────────────────────────────────────────
// Approximate bounding boxes per region id (lat min/max, lng min/max)
const REGION_BOUNDS = {
  "hokkaido":        {latMin:41.3, latMax:45.6, lngMin:139.3, lngMax:146.0},
  "tohoku":          {latMin:37.0, latMax:41.6, lngMin:139.2, lngMax:142.1},
  "kanto":           {latMin:34.9, latMax:37.1, lngMin:138.7, lngMax:140.9},
  "chubu":           {latMin:34.6, latMax:37.6, lngMin:136.0, lngMax:139.2},
  "kansai":          {latMin:33.4, latMax:35.8, lngMin:134.2, lngMax:136.6},
  "chugoku":         {latMin:33.8, latMax:35.7, lngMin:131.0, lngMax:134.4},
  "shikoku":         {latMin:32.7, latMax:34.4, lngMin:132.0, lngMax:134.8},
  "kyushu-okinawa":  {latMin:24.0, latMax:34.0, lngMin:122.9, lngMax:132.1},
};
// Japan overall bounds (rough)
function inJapan(lat,lng){ return lat>=24 && lat<=46 && lng>=122 && lng<=146.5; }
function matchRegion(lat,lng){
  for(const [id,b] of Object.entries(REGION_BOUNDS)){
    if(lat>=b.latMin && lat<=b.latMax && lng>=b.lngMin && lng<=b.lngMax) return id;
  }
  return null;
}

function RegionHero({C,r,height=200,children}){
  return(
    <div style={{position:"relative",height,borderRadius:16,overflow:"hidden",background:`linear-gradient(145deg, ${r.couleur} 0%, ${r.couleur}99 45%, #1a1410 130%)`}}>
      {/* Big kanji watermark */}
      <div style={{position:"absolute",right:-18,bottom:-40,fontSize:170,fontFamily:"'Noto Serif JP',serif",fontWeight:200,color:"rgba(255,255,255,0.13)",lineHeight:1,userSelect:"none"}}>{r.nom_jp}</div>
      {/* Soft light */}
      <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 25% 20%, rgba(255,255,255,0.18) 0%, transparent 55%)"}}/>
      <div style={{position:"relative",height:"100%",padding:"18px",display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
        {children}
      </div>
    </div>
  );
}

function RegionDetail({C,r,onBack,fav,onFav,wikiMap,onWikiTap,script}){
  const wt=(text,style)=><WikiText C={C} text={text} style={style} wikiMap={wikiMap||{}} onWikiTap={onWikiTap}/>;
  const Row = ({icon,title,items}) => (
    <div>
      <div style={{fontSize:10,color:r.couleur,letterSpacing:".18em",marginBottom:11,textTransform:"uppercase"}}>{icon} {title}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {items.map((x,i)=>(
          <span key={i} style={{fontSize:12,padding:"7px 12px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,color:C.t2}}>{wt(x)}</span>
        ))}
      </div>
    </div>
  );
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,animation:"fadeIn .3s ease"}}>
      <div style={{padding:"50px 20px 0"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <button onClick={onBack} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.t2,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>‹ Régions</button>
          {onFav&&<FavButton C={C} active={fav} onClick={onFav}/>}
        </div>
      </div>
      <div style={{padding:"0 20px"}}>
        <RegionHero C={C} r={r} height={210}>
          <div style={{fontSize:40,marginBottom:6}}>{r.emoji}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.8)",letterSpacing:".2em",marginBottom:4,textTransform:"uppercase"}}>📍 {r.position}</div>
          <div style={{fontSize:30,fontFamily:"'Noto Serif JP',serif",fontWeight:400,color:"#fff",lineHeight:1.1}}>{r.nom}</div>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.9)",fontStyle:"italic",marginTop:4}}>{r.tagline}</div>
        </RegionHero>
      </div>

      <div style={{padding:"20px 20px 110px",display:"flex",flexDirection:"column",gap:20}}>
        <div>
          <div style={{fontSize:10,color:r.couleur,letterSpacing:".2em",marginBottom:10,textTransform:"uppercase"}}>🌏 Ambiance</div>
          <p style={{fontSize:14,color:C.t2,lineHeight:1.85,margin:0}}>{wt(r.ambiance)}</p>
        </div>

        <Row icon="🏙️" title="Villes principales" items={r.villes}/>
        <Row icon="🍜" title="Spécialités" items={r.specialites}/>

        <div>
          <div style={{fontSize:10,color:r.couleur,letterSpacing:".2em",marginBottom:12,textTransform:"uppercase"}}>⭐ Incontournables</div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {r.incontournables.map((x,i)=>(
              <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 14px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:10}}>
                <span style={{minWidth:22,height:22,borderRadius:"50%",background:`${r.couleur}22`,color:r.couleur,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                <span style={{fontSize:13,color:C.t2,lineHeight:1.55}}>{wt(x)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{padding:"14px 16px",background:C.s1,border:`1px solid ${C.border}`,borderLeft:`3px solid ${r.couleur}`,borderRadius:"0 10px 10px 0",display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:20,flexShrink:0}}>🗣️</span>
          <div>
            <div style={{fontSize:10,color:r.couleur,letterSpacing:".15em",marginBottom:5,textTransform:"uppercase"}}>Dialecte local</div>
            <p style={{fontSize:13,color:C.t2,margin:0,lineHeight:1.55}}>{r.dialecte}</p>
          </div>
        </div>

        <div style={{padding:"14px 16px",background:`${r.couleur}0f`,border:`1px solid ${r.couleur}33`,borderRadius:12,display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:20,flexShrink:0}}>💡</span>
          <div>
            <div style={{fontSize:10,color:r.couleur,letterSpacing:".15em",marginBottom:5,textTransform:"uppercase"}}>Bon à savoir</div>
            <p style={{fontSize:13,color:C.t2,margin:0,lineHeight:1.6}}>{r.a_savoir}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegionsScreen({C,db,isFav,toggleFav,wikiMap,onWikiTap,script}){
  const [selected,setSelected] = useState(null);
  const [geo,setGeo] = useState({status:"idle"}); // idle | loading | japan | abroad | denied | error
  const regions = db?.regions || [];

  const locate = ()=>{
    if(!navigator.geolocation){ setGeo({status:"error"}); return; }
    setGeo({status:"loading"});
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const {latitude:lat, longitude:lng} = pos.coords;
        if(!inJapan(lat,lng)){ setGeo({status:"abroad"}); return; }
        const id = matchRegion(lat,lng);
        setGeo({status:"japan", regionId:id});
      },
      ()=> setGeo({status:"denied"}),
      {timeout:10000, maximumAge:600000}
    );
  };

  if(selected) return <RegionDetail C={C} r={selected} onBack={()=>setSelected(null)} fav={isFav&&isFav("region",selected)} onFav={toggleFav&&(()=>toggleFav("region",selected))} wikiMap={wikiMap} onWikiTap={onWikiTap} script={script}/>;

  const detectedRegion = geo.status==="japan" && geo.regionId ? regions.find(r=>r.id===geo.regionId) : null;

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 16px"}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>地 · RÉGIONS</div>
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:3}}>{script==="romaji"?"Nihon no chihō":script==="kana"?"にほんのちほう":"日本の地方"}</div>
        <div style={{fontSize:13,color:C.t2}}>Les 8 grandes régions du Japon</div>
      </div>

      {/* Géolocalisation */}
      <div style={{padding:"0 20px 14px"}}>
        {geo.status==="idle" && (
          <button onClick={locate} style={{width:"100%",padding:"13px",background:C.s1,border:`1px dashed ${C.border}`,borderRadius:12,color:C.t2,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            📍 Où suis-je au Japon ?
          </button>
        )}
        {geo.status==="loading" && (
          <div style={{padding:"13px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,color:C.t3,fontSize:13,textAlign:"center"}}>
            Localisation en cours…
          </div>
        )}
        {detectedRegion && (
          <div onClick={()=>setSelected(detectedRegion)} style={{cursor:"pointer",borderRadius:14,overflow:"hidden",border:`1px solid ${detectedRegion.couleur}55`,animation:"fadeUp .4s ease"}}>
            <div style={{background:`linear-gradient(120deg,${detectedRegion.couleur}33 0%,${detectedRegion.couleur}11 100%)`,padding:"14px 16px",display:"flex",alignItems:"center",gap:13}}>
              <span style={{fontSize:30}}>📍</span>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:detectedRegion.couleur,letterSpacing:".15em",textTransform:"uppercase",marginBottom:3}}>Vous vous situez dans</div>
                <div style={{fontSize:18,fontFamily:"'Noto Serif JP',serif",color:C.text}}>{detectedRegion.nom} <span style={{fontSize:13,color:C.t3}}>{detectedRegion.nom_jp}</span></div>
              </div>
              <span style={{fontSize:18,color:C.t3}}>›</span>
            </div>
          </div>
        )}
        {geo.status==="japan" && !geo.regionId && (
          <div style={{padding:"13px 16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:13}}>
            📍 Tu es au Japon, mais ta région exacte n'a pas pu être identifiée. Explore les 8 régions ci-dessous.
          </div>
        )}
        {geo.status==="abroad" && (
          <div style={{padding:"13px 16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:13,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>🌍</span>
            <span>Tu n'es pas au Japon pour l'instant — mais tu peux explorer chaque région en attendant le grand voyage !</span>
          </div>
        )}
        {geo.status==="denied" && (
          <div style={{padding:"13px 16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,color:C.t3,fontSize:12}}>
            Localisation refusée. Tu peux l'autoriser dans les réglages de ton navigateur pour détecter ta région.
          </div>
        )}
        {geo.status==="error" && (
          <div style={{padding:"13px 16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,color:C.t3,fontSize:12}}>
            La géolocalisation n'est pas disponible sur cet appareil.
          </div>
        )}
      </div>

      <div style={{padding:"0 20px 110px",display:"flex",flexDirection:"column",gap:13}}>
        {regions.map((r,i)=>{
          const isHere = detectedRegion && detectedRegion.id===r.id;
          return(
          <div key={i} onClick={()=>setSelected(r)} style={{cursor:"pointer",animation:"fadeUp .4s ease",position:"relative"}}>
            <RegionHero C={C} r={r} height={120}>
              <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:26,marginBottom:2}}>{r.emoji}</div>
                  <div style={{fontSize:20,fontFamily:"'Noto Serif JP',serif",fontWeight:400,color:"#fff",lineHeight:1.1}}>{r.nom}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.85)",fontStyle:"italic",marginTop:2}}>{r.tagline}</div>
                </div>
                <div style={{fontSize:20,color:"rgba(255,255,255,0.7)"}}>›</div>
              </div>
            </RegionHero>
            {isHere && <div style={{position:"absolute",top:10,right:10,fontSize:9,padding:"4px 9px",background:"rgba(0,0,0,0.45)",borderRadius:20,color:"#fff",letterSpacing:".08em",backdropFilter:"blur(4px)"}}>📍 Vous êtes ici</div>}
          </div>
          );
        })}
        {regions.length===0 && <div style={{padding:"24px",textAlign:"center",color:C.t3,fontSize:12}}>Chargement…</div>}
      </div>
    </div>
  );
}

// ─── Codes sociaux ────────────────────────────────────────────────────────────
const CODE_CATS = [
  {id:"all",          label:"Tous",          emoji:"🎌"},
  {id:"Communication",label:"Communication", emoji:"💬"},
  {id:"Relations",    label:"Relations",     emoji:"🤝"},
  {id:"Quotidien",    label:"Quotidien",     emoji:"🏠"},
  {id:"Travail",      label:"Travail",       emoji:"💼"},
];

function CodeDetail({C,c,onBack,fav,onFav,wikiMap,onWikiTap,script}){
  const wt=(text,style)=><WikiText C={C} text={text} style={style} wikiMap={wikiMap||{}} onWikiTap={onWikiTap}/>;
  const Block = ({title,items,color,icon}) => (
    <div>
      <div style={{fontSize:10,color:color,letterSpacing:".18em",marginBottom:11,textTransform:"uppercase"}}>{icon} {title}</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {items.map((x,i)=>(
          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{color:color,fontSize:13,flexShrink:0,lineHeight:1.5}}>{icon==="✅"?"✓":icon==="⚠️"?"✕":"◈"}</span>
            <span style={{fontSize:13,color:C.t2,lineHeight:1.6}}>{wt(x)}</span>
          </div>
        ))}
      </div>
    </div>
  );
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,animation:"fadeIn .3s ease"}}>
      <div style={{padding:"50px 20px 24px",background:`linear-gradient(160deg,rgba(201,70,61,0.1) 0%,transparent 90%)`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <button onClick={onBack} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.t2,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>‹ Codes sociaux</button>
          {onFav&&<FavButton C={C} active={fav} onClick={onFav}/>}
        </div>
        <div style={{fontSize:54,marginBottom:8}}>{c.emoji}</div>
        <div style={{display:"flex",gap:7,marginBottom:8}}>
          <span style={{fontSize:9,padding:"3px 9px",background:"rgba(201,70,61,0.1)",border:"1px solid rgba(201,70,61,0.22)",borderRadius:20,color:C.red,letterSpacing:".05em"}}>{c.categorie}</span>
          <span style={{fontSize:9,padding:"3px 9px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:20,color:C.t2}}>{c.niveau}</span>
        </div>
        <div style={{fontSize:28,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:2}}>{c.titre}</div>
        <div style={{fontSize:15,color:C.t3,fontFamily:"'Noto Serif JP',serif",marginBottom:10}}>{c.nom_jp}</div>
        <div style={{fontSize:14,color:C.t2,fontStyle:"italic",lineHeight:1.5}}>{c.resume}</div>
      </div>

      <div style={{padding:"4px 20px 110px",display:"flex",flexDirection:"column",gap:20}}>
        <div>
          <div style={{fontSize:10,color:C.red,letterSpacing:".2em",marginBottom:10,textTransform:"uppercase"}}>📖 Comprendre</div>
          <p style={{fontSize:14,color:C.t2,lineHeight:1.85,margin:0}}>{wt(c.explication)}</p>
        </div>

        <div style={{padding:"16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12}}>
          <Block title="Exemples concrets" items={c.exemples} color={C.gold} icon="◈"/>
        </div>

        <div style={{padding:"16px",background:"rgba(78,128,96,0.06)",border:"1px solid rgba(78,128,96,0.18)",borderRadius:12}}>
          <Block title="À faire" items={c.a_faire} color={C.green} icon="✅"/>
        </div>

        <div style={{padding:"16px",background:"rgba(201,70,61,0.05)",border:"1px solid rgba(201,70,61,0.15)",borderRadius:12}}>
          <Block title="À éviter" items={c.a_eviter} color={C.red} icon="⚠️"/>
        </div>
      </div>
    </div>
  );
}

function CodesScreen({C,db,isFav,toggleFav,wikiMap,onWikiTap,script}){
  const [cat,setCat] = useState("all");
  const [selected,setSelected] = useState(null);
  const codes = db?.codes_sociaux || [];

  if(selected) return <CodeDetail C={C} c={selected} onBack={()=>setSelected(null)} fav={isFav&&isFav("code",selected)} onFav={toggleFav&&(()=>toggleFav("code",selected))} wikiMap={wikiMap} onWikiTap={onWikiTap} script={script}/>;

  const filtered = cat==="all" ? codes : codes.filter(c=>c.categorie===cat);

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 12px"}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>礼 · CODES SOCIAUX</div>
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:3}}>{script==="romaji"?"Anmoku no rūru":script==="kana"?"あんもくのルール":"暗黙のルール"}</div>
        <div style={{fontSize:13,color:C.t2,marginBottom:18}}>Les règles invisibles à connaître</div>
      </div>

      {/* Category filter */}
      <div style={{display:"flex",gap:8,padding:"0 20px 18px",overflowX:"auto"}}>
        {CODE_CATS.map(k=>{
          const on=k.id===cat;
          return(
            <button key={k.id} onClick={()=>setCat(k.id)} style={{flexShrink:0,padding:"9px 14px",borderRadius:20,cursor:"pointer",background:on?"rgba(201,70,61,0.1)":C.s1,border:`1px solid ${on?C.red:C.border}`,color:on?C.red:C.t2,fontSize:12,display:"flex",alignItems:"center",gap:6,transition:"all .2s"}}>
              <span style={{fontSize:14}}>{k.emoji}</span>{k.label}
            </button>
          );
        })}
      </div>

      {/* Code cards */}
      <div style={{padding:"0 20px 110px",display:"flex",flexDirection:"column",gap:11}}>
        {filtered.map((c,i)=>(
          <div key={i} onClick={()=>setSelected(c)} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",animation:"fadeUp .4s ease"}}>
            <span style={{fontSize:30,flexShrink:0}}>{c.emoji}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:3}}>
                <span style={{fontSize:15,color:C.text,fontWeight:500}}>{c.titre}</span>
                <span style={{fontSize:11,color:C.t3,fontFamily:"'Noto Serif JP',serif"}}>{c.nom_jp}</span>
              </div>
              <div style={{fontSize:12,color:C.t2,lineHeight:1.45,marginBottom:6}}>{c.resume}</div>
              <span style={{fontSize:9,padding:"2px 8px",background:"rgba(201,70,61,0.08)",border:"1px solid rgba(201,70,61,0.18)",borderRadius:20,color:C.red}}>{c.categorie}</span>
            </div>
            <div style={{fontSize:18,color:C.t3,flexShrink:0}}>›</div>
          </div>
        ))}
        {filtered.length===0 && <div style={{padding:"24px",textAlign:"center",color:C.t3,fontSize:12}}>Chargement…</div>}
      </div>
    </div>
  );
}

// ─── Traditions : calendrier annuel ──────────────────────────────────────────
const SEASONS = [
  {id:"quotidien", label:"Quotidien", jp:"日常", emoji:"🏮", color:"#C9463D", months:"Toute l'année"},
  {id:"printemps", label:"Printemps", jp:"春", emoji:"🌸", color:"#D98BA8", months:"Mars – Mai"},
  {id:"été",       label:"Été",       jp:"夏", emoji:"🎆", color:"#5B9BD5", months:"Juin – Août"},
  {id:"automne",   label:"Automne",   jp:"秋", emoji:"🍁", color:"#C97D3C", months:"Sept – Nov"},
  {id:"hiver",     label:"Hiver",     jp:"冬", emoji:"❄️", color:"#7B9BB5", months:"Déc – Fév"},
];

function TraditionDetail({C,t,onBack,fav,onFav,wikiMap,onWikiTap,script}){
  const wt=(text,style)=><WikiText C={C} text={text} style={style} wikiMap={wikiMap||{}} onWikiTap={onWikiTap}/>;
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,animation:"fadeIn .3s ease"}}>
      {/* Hero */}
      <div style={{padding:"50px 20px 24px",background:`linear-gradient(160deg,rgba(201,70,61,0.1) 0%,transparent 90%)`,position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <button onClick={onBack} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.t2,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
            ‹ Calendrier
          </button>
          {onFav&&<FavButton C={C} active={fav} onClick={onFav}/>}
        </div>
        <div style={{fontSize:54,marginBottom:8}}>{t.emoji}</div>
        <div style={{fontSize:11,color:C.red,letterSpacing:".2em",marginBottom:6,textTransform:"uppercase"}}>{t.mois}</div>
        <div style={{fontSize:30,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:2}}>{t.nom}</div>
        <div style={{fontSize:15,color:C.t3,fontFamily:"'Noto Serif JP',serif",marginBottom:10}}>{t.nom_jp}</div>
        <div style={{fontSize:14,color:C.t2,fontStyle:"italic",lineHeight:1.5}}>{t.tagline}</div>
      </div>

      <div style={{padding:"4px 20px 110px",display:"flex",flexDirection:"column",gap:18}}>
        {/* Histoire */}
        <div>
          <div style={{fontSize:10,color:C.red,letterSpacing:".2em",marginBottom:10,textTransform:"uppercase"}}>📜 Histoire & origine</div>
          <p style={{fontSize:14,color:C.t2,lineHeight:1.85,margin:0}}>{wt(t.histoire)}</p>
        </div>

        {/* Rituels */}
        <div>
          <div style={{fontSize:10,color:C.red,letterSpacing:".2em",marginBottom:12,textTransform:"uppercase"}}>⛩️ Rituels traditionnels</div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {t.rituels.map((r,i)=>(
              <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 14px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:10}}>
                <span style={{minWidth:22,height:22,borderRadius:"50%",background:"rgba(201,70,61,0.12)",color:C.red,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                <span style={{fontSize:13,color:C.t2,lineHeight:1.55}}>{wt(r)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Comment la vivre */}
        <div style={{padding:"16px 16px",background:"rgba(78,128,96,0.06)",border:`1px solid rgba(78,128,96,0.18)`,borderRadius:12}}>
          <div style={{fontSize:10,color:C.green,letterSpacing:".2em",marginBottom:12,textTransform:"uppercase"}}>🌿 Comment la vivre aujourd'hui</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {t.comment_vivre.map((c,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{color:C.green,fontSize:13,flexShrink:0}}>◈</span>
                <span style={{fontSize:13,color:C.t2,lineHeight:1.55}}>{wt(c)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gastronomie */}
        <div style={{padding:"14px 16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:22,flexShrink:0}}>🍱</span>
          <div>
            <div style={{fontSize:10,color:C.gold,letterSpacing:".15em",marginBottom:5,textTransform:"uppercase"}}>Gastronomie associée</div>
            <p style={{fontSize:13,color:C.t2,margin:0,lineHeight:1.55}}>{wt(t.gastronomie)}</p>
          </div>
        </div>

        {/* Lieu phare */}
        <div style={{padding:"14px 16px",background:C.s1,border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.red}`,borderRadius:"0 10px 10px 0",display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:22,flexShrink:0}}>📍</span>
          <div>
            <div style={{fontSize:10,color:C.red,letterSpacing:".15em",marginBottom:5,textTransform:"uppercase"}}>Où la vivre au Japon</div>
            <p style={{fontSize:13,color:C.t2,margin:0,lineHeight:1.55}}>{wt(t.lieu_phare)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Écran Histoire ───────────────────────────────────────────────────────────
function HistoireScreen({C, db, script, onBack}){
  const [selected, setSelected] = useState(null);
  const histoire = db?.histoire || [];
  const seasonKey = currentSeasonKey();
  const acc = SEASON_ACCENT[seasonKey];

  if(selected){
    const h = selected;
    return(
      <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
        <div style={{padding:"50px 20px 14px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
          <button onClick={()=>setSelected(null)} style={{background:"transparent",border:"none",color:C.t2,fontSize:13,cursor:"pointer",padding:0,marginBottom:8}}>‹ Histoire</button>
          <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text}}>{h.titre}</div>
          <div style={{fontSize:13,color:C.gold,fontFamily:"'Noto Serif JP',serif"}}>{h.titre_jp} · {h.periode}</div>
        </div>
        <div style={{padding:"20px 20px 110px"}}>
          {/* Bannière thème */}
          <div className="lift" style={{padding:"20px",background:`linear-gradient(135deg,${acc.soft},transparent)`,border:`1px solid ${C.border}`,borderRadius:16,marginBottom:20,textAlign:"center"}}>
            <div style={{fontSize:52,marginBottom:8}}>{h.emoji}</div>
            <div style={{fontSize:12,color:acc.accent,letterSpacing:".15em",textTransform:"uppercase"}}>{h.theme}</div>
          </div>
          {/* Résumé */}
          <div style={{fontSize:15,color:C.text,fontWeight:500,lineHeight:1.6,marginBottom:16,fontStyle:"italic"}}>{h.resume}</div>
          {/* Contenu */}
          <div style={{fontSize:13,color:C.t2,lineHeight:1.75,marginBottom:20}}>{h.contenu}</div>
          {/* Anecdote */}
          {h.anecdote && (
            <div style={{background:"rgba(158,122,26,0.1)",border:"1px solid rgba(158,122,26,0.3)",borderRadius:13,padding:"14px 16px",marginBottom:16}}>
              <div style={{fontSize:9,color:C.gold,letterSpacing:".1em",marginBottom:5,textTransform:"uppercase"}}>💡 Le savais-tu ?</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.6}}>{h.anecdote}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
      <div style={{padding:"50px 20px 14px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:C.t2,fontSize:13,cursor:"pointer",padding:0,marginBottom:8}}>‹ Explorer</button>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>📜 · HISTOIRE</div>
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text}}>歴史 — Histoire du Japon</div>
      </div>

      <div style={{padding:"18px 20px 110px"}}>
        {/* Ligne du temps */}
        <div style={{fontSize:11,color:C.t3,marginBottom:16,textAlign:"center"}}>De la préhistoire à nos jours — {histoire.length} grandes périodes</div>
        {histoire.length===0 && <div style={{color:C.t3,textAlign:"center",padding:"40px 0"}}>Chargement…</div>}
        <div style={{position:"relative"}}>
          {/* Ligne verticale */}
          <div style={{position:"absolute",left:22,top:0,bottom:0,width:2,background:`linear-gradient(to bottom, ${acc.accent}44, ${C.border})`,borderRadius:1}}/>
          <div style={{display:"flex",flexDirection:"column",gap:12}} className="stagger">
            {histoire.map((h,i)=>(
              <div key={h.id} className="lift" onClick={()=>setSelected(h)} style={{display:"flex",gap:14,cursor:"pointer",paddingLeft:4}}>
                {/* Dot sur la timeline */}
                <div style={{flexShrink:0,width:36,height:36,borderRadius:"50%",background:i===histoire.length-1?acc.accent:C.s1,border:`2px solid ${i===histoire.length-1?acc.accent:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,zIndex:1}}>{h.emoji}</div>
                {/* Carte */}
                <div style={{flex:1,background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 14px",marginBottom:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <div style={{fontSize:14,color:C.text,fontWeight:500}}>{h.titre}</div>
                    <span style={{fontSize:18,color:C.t3}}>›</span>
                  </div>
                  <div style={{fontSize:10,color:acc.accent,letterSpacing:".05em",marginBottom:4}}>{h.periode}</div>
                  <div style={{fontSize:11,color:C.t2,lineHeight:1.4}}>{h.resume}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TraditionsScreen({C,db,isFav,toggleFav,wikiMap,onWikiTap,script,initialSeason,onBack}){
  // initialSeason peut valoir "saison" (route générique) ou un id non valide :
  // dans ce cas on retombe sur la saison courante pour éviter un écran noir.
  const validId = SEASONS.some(s=>s.id===initialSeason) ? initialSeason
                 : (initialSeason==="saison" ? currentSeasonKey() : "quotidien");
  const [season,setSeason] = useState(validId);
  const [selected,setSelected] = useState(null);
  const traditions = db?.traditions || [];

  if(selected) return <TraditionDetail C={C} t={selected} onBack={()=>setSelected(null)} fav={isFav&&isFav("tradition",selected)} onFav={toggleFav&&(()=>toggleFav("tradition",selected))} wikiMap={wikiMap} onWikiTap={onWikiTap} script={script}/>;

  // Sécurité : seasonData ne doit jamais être undefined
  const seasonData = SEASONS.find(s=>s.id===season) || SEASONS[0];
  const filtered = traditions.filter(t=>t.saison===season);

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 12px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
        {onBack && <button onClick={onBack} style={{background:"transparent",border:"none",color:C.t2,fontSize:13,cursor:"pointer",padding:0,marginBottom:8}}>‹ Explorer</button>}
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>暦 · TRADITIONS</div>
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:3}}>{script==="romaji"?"Nenchū gyōji":script==="kana"?"ねんちゅうぎょうじ":"年中行事"}</div>
      </div>

      {/* Season selector */}
      <div style={{display:"flex",gap:8,padding:"0 20px 18px",overflowX:"auto"}}>
        {SEASONS.map(s=>{
          const on=s.id===season;
          return(
            <button key={s.id} onClick={()=>setSeason(s.id)} style={{
              flexShrink:0,padding:"10px 16px",borderRadius:14,cursor:"pointer",
              background:on?`${s.color}22`:C.s1,
              border:`1px solid ${on?s.color:C.border}`,
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,minWidth:74,transition:"all .2s"
            }}>
              <span style={{fontSize:20}}>{s.emoji}</span>
              <span style={{fontSize:12,color:on?C.text:C.t2,fontWeight:on?500:400}}>{s.label}</span>
              <span style={{fontSize:8,color:C.t3,letterSpacing:".05em"}}>{s.months}</span>
            </button>
          );
        })}
      </div>

      {/* Season banner */}
      <div style={{margin:"0 20px 16px",padding:"16px 18px",borderRadius:14,background:`linear-gradient(120deg,${seasonData.color}1f 0%,transparent 100%)`,border:`1px solid ${seasonData.color}33`,display:"flex",alignItems:"center",gap:14}}>
        <div style={{fontSize:34,fontFamily:"'Noto Serif JP',serif",color:seasonData.color}}>{seasonData.jp}</div>
        <div>
          <div style={{fontSize:15,color:C.text,fontWeight:500}}>{seasonData.label}</div>
          <div style={{fontSize:11,color:C.t3}}>{filtered.length} traditions à découvrir</div>
        </div>
      </div>

      {/* Tradition cards */}
      <div className="stagger" style={{padding:"0 20px 110px",display:"flex",flexDirection:"column",gap:11}}>
        {filtered.map((t,i)=>(
          <div key={i} className="lift" onClick={()=>setSelected(t)} style={{
            background:C.s1,border:`1px solid ${C.border}`,borderRadius:18,padding:"16px 16px",
            display:"flex",alignItems:"center",gap:14,cursor:"pointer",boxShadow:"0 2px 10px rgba(0,0,0,0.03)"
          }}>
            <span style={{fontSize:32,flexShrink:0}}>{t.emoji}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:3}}>
                <span style={{fontSize:15,color:C.text,fontWeight:500}}>{t.nom}</span>
                <span style={{fontSize:12,color:C.t3,fontFamily:"'Noto Serif JP',serif"}}>{t.nom_jp}</span>
              </div>
              <div style={{fontSize:12,color:C.t2,lineHeight:1.45,marginBottom:5}}>{t.tagline}</div>
              <span style={{fontSize:10,padding:"2px 9px",background:`${seasonData.color}1a`,border:`1px solid ${seasonData.color}40`,borderRadius:20,color:seasonData.color}}>{t.mois}</span>
            </div>
            <div style={{fontSize:18,color:C.t3,flexShrink:0}}>›</div>
          </div>
        ))}
        {filtered.length===0 && (
          <div style={{padding:"24px",textAlign:"center",color:C.t3,fontSize:12}}>Chargement…</div>
        )}
      </div>
    </div>
  );
}

// ─── Scénarios interactifs ────────────────────────────────────────────────────
function ScenarioPlay({C, s, script, onExit, onComplete, alreadyDone}){
  const [step,setStep] = useState(0);
  const [picked,setPicked] = useState(null);
  const [score,setScore] = useState(0);
  const [finished,setFinished] = useState(false);
  // Romaji masqué par défaut dès le niveau Intermédiaire (mais affichable)
  const hideRomajiByLevel = s.niveau==="Intermédiaire" || s.niveau==="Avancé";
  const [showRomaji,setShowRomaji] = useState(!hideRomajiByLevel);
  const etape = s.etapes[step];

  const choose = (choix)=>{
    if(picked) return;
    setPicked(choix);
    if(choix.correct) setScore(v=>v+1);
  };
  const nextStep = ()=>{
    if(step < s.etapes.length-1){ setStep(step+1); setPicked(null); }
    else {
      setFinished(true);
      const perfect = score === s.etapes.length;
      // reward only first successful (>=70%) completion
      if(!alreadyDone && score/s.etapes.length >= 0.7) onComplete(s);
    }
  };

  if(finished){
    const pct = Math.round((score/s.etapes.length)*100);
    const passed = score/s.etapes.length >= 0.7;
    const earned = passed && !alreadyDone;
    return(
      <div style={{padding:"60px 24px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        {/* Confettis si réussi */}
        {passed && (
          <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
            {Array.from({length:pct===100?18:12}).map((_,i)=>(
              <div key={i} style={{position:"absolute",top:"-10%",left:`${(i*6+4)%100}%`,fontSize:`${12+(i%3)*6}px`,animation:`fall ${1.6+(i%4)*0.4}s ease-in ${(i%6)*0.12}s both`}}>{["🎊","✨","🎉","🎌","⭐","🌸"][i%6]}</div>
            ))}
          </div>
        )}
        <div style={{fontSize:60,marginBottom:14,display:"inline-block",animation:passed?"bounceIn .6s cubic-bezier(.34,1.56,.64,1)":"fadeUp .4s ease"}}>{pct===100?"🏆":passed?"🎉":"📚"}</div>
        <div style={{fontSize:22,color:C.text,fontWeight:500,marginBottom:6,animation:"fadeUp .4s ease .1s both"}}>{pct===100?"Parfait !":passed?"Bien joué !":"Continue à pratiquer"}</div>
        <div style={{fontSize:15,color:C.t2,marginBottom:8,animation:"fadeUp .4s ease .18s both"}}>Score : <b style={{color:s.couleur}}>{score}</b> / {s.etapes.length} ({pct}%)</div>
        {earned ? (
          <div style={{margin:"18px 0",padding:"16px",background:"rgba(78,128,96,0.1)",border:"1px solid rgba(78,128,96,0.3)",borderRadius:14,animation:"popBounce .6s cubic-bezier(.34,1.56,.64,1) .3s both"}}>
            <div style={{fontSize:13,color:C.green,fontWeight:600,marginBottom:4}}>Scénario validé ! ✓</div>
            <div style={{fontSize:13,color:C.t2}}>Tu maîtrises cette situation 🎌</div>
          </div>
        ) : alreadyDone && passed ? (
          <div style={{margin:"18px 0",fontSize:12,color:C.t3}}>Déjà complété ✓</div>
        ) : !passed ? (
          <div style={{margin:"18px 0",fontSize:12,color:C.t3}}>Atteins 70% pour valider ce scénario</div>
        ) : null}
        <div style={{display:"flex",gap:11,marginTop:8}}>
          <button onClick={()=>{setStep(0);setPicked(null);setScore(0);setFinished(false);}} className="pop-press" style={{flex:1,padding:"14px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:13,cursor:"pointer"}}>Recommencer</button>
          <button onClick={onExit} className="pop-press" style={{flex:1,padding:"14px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Terminer</button>
        </div>
      </div>
    );
  }

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 10px"}}>
        <button onClick={onExit} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.t2,fontSize:12,cursor:"pointer",marginBottom:16}}>‹ Quitter</button>
        {/* Progress */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <div style={{flex:1,height:5,background:C.s3,borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(step/s.etapes.length)*100}%`,background:s.couleur,borderRadius:3,transition:"width .3s"}}/>
          </div>
          <span style={{fontSize:11,color:C.t3}}>{step+1}/{s.etapes.length}</span>
        </div>
      </div>

      <div style={{padding:"10px 20px 110px"}}>
        {/* Situation */}
        <div style={{padding:"18px",background:`${s.couleur}11`,border:`1px solid ${s.couleur}33`,borderRadius:14,marginBottom:18}}>
          <div style={{fontSize:10,color:s.couleur,letterSpacing:".2em",marginBottom:8,textTransform:"uppercase"}}>{s.emoji} Situation</div>
          <div style={{fontSize:15,color:C.text,lineHeight:1.55}}>{script==="romaji" && etape.situation_romaji ? etape.situation_romaji : etape.situation}</div>
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,gap:10}}>
          <div style={{fontSize:13,color:C.t2,fontWeight:500,flex:1}}>{etape.question}</div>
          {hideRomajiByLevel && (
            <button onClick={()=>setShowRomaji(v=>!v)} className="pop-press" style={{flexShrink:0,fontSize:11,padding:"5px 11px",background:showRomaji?C.s2:"transparent",border:`1px solid ${showRomaji?s.couleur+"55":C.border}`,borderRadius:16,color:showRomaji?s.couleur:C.t3,cursor:"pointer",whiteSpace:"nowrap"}}>
              {showRomaji ? "あ Masquer rōmaji" : "A Afficher rōmaji"}
            </button>
          )}
        </div>

        {/* Choices */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {etape.choix.map((c,i)=>{
            let bg=C.s1, bd=C.border, anim="none";
            if(picked){
              if(c.correct){ bg="rgba(78,128,96,0.1)"; bd="rgba(78,128,96,0.4)"; if(picked===c) anim="bounceIn .5s ease"; }
              else if(c===picked){ bg="rgba(201,70,61,0.08)"; bd="rgba(201,70,61,0.4)"; anim="shake .4s ease"; }
            }
            return(
              <div key={i} onClick={()=>!picked&&choose(c)} className={picked?"":"lift"} style={{textAlign:"left",padding:"14px 16px",background:bg,border:`1px solid ${bd}`,borderRadius:12,cursor:picked?"default":"pointer",transition:"all .25s",animation:anim}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    {c.jp && <div style={{fontSize:15,fontFamily:"'Noto Serif JP',serif",color:C.text,marginBottom:2}}>{jpMain(c, script)}</div>}
                    {c.jp && showRomaji && jpSub(c, script) && <div style={{fontSize:11,color:C.t3,fontStyle:"italic",marginBottom:3}}>{jpSub(c, script)}</div>}
                    <div style={{fontSize:13,color:C.t2}}>{c.fr}</div>
                  </div>
                  {picked && c.jp && <SpeakButton C={C} text={c.jp} color={s.couleur}/>}
                </div>
                {picked===c && <div style={{marginTop:4,fontSize:12,color:c.correct?C.green:C.red,animation:"fadeIn .4s ease .15s both"}}>{c.correct?"✓ ":"✕ "}{c.feedback}</div>}
                {picked && c.correct && picked!==c && <div style={{marginTop:4,fontSize:12,color:C.green,animation:"fadeIn .4s ease .15s both"}}>✓ {c.feedback}</div>}
              </div>
            );
          })}
        </div>

        {picked && (
          <button onClick={nextStep} style={{marginTop:18,width:"100%",padding:"15px",background:s.couleur,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>
            {step < s.etapes.length-1 ? "Continuer →" : "Voir le résultat"}
          </button>
        )}
      </div>
    </div>
  );
}

function ScenariosScreen({C,script,db,scenariosDone,completeScenario}){
  const [active,setActive] = useState(null);
  const [levelFilter,setLevelFilter] = useState("Tous");
  const LEVEL_ORDER = { "Débutant":0, "Intermédiaire":1, "Avancé":2 };
  const allScenarios = [...(db?.scenarios || [])].sort((a,b)=>
    (LEVEL_ORDER[a.niveau]??1) - (LEVEL_ORDER[b.niveau]??1)
  );
  const scenarios = levelFilter==="Tous" ? allScenarios : allScenarios.filter(s=>s.niveau===levelFilter);
  const seasonKey = currentSeasonKey();
  const acc = SEASON_ACCENT[seasonKey];
  const done = (s)=> scenariosDone?.includes(s.id);
  const totalDone = scenarios.filter(done).length;

  if(active) return <ScenarioPlay C={C} s={active} script={script} onExit={()=>setActive(null)} onComplete={completeScenario} alreadyDone={done(active)}/>;

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
      {/* Header sticky */}
      <div style={{padding:"50px 20px 12px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>場 · SCÉNARIOS</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12}}>
          <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text}}>{script==="romaji"?"Shinario":script==="kana"?"シナリオ":"シナリオ"}</div>
          {totalDone>0 && <div style={{fontSize:12,color:acc.accent,fontWeight:500}}>{totalDone}/{allScenarios.length} complétés</div>}
        </div>
        {/* Filtre par difficulté */}
        <div style={{display:"flex",gap:8,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:2}}>
          {[
            {id:"Tous",label:"Tous",emoji:"📋"},
            {id:"Débutant",label:"Débutant",emoji:"🟢"},
            {id:"Intermédiaire",label:"Intermédiaire",emoji:"🟡"},
            {id:"Avancé",label:"Avancé",emoji:"🔴"},
          ].map(f=>{
            const on = levelFilter===f.id;
            return(
              <button key={f.id} onClick={()=>setLevelFilter(f.id)} className="pop-press" style={{flexShrink:0,padding:"7px 13px",borderRadius:18,border:`1px solid ${on?acc.accent:C.border}`,background:on?acc.accent:C.s1,color:on?"#fff":C.t2,fontSize:12,fontWeight:on?600:500,cursor:"pointer",whiteSpace:"nowrap"}}>
                {f.emoji} {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{padding:"18px 20px 110px"}}>
        {/* Intro */}
        <div style={{padding:"14px 16px",background:acc.soft,border:`1px solid ${C.border}`,borderRadius:14,marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:24}}>🎭</span>
          <div style={{fontSize:12,color:C.t2,lineHeight:1.5}}>Entraîne-toi dans de vraies situations japonaises et valide chaque scénario pour progresser.</div>
        </div>

        {/* Liste des scénarios, groupés par niveau */}
        <div style={{display:"flex",flexDirection:"column",gap:12}} className="stagger">
          {scenarios.map((s,i)=>{
            const isDone = done(s);
            const prevLevel = i>0 ? scenarios[i-1].niveau : null;
            const showSeparator = levelFilter==="Tous" && s.niveau !== prevLevel;
            const levelEmoji = {"Débutant":"🟢","Intermédiaire":"🟡","Avancé":"🔴"}[s.niveau] || "";
            return(
              <div key={i}>
                {showSeparator && (
                  <div style={{display:"flex",alignItems:"center",gap:8,margin:i===0?"0 0 12px":"16px 0 12px"}}>
                    <div style={{flex:1,height:1,background:C.border}}/>
                    <span style={{fontSize:10,color:C.t3,letterSpacing:".15em",textTransform:"uppercase",flexShrink:0}}>{levelEmoji} {s.niveau}</span>
                    <div style={{flex:1,height:1,background:C.border}}/>
                  </div>
                )}
                <div className="lift" onClick={()=>setActive(s)} style={{position:"relative",borderRadius:18,overflow:"hidden",cursor:"pointer",border:`1px solid ${isDone?"rgba(78,128,96,0.3)":s.couleur+"44"}`,boxShadow:isDone?"0 2px 12px rgba(58,102,69,0.08)":"none"}}>
                  {/* Barre couleur en haut */}
                  <div style={{height:3,background:`linear-gradient(90deg,${s.couleur},${s.couleur}44)`}}/>
                  <div style={{background:`linear-gradient(135deg,${s.couleur}18 0%,transparent 100%)`,padding:"16px 18px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>
                      <div style={{width:52,height:52,borderRadius:14,background:`${s.couleur}22`,border:`1px solid ${s.couleur}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0}}>{s.emoji}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                          <span style={{fontSize:15,color:C.text,fontWeight:600}}>{s.titre}</span>
                          <span style={{fontSize:11,color:C.t3,fontFamily:"'Noto Serif JP',serif"}}>{s.nom_jp}</span>
                        </div>
                        <div style={{fontSize:12,color:C.t2,lineHeight:1.4,marginBottom:8}}>{s.contexte}</div>
                        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                          <span style={{fontSize:10,padding:"3px 9px",border:`1px solid ${s.couleur}55`,borderRadius:20,color:s.couleur,fontWeight:500}}>{s.niveau}</span>
                          <span style={{fontSize:10,padding:"3px 9px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:20,color:C.t2}}>{s.etapes.length} étapes</span>
                          {isDone && <span style={{fontSize:10,padding:"3px 9px",background:"rgba(78,128,96,0.12)",border:"1px solid rgba(78,128,96,0.3)",borderRadius:20,color:C.green}}>✓ Complété</span>}
                        </div>
                      </div>
                      <span style={{fontSize:20,color:isDone?C.green:acc.accent,flexShrink:0}}>{isDone?"✓":"›"}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {scenarios.length===0 && <div style={{padding:"24px",textAlign:"center",color:C.t3,fontSize:12}}>Chargement…</div>}
        </div>
      </div>
    </div>
  );
}

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
function FlashcardMode({C, deck, onExit}){
  const [cards] = useState(()=>shuffle(deck));
  const [idx,setIdx] = useState(0);
  const [flipped,setFlipped] = useState(false);
  const [known,setKnown] = useState(0);
  const [drag,setDrag] = useState({x:0, active:false}); // current drag offset
  const start = useRef(0);
  const card = cards[idx];
  const done = idx >= cards.length;

  const SWIPE_THRESHOLD = 90;

  const commit = (gotIt)=>{
    // fly the card off-screen then advance
    setDrag({x: gotIt?500:-500, active:false});
    if(gotIt) setKnown(k=>k+1);
    setTimeout(()=>{
      setFlipped(false);
      setDrag({x:0, active:false});
      setIdx(i=>i+1);
    }, 180);
  };

  const onStart = (clientX)=>{ start.current = clientX; setDrag(d=>({...d, active:true})); };
  const onMove = (clientX)=>{ if(!drag.active) return; setDrag({x: clientX-start.current, active:true}); };
  const onEnd = ()=>{
    if(!drag.active) return;
    if(drag.x > SWIPE_THRESHOLD) commit(true);
    else if(drag.x < -SWIPE_THRESHOLD) commit(false);
    else setDrag({x:0, active:false}); // snap back
  };

  if(done) return (
    <div style={{padding:"40px 24px",textAlign:"center"}}>
      <div style={{fontSize:54,marginBottom:14}}>🎉</div>
      <div style={{fontSize:20,color:C.text,fontWeight:500,marginBottom:8}}>Série terminée !</div>
      <div style={{fontSize:14,color:C.t2,marginBottom:26}}>Tu as reconnu <b style={{color:C.green}}>{known}</b> / {cards.length} caractères</div>
      <button onClick={onExit} style={{width:"100%",padding:"14px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Retour</button>
    </div>
  );

  const rot = drag.x / 18; // tilt while dragging
  const knowOpacity = Math.max(0, Math.min(1, drag.x / SWIPE_THRESHOLD));
  const revOpacity  = Math.max(0, Math.min(1, -drag.x / SWIPE_THRESHOLD));

  return(
    <div style={{padding:"10px 24px 30px"}}>
      {/* Progress */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
        <div style={{flex:1,height:5,background:C.s3,borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(idx/cards.length)*100}%`,background:C.red,borderRadius:3,transition:"width .3s"}}/>
        </div>
        <span style={{fontSize:11,color:C.t3}}>{idx+1}/{cards.length}</span>
      </div>

      {/* Swipe hints */}
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,fontSize:10,letterSpacing:".05em"}}>
        <span style={{color:C.t3}}>← À revoir</span>
        <span style={{color:C.t3}}>Je connais →</span>
      </div>

      {/* Card */}
      <div
        onMouseDown={e=>onStart(e.clientX)}
        onMouseMove={e=>onMove(e.clientX)}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={e=>onStart(e.touches[0].clientX)}
        onTouchMove={e=>onMove(e.touches[0].clientX)}
        onTouchEnd={onEnd}
        onClick={()=>{ if(Math.abs(drag.x)<6) setFlipped(f=>!f); }}
        style={{
          height:280, borderRadius:20, cursor:"grab", marginBottom:20, userSelect:"none",
          transform:`translateX(${drag.x}px) rotate(${rot}deg)`,
          transition: drag.active ? "none" : "transform .25s ease",
          background:flipped?"linear-gradient(160deg,rgba(201,70,61,0.12),transparent)":C.s1,
          border:`1px solid ${flipped?"rgba(201,70,61,0.3)":C.border}`,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          position:"relative", overflow:"hidden", touchAction:"pan-y"
        }}>
        {/* Swipe overlays */}
        <div style={{position:"absolute",top:16,right:16,padding:"6px 12px",borderRadius:10,border:`2px solid ${C.green}`,color:C.green,fontSize:13,fontWeight:700,transform:"rotate(12deg)",opacity:knowOpacity}}>CONNU ✓</div>
        <div style={{position:"absolute",top:16,left:16,padding:"6px 12px",borderRadius:10,border:`2px solid ${C.red}`,color:C.red,fontSize:13,fontWeight:700,transform:"rotate(-12deg)",opacity:revOpacity}}>À REVOIR</div>

        {!flipped ? (
          <>
            <div style={{fontSize:120,fontFamily:"'Noto Serif JP',serif",color:C.text,lineHeight:1}}>{card.k}</div>
            <div style={{position:"absolute",bottom:18,fontSize:11,color:C.t3}}>Touche pour révéler · glisse pour répondre</div>
          </>
        ) : (
          <>
            <div style={{fontSize:64,fontFamily:"'Noto Serif JP',serif",color:C.t3,marginBottom:8}}>{card.k}</div>
            <div style={{fontSize:44,color:C.red,fontWeight:600,letterSpacing:".05em"}}>{card.r}</div>
          </>
        )}
      </div>

      {/* Buttons (alternative to swipe) */}
      <div style={{display:"flex",gap:11}}>
        <button onClick={()=>commit(false)} style={{flex:1,padding:"14px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:13,cursor:"pointer"}}>À revoir</button>
        <button onClick={()=>commit(true)} style={{flex:1,padding:"14px",background:"rgba(78,128,96,0.12)",border:"1px solid rgba(78,128,96,0.3)",borderRadius:12,color:C.green,fontSize:13,fontWeight:600,cursor:"pointer"}}>Je connais ✓</button>
      </div>
    </div>
  );
}

// ── Mode Dessin : "Dessine le kana qui se prononce X" ──
function DrawKanaMode({C, deck, onExit, onRecord}){
  const [order] = useState(()=> [...deck].sort(()=>Math.random()-0.5));
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showMyTrace, setShowMyTrace] = useState(true); // afficher mon tracé par-dessus le modèle
  const [animKey, setAnimKey] = useState(0); // relance l'animation du modèle
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPt = useRef(null);
  const card = order[idx];
  const total = order.length;

  // Prépare le canvas (haute résolution)
  const setupCanvas = ()=>{
    const cv = canvasRef.current;
    if(!cv) return;
    const rect = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = rect.width * dpr;
    cv.height = rect.height * dpr;
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 14;
    ctx.strokeStyle = C.red;
  };
  useEffect(()=>{ setupCanvas(); }, [idx]);

  const getPos = (e)=>{
    const cv = canvasRef.current;
    const rect = cv.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  };
  const start = (e)=>{ e.preventDefault(); drawing.current = true; lastPt.current = getPos(e); setHasDrawn(true); };
  const move = (e)=>{
    if(!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPt.current.x, lastPt.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPt.current = p;
  };
  const end = (e)=>{ e && e.preventDefault(); drawing.current = false; };

  const clearCanvas = ()=>{
    const cv = canvasRef.current;
    if(!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0,0,cv.width,cv.height);
    setHasDrawn(false);
  };

  const reveal = ()=>{ setRevealed(true); setShowMyTrace(true); setAnimKey(k=>k+1); };
  const next = (known)=>{
    if(onRecord && card) onRecord(card.k, known);
    clearCanvas();
    setRevealed(false);
    setHasDrawn(false);
    setShowMyTrace(true);
    if(idx+1 < total) setIdx(idx+1);
    else { setIdx(0); } // boucle
  };

  if(!card) return null;

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
      <div style={{padding:"6px 20px 110px",maxWidth:480,margin:"0 auto"}}>
        {/* Progression */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
          <div style={{flex:1,height:5,background:C.s3,borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${((idx)/total)*100}%`,background:C.red,borderRadius:3,transition:"width .3s"}}/>
          </div>
          <span style={{fontSize:11,color:C.t3,fontWeight:600}}>{idx+1}/{total}</span>
        </div>

        {/* Consigne */}
        <div style={{textAlign:"center",marginBottom:14}}>
          <div style={{fontSize:11,color:C.t3,letterSpacing:".15em",textTransform:"uppercase",marginBottom:8}}>Dessine le kana qui se prononce</div>
          <div style={{fontSize:46,fontWeight:700,color:C.red,fontFamily:"'Noto Serif JP',serif",lineHeight:1}}>{card.r}</div>
        </div>

        {/* Zone de dessin */}
        <div style={{position:"relative",width:"100%",aspectRatio:"1",maxWidth:300,margin:"0 auto 16px",background:C.s1,border:`2px solid ${revealed?C.green:C.border}`,borderRadius:18,overflow:"hidden",transition:"border-color .3s"}}>
          {/* Grille repère (croix centrale en pointillés) */}
          <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
            <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:1,borderLeft:`1px dashed ${C.border}`}}/>
            <div style={{position:"absolute",top:"50%",left:0,right:0,height:1,borderTop:`1px dashed ${C.border}`}}/>
          </div>
          {/* Modèle — invisible tant que l'utilisateur n'a pas vérifié (test de rappel) */}
          <div key={animKey} style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",fontSize:200,fontFamily:"'Noto Serif JP',serif",color:C.green,opacity:revealed?1:0,zIndex:1,transition:"opacity .3s",animation:revealed?"drawReveal 1.1s ease forwards":"none"}}>
            {card.k}
          </div>
          {/* Canvas de tracé — fantôme (25%) au-dessus du modèle quand révélé, masquable */}
          <canvas ref={canvasRef}
            onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
            onTouchStart={start} onTouchMove={move} onTouchEnd={end}
            style={{position:"absolute",inset:0,width:"100%",height:"100%",zIndex:2,touchAction:"none",cursor:revealed?"default":"crosshair",pointerEvents:revealed?"none":"auto",opacity:revealed?(showMyTrace?0.3:0):1,transition:"opacity .3s"}}
          />
        </div>

        {/* Actions */}
        {!revealed ? (
          <div style={{display:"flex",gap:10,maxWidth:300,margin:"0 auto"}}>
            <button onClick={clearCanvas} style={{flex:1,padding:"13px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:13,fontWeight:500,cursor:"pointer"}}>Effacer</button>
            <button onClick={reveal} style={{flex:2,padding:"13px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Vérifier le tracé</button>
          </div>
        ) : (
          <div style={{maxWidth:300,margin:"0 auto"}}>
            <div style={{textAlign:"center",marginBottom:6}}>
              <span style={{fontSize:13,color:C.text}}>Le kana <b style={{color:C.green,fontFamily:"'Noto Serif JP',serif",fontSize:18}}>{card.k}</b> se prononce <b>{card.r}</b></span>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <button onClick={reveal} style={{flex:1,padding:"9px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,color:C.t2,fontSize:12,cursor:"pointer"}}>↻ Rejouer</button>
              <button onClick={()=>setShowMyTrace(v=>!v)} style={{flex:1,padding:"9px",background:showMyTrace?C.s2:"transparent",border:`1px solid ${showMyTrace?C.red:C.border}`,borderRadius:10,color:showMyTrace?C.text:C.t3,fontSize:12,cursor:"pointer"}}>{showMyTrace?"👁 Mon tracé":"👁‍🗨 Masqué"}</button>
            </div>
            <div style={{fontSize:11,color:C.t3,textAlign:"center",marginBottom:10}}>Comment était ton tracé ?</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>next(false)} style={{flex:1,padding:"13px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:13,fontWeight:500,cursor:"pointer"}}>À revoir</button>
              <button onClick={()=>next(true)} style={{flex:1,padding:"13px",background:C.green,border:"none",borderRadius:12,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Réussi ✓</button>
            </div>
          </div>
        )}

        {/* Astuce ordre des traits */}
        {!revealed && !hasDrawn && (
          <div style={{marginTop:18,padding:"11px 14px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,fontSize:11,color:C.t2,textAlign:"center",maxWidth:300,margin:"18px auto 0",lineHeight:1.5}}>
            💡 Trace de mémoire, puis vérifie. En japonais, on écrit généralement de haut en bas et de gauche à droite.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quiz mode ──
function QuizMode({C, deck, onExit}){
  const [cards] = useState(()=>shuffle(deck));
  const [idx,setIdx] = useState(0);
  const [score,setScore] = useState(0);
  const [picked,setPicked] = useState(null);
  const card = cards[idx];
  const done = idx >= cards.length;

  // build 4 options (1 correct + 3 distractors)
  const options = useState(()=>cards.map(c=>{
    const others = shuffle(deck.filter(x=>x.r!==c.r)).slice(0,3);
    return shuffle([c, ...others]);
  }))[0];

  const choose = (opt)=>{
    if(picked) return;
    setPicked(opt.r);
    if(opt.r===card.r) setScore(s=>s+1);
    setTimeout(()=>{ setPicked(null); setIdx(i=>i+1); }, 850);
  };

  if(done) return (
    <div style={{padding:"40px 24px",textAlign:"center",position:"relative",overflow:"hidden"}}>
      {score/cards.length>=0.8 && (
        <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
          {Array.from({length:14}).map((_,i)=>(
            <div key={i} style={{position:"absolute",top:"-10%",left:`${(i*7+5)%100}%`,fontSize:`${12+(i%3)*5}px`,animation:`fall ${1.5+(i%4)*0.4}s ease-in ${(i%5)*0.15}s both`}}>{["🎊","✨","⭐","🎌","🌸"][i%5]}</div>
          ))}
        </div>
      )}
      <div style={{fontSize:54,marginBottom:14,display:"inline-block",animation:"bounceIn .6s cubic-bezier(.34,1.56,.64,1)"}}>{score/cards.length>=0.8?"🏆":score/cards.length>=0.5?"👍":"📚"}</div>
      <div style={{fontSize:20,color:C.text,fontWeight:500,marginBottom:8,animation:"fadeUp .4s ease .1s both"}}>Quiz terminé !</div>
      <div style={{fontSize:14,color:C.t2,marginBottom:26,animation:"fadeUp .4s ease .18s both"}}>Score : <b style={{color:C.red}}>{score}</b> / {cards.length}</div>
      <button onClick={onExit} className="pop-press" style={{width:"100%",padding:"14px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Retour</button>
    </div>
  );

  return(
    <div style={{padding:"10px 24px 30px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:30}}>
        <div style={{flex:1,height:5,background:C.s3,borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(idx/cards.length)*100}%`,background:C.red,borderRadius:3,transition:"width .3s"}}/>
        </div>
        <span style={{fontSize:11,color:C.t3}}>{idx+1}/{cards.length}</span>
      </div>

      <div style={{textAlign:"center",marginBottom:30}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".2em",marginBottom:14,textTransform:"uppercase"}}>Quelle est la lecture ?</div>
        <div style={{fontSize:100,fontFamily:"'Noto Serif JP',serif",color:C.text,lineHeight:1}}>{card.k}</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
        {options[idx].map((opt,i)=>{
          let bg=C.s1, bd=C.border, col=C.text, anim="none";
          if(picked){
            if(opt.r===card.r){ bg="rgba(78,128,96,0.15)"; bd="rgba(78,128,96,0.4)"; col=C.green; anim="bounceIn .5s ease"; }
            else if(opt.r===picked){ bg="rgba(201,70,61,0.12)"; bd="rgba(201,70,61,0.4)"; col=C.red; anim="shake .4s ease"; }
          }
          return(
            <button key={i} onClick={()=>choose(opt)} className={picked?"":"pop-press"} style={{padding:"18px",background:bg,border:`1px solid ${bd}`,borderRadius:14,color:col,fontSize:20,fontWeight:600,cursor:picked?"default":"pointer",transition:"all .2s",animation:anim}}>
              {opt.r}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Situations courantes (phrases utiles) ────────────────────────────────────
const SITUATIONS = [
  {id:"resto", emoji:"🍜", title:"Au restaurant", jp:"レストラン", color:"#3A6645", niveau:"Débutant",
   phrases:[
     {jp:"メニューをください", romaji:"Menyū wo kudasai", fr:"Le menu, s'il vous plaît"},
     {jp:"これをお願いします", romaji:"Kore wo onegai shimasu", fr:"Ceci, s'il vous plaît (en pointant)"},
     {jp:"おすすめは何ですか", romaji:"Osusume wa nan desu ka", fr:"Quelle est votre recommandation ?"},
     {jp:"お会計お願いします", romaji:"Okaikei onegai shimasu", fr:"L'addition, s'il vous plaît"},
     {jp:"とても美味しいです", romaji:"Totemo oishii desu", fr:"C'est très bon"},
     {jp:"いただきます", romaji:"Itadakimasu", fr:"Bon appétit (avant de manger)"},
     {jp:"ごちそうさまでした", romaji:"Gochisōsama deshita", fr:"Merci pour le repas (après)"},
   ]},
  {id:"konbini", emoji:"🏪", title:"Au konbini", jp:"コンビニ", color:"#3A6645", niveau:"Débutant",
   phrases:[
     {jp:"袋はいりません", romaji:"Fukuro wa irimasen", fr:"Je n'ai pas besoin de sac"},
     {jp:"温めてください", romaji:"Atatamete kudasai", fr:"Réchauffez-le, s'il vous plaît"},
     {jp:"カードで払えますか", romaji:"Kādo de haraemasu ka", fr:"Puis-je payer par carte ?"},
     {jp:"これはいくらですか", romaji:"Kore wa ikura desu ka", fr:"Combien coûte ceci ?"},
     {jp:"お箸をください", romaji:"Ohashi wo kudasai", fr:"Des baguettes, s'il vous plaît"},
   ]},
  {id:"gare", emoji:"🚉", title:"Gare & transports", jp:"駅・交通", color:"#9E7A1A", niveau:"Intermédiaire",
   phrases:[
     {jp:"東京駅までいくらですか", romaji:"Tōkyō-eki made ikura desu ka", fr:"Combien jusqu'à la gare de Tokyo ?"},
     {jp:"この電車は新宿に行きますか", romaji:"Kono densha wa Shinjuku ni ikimasu ka", fr:"Ce train va-t-il à Shinjuku ?"},
     {jp:"切符はどこで買えますか", romaji:"Kippu wa doko de kaemasu ka", fr:"Où puis-je acheter un billet ?"},
     {jp:"次の駅は何ですか", romaji:"Tsugi no eki wa nan desu ka", fr:"Quelle est la prochaine station ?"},
     {jp:"乗り換えはどこですか", romaji:"Norikae wa doko desu ka", fr:"Où est la correspondance ?"},
   ]},
  {id:"social", emoji:"🤝", title:"Rencontre sociale", jp:"出会い", color:"#9E7A1A", niveau:"Intermédiaire",
   phrases:[
     {jp:"はじめまして", romaji:"Hajimemashite", fr:"Enchanté (première rencontre)"},
     {jp:"よろしくお願いします", romaji:"Yoroshiku onegai shimasu", fr:"Ravi de faire votre connaissance"},
     {jp:"お名前は何ですか", romaji:"Onamae wa nan desu ka", fr:"Comment vous appelez-vous ?"},
     {jp:"出身はどちらですか", romaji:"Shusshin wa dochira desu ka", fr:"D'où venez-vous ?"},
     {jp:"また会いましょう", romaji:"Mata aimashō", fr:"Revoyons-nous"},
   ]},
  {id:"entreprise", emoji:"💼", title:"En entreprise", jp:"会社で", color:"#C9463D", niveau:"Avancé",
   phrases:[
     {jp:"お世話になっております", romaji:"Osewa ni natte orimasu", fr:"Formule de politesse pro (intraduisible)"},
     {jp:"お疲れ様です", romaji:"Otsukaresama desu", fr:"Bon courage / merci pour le travail"},
     {jp:"よろしくお願いいたします", romaji:"Yoroshiku onegai itashimasu", fr:"Formule de clôture polie"},
     {jp:"少々お待ちください", romaji:"Shōshō omachi kudasai", fr:"Un instant, s'il vous plaît"},
     {jp:"申し訳ございません", romaji:"Mōshiwake gozaimasen", fr:"Je suis vraiment désolé (formel)"},
   ]},
];

const LEARN_DECKS = [
  {id:"hira", label:"Hiragana", jp:"ひらがな", emoji:"あ", deck:HIRAGANA, desc:"46 caractères de base · mots japonais", group:"Bases"},
  {id:"kata", label:"Katakana", jp:"カタカナ", emoji:"ア", deck:KATAKANA, desc:"46 caractères de base · mots étrangers", group:"Bases"},
  {id:"hira_dak", label:"Hiragana — dakuten", jp:"濁音", emoji:"が", deck:HIRAGANA_DAKUTEN, desc:"25 sons voisés (が ざ だ ば ぱ)", group:"Avancé"},
  {id:"hira_combo", label:"Hiragana — combinaisons", jp:"拗音", emoji:"きゃ", deck:HIRAGANA_COMBO, desc:"30 combinaisons (きゃ しゅ ちょ…)", group:"Avancé"},
  {id:"kata_dak", label:"Katakana — dakuten", jp:"濁音", emoji:"ガ", deck:KATAKANA_DAKUTEN, desc:"25 sons voisés (ガ ザ ダ バ パ)", group:"Avancé"},
  {id:"kata_combo", label:"Katakana — combinaisons", jp:"拗音", emoji:"キャ", deck:KATAKANA_COMBO, desc:"30 combinaisons (キャ シュ チョ…)", group:"Avancé"},
];

// ─── Parcours "Survivre à Tokyo" ──────────────────────────────────────────────
// 8 paliers : fondations (lire) puis situations dans l'ordre d'un voyage.
const TOKYO_PATH = [
  {id:"p1", type:"kana",    deckId:"hira",            emoji:"あ", title:"Lire l'hiragana",     goal:"Reconnaître les 46 sons de base — la fondation de toute lecture."},
  {id:"p2", type:"kana",    deckId:"kata",            emoji:"ア", title:"Lire le katakana",     goal:"Déchiffrer menus et marques en katakana (コーヒー, トイレ…)."},
  {id:"p3", type:"phrases", situationId:"politesse",  emoji:"🙇", title:"Les politesses",       goal:"Saluer, remercier, s'excuser — le socle social japonais."},
  {id:"p4", type:"phrases", situationId:"urgence",    emoji:"🆘", title:"Se débrouiller",       goal:"Demander de l'aide, son chemin, dire qu'on ne comprend pas."},
  {id:"p5", type:"phrases", situationId:"konbini",    emoji:"🏪", title:"Au konbini",           goal:"Demander un prix, payer (carte ou espèces), gérer le passage en caisse."},
  {id:"p6", type:"phrases", situationId:"restaurant", emoji:"🍜", title:"Au restaurant",        goal:"Commander, demander l'addition, complimenter le repas."},
  {id:"p7", type:"phrases", situationId:"train",      emoji:"🚃", title:"Prendre le train",     goal:"Acheter un billet, trouver sa correspondance, descendre au bon arrêt."},
  {id:"p8", type:"final",                             emoji:"🗼", title:"Une journée à Tokyo",  goal:"Le grand test : enchaîne des situations réelles d'une journée."},
];
const PATH_KEY = "isekaid_path_v1";
function loadPathProgress(){
  try { const raw=localStorage.getItem(PATH_KEY); return raw?JSON.parse(raw):{completed:[]}; }
  catch { return {completed:[]}; }
}
function savePathProgress(p){ try { localStorage.setItem(PATH_KEY, JSON.stringify(p)); } catch {} }

// ─── Voyages (planificateur) ────────────────────────────────────────────────
// Structure : tableau de voyages (prévu pour le premium multi-voyages).
// Version gratuite : 1 seul voyage autorisé.
const TRIPS_KEY = "isekaid_trips_v1";
const FREE_TRIP_LIMIT = 1;
function loadTrips(){
  try { const raw=localStorage.getItem(TRIPS_KEY); return raw?JSON.parse(raw):[]; }
  catch { return []; }
}
function saveTrips(trips){ try { localStorage.setItem(TRIPS_KEY, JSON.stringify(trips)); } catch {} }
function makeTripId(){ return "trip_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function makeStepId(){ return "s_"+Date.now().toString(36)+Math.random().toString(36).slice(2,5); }

// Check-list de préparatifs par défaut (inspirée d'un vrai voyage)
const DEFAULT_CHECKLIST = [
  "Passeport valide (6 mois)","Billets d'avion","Réservations d'hôtels/ryokan",
  "JR Pass (à commander avant le départ)","Carte IC (Suica/Pasmo)","Pocket WiFi ou eSIM",
  "Adaptateur de prise (type A)","Yens en espèces","Assurance voyage",
];

// Construit un voyage perso à partir d'un itinéraire préconçu
function tripFromPreconcu(p){
  return {
    id: makeTripId(),
    titre: p.titre,
    mode_dates: "jours",
    dateDebut: "",
    villes: [...p.villes],
    source: p.id,
    jours: p.jours.map(j=>({
      num: j.num, date:"", villeId: j.villeId, titre: j.titre||"",
      etapes: (j.etapes||[]).map(e=>({ id: makeStepId(), lieuId: e.lieuId, note:"" }))
    })),
    checklist: DEFAULT_CHECKLIST.map((t,i)=>({ id:"c"+i, texte:t, fait:false })),
  };
}

// ─── Générateur d'image partageable (Canvas natif) ───────────────────────────
// Dessine une fiche de situation en image PNG (carré 1:1 ou vertical 9:16),
// façon carrousel éditorial, avec la marque Isekai'd. Pensé pour le japonais.
function generateSituationImage(situation, { format="square", script="kana" } = {}){
  return new Promise((resolve)=>{
    const W = 1080;
    const H = format==="story" ? 1920 : 1080;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Palette éditoriale (papier crème + encre)
    const paper = "#F3EEE3", ink = "#23201B", inkSoft = "rgba(35,32,27,0.55)", accent = "#B5703C", hair = "rgba(35,32,27,0.13)";
    ctx.fillStyle = paper; ctx.fillRect(0,0,W,H);

    const M = 96;                       // marge latérale
    let y = format==="story" ? 230 : 130;

    // Eyebrow
    ctx.fillStyle = accent;
    ctx.font = "600 26px 'Noto Sans JP', sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("会話 · LE SCRIPT", M, y);
    y += 70;

    // Emoji + titre
    ctx.font = "72px 'Noto Color Emoji','Noto Sans JP',sans-serif";
    ctx.fillText(situation.emoji||"🎌", M, y+8);
    ctx.fillStyle = ink;
    ctx.font = "300 64px 'Noto Serif JP', serif";
    ctx.fillText(situation.titre, M+110, y);
    y += 38;
    ctx.fillStyle = inkSoft;
    ctx.font = "30px 'Noto Serif JP', serif";
    ctx.fillText(situation.nom_jp||"", M+110, y);
    y += 50;

    // Trait d'accent
    ctx.fillStyle = accent; ctx.fillRect(M, y, 80, 4);
    y += 60;

    // Phrases (on en met autant que la place le permet sans déborder)
    const maxPhrases = format==="story" ? 6 : 3;
    const phrases = (situation.phrases||[]).slice(0, maxPhrases);
    const jpField = (p)=> script==="romaji" ? p.romaji : (script==="kanji" ? p.jp : (p.kana||p.jp));
    const subField = (p)=> script==="romaji" ? "" : p.romaji;

    phrases.forEach((p)=>{
      // filet
      ctx.strokeStyle = hair; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(M,y); ctx.lineTo(W-M,y); ctx.stroke();
      y += 50;
      // JP principal
      ctx.fillStyle = ink;
      ctx.font = "44px 'Noto Serif JP', serif";
      ctx.fillText(jpField(p), M, y);
      y += 42;
      // lecture (romaji)
      if(subField(p)){
        ctx.fillStyle = inkSoft;
        ctx.font = "italic 28px 'Noto Serif JP', serif";
        ctx.fillText(subField(p), M, y);
        y += 18;
      }
      // traduction FR (alignée à droite)
      ctx.fillStyle = accent;
      ctx.font = "italic 28px 'Noto Serif JP', serif";
      ctx.textAlign = "right";
      ctx.fillText(p.fr, W-M, y);
      ctx.textAlign = "left";
      y += 50;
    });

    // Teaser : phrases restantes (incite à ouvrir l'app)
    const remaining = (situation.phrases||[]).length - phrases.length;
    if(remaining > 0){
      ctx.fillStyle = inkSoft;
      ctx.font = "italic 26px 'Noto Serif JP', serif";
      ctx.fillText(`+ ${remaining} autre${remaining>1?"s":""} dans l'app`, M, y+10);
    }

    // Pied de page : marque Isekai'd
    const footY = H - (format==="story" ? 150 : 90);
    ctx.strokeStyle = hair; ctx.beginPath(); ctx.moveTo(M,footY-40); ctx.lineTo(W-M,footY-40); ctx.stroke();
    ctx.fillStyle = ink;
    ctx.font = "600 30px 'Noto Sans JP', sans-serif";
    ctx.fillText("異世界 · Isekai'd", M, footY);
    ctx.fillStyle = inkSoft;
    ctx.font = "26px 'Noto Sans JP', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Apprends le japonais en voyageant", W-M, footY);
    ctx.textAlign = "left";

    // Export — on attend un tick pour que les polices soient prêtes
    setTimeout(()=>{
      canvas.toBlob((blob)=>resolve(blob), "image/png");
    }, 50);
  });
}

// Partage natif avec repli téléchargement
// ─── Template dédié : image partageable d'un PROVERBE ─────────────────────────
// Composition centrée et poétique, distincte des fiches de situation.
function generateProverbImage(prov, { format="square", script="kana" } = {}){
  return new Promise((resolve)=>{
    const W = 1080;
    const H = format==="story" ? 1920 : 1080;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // Fond : dégradé encre profonde, ambiance "estampe nocturne"
    const grad = ctx.createLinearGradient(0,0,W,H);
    grad.addColorStop(0, "#17120E");
    grad.addColorStop(1, "#241A12");
    ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

    const cx = W/2;
    const gold = "#C9A84C", cream = "#F2EAD9", creamSoft = "rgba(242,234,217,0.6)";

    // Grand kanji filigrane "諺" (proverbe) en fond
    ctx.fillStyle = "rgba(201,168,76,0.06)";
    ctx.font = "600 560px 'Noto Serif JP', serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("諺", cx, H/2);

    ctx.textBaseline = "alphabetic";

    // Eyebrow
    let y = format==="story" ? 360 : 180;
    ctx.fillStyle = gold;
    ctx.font = "600 28px 'Noto Sans JP', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("諺 · PROVERBE JAPONAIS", cx, y);
    y += 28;
    // petit trait
    ctx.fillStyle = gold; ctx.fillRect(cx-30, y, 60, 3);
    y += format==="story" ? 180 : 130;

    // Le proverbe en JP (gros, serif, centré) — wrap si nécessaire
    const jpText = script==="romaji" ? prov.romaji : (script==="kanji" ? prov.jp : (prov.kana||prov.jp));
    ctx.fillStyle = cream;
    ctx.font = "300 78px 'Noto Serif JP', serif";
    wrapCentered(ctx, jpText, cx, y, W-200, 96);
    y += measureWrapHeight(ctx, jpText, W-200, 96) + 40;

    // Lecture (romaji) en italique
    if(script!=="romaji"){
      ctx.fillStyle = gold;
      ctx.font = "italic 36px 'Noto Serif JP', serif";
      ctx.fillText(prov.romaji, cx, y);
      y += 80;
    }

    // Traduction française entre guillemets
    ctx.fillStyle = cream;
    ctx.font = "italic 44px 'Noto Serif JP', serif";
    wrapCentered(ctx, `« ${prov.fr} »`, cx, y, W-220, 58);
    y += measureWrapHeight(ctx, `« ${prov.fr} »`, W-220, 58) + 46;

    // Le sens (explication) en plus petit, gris
    if(prov.sens){
      ctx.fillStyle = creamSoft;
      ctx.font = "32px 'Noto Sans JP', sans-serif";
      wrapCentered(ctx, prov.sens, cx, y, W-260, 46);
    }

    // Pied : marque Isekai'd
    ctx.fillStyle = creamSoft;
    ctx.font = "600 30px 'Noto Sans JP', sans-serif";
    ctx.fillText("異世界 · Isekai'd", cx, H - (format==="story" ? 150 : 90));

    ctx.textAlign = "left";
    setTimeout(()=>{ canvas.toBlob((b)=>resolve(b), "image/png"); }, 50);
  });
}

// Helpers de wrap centré pour le canvas
function wrapCentered(ctx, text, cx, startY, maxW, lineH){
  const words = String(text).split(" ");
  let line = "", y = startY;
  for(const w of words){
    const test = line ? line+" "+w : w;
    if(ctx.measureText(test).width > maxW && line){
      ctx.fillText(line, cx, y); line = w; y += lineH;
    } else line = test;
  }
  if(line) ctx.fillText(line, cx, y);
}
function measureWrapHeight(ctx, text, maxW, lineH){
  const words = String(text).split(" ");
  let line = "", lines = 1;
  for(const w of words){
    const test = line ? line+" "+w : w;
    if(ctx.measureText(test).width > maxW && line){ lines++; line = w; }
    else line = test;
  }
  return (lines-1)*lineH;
}

async function shareImageBlob(blob, filename="isekaid.png", shareText=""){
  const file = new File([blob], filename, { type:"image/png" });
  // Web Share API niveau 2 (fichiers)
  if(navigator.canShare && navigator.canShare({ files:[file] })){
    try {
      await navigator.share({ files:[file], text:shareText });
      return "shared";
    } catch(e){
      if(e.name==="AbortError") return "cancelled";
    }
  }
  // Repli : téléchargement
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
  return "downloaded";
}

// Modale de partage : choix du format + aperçu + actions
function ShareSheet({ C, situation, script, onClose }){
  const [format, setFormat] = useState("square");
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState(null);

  // Génère l'aperçu à chaque changement de format
  useEffect(()=>{
    let alive = true; let lastUrl = null;
    setBusy(true);
    generateSituationImage(situation, { format, script }).then(blob=>{
      if(!alive || !blob) return;
      lastUrl = URL.createObjectURL(blob);
      setPreviewUrl(lastUrl); setBusy(false);
    });
    return ()=>{ alive=false; if(lastUrl) URL.revokeObjectURL(lastUrl); };
  }, [format, situation, script]);

  const doShare = async ()=>{
    setBusy(true);
    const blob = await generateSituationImage(situation, { format, script });
    const res = await shareImageBlob(blob, `isekaid-${situation.id}.png`, `${situation.titre} — appris avec Isekai'd 🎌`);
    setStatus(res); setBusy(false);
    if(res==="shared" || res==="downloaded") setTimeout(onClose, 900);
  };

  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:460,background:C.s1,borderRadius:"22px 22px 0 0",padding:"22px 20px 30px",animation:"fadeUp .3s ease",maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{width:38,height:4,background:C.border,borderRadius:2,margin:"0 auto 16px"}}/>
          <div style={{fontSize:17,color:C.text,fontWeight:600}}>Partager cette fiche</div>
          <div style={{fontSize:12,color:C.t3,marginTop:3}}>Une image prête pour tes réseaux</div>
        </div>

        {/* Choix du format */}
        <div style={{display:"flex",gap:10,marginBottom:18}}>
          {[{id:"square",label:"Carré",sub:"Post 1:1"},{id:"story",label:"Vertical",sub:"Story 9:16"}].map(f=>(
            <button key={f.id} onClick={()=>setFormat(f.id)} style={{flex:1,padding:"12px",borderRadius:12,border:`1px solid ${format===f.id?C.red:C.border}`,background:format===f.id?`${C.red}11`:C.s2,cursor:"pointer"}}>
              <div style={{fontSize:13,color:format===f.id?C.red:C.text,fontWeight:600}}>{f.label}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:2}}>{f.sub}</div>
            </button>
          ))}
        </div>

        {/* Aperçu */}
        <div style={{display:"flex",justifyContent:"center",marginBottom:18,minHeight:180}}>
          {previewUrl ? (
            <img src={previewUrl} alt="Aperçu" style={{maxWidth:format==="story"?"56%":"82%",maxHeight:300,borderRadius:12,border:`1px solid ${C.border}`,boxShadow:"0 8px 28px rgba(0,0,0,0.2)",opacity:busy?0.5:1,transition:"opacity .2s"}}/>
          ) : (
            <div style={{display:"flex",alignItems:"center",color:C.t3,fontSize:13}}>Génération…</div>
          )}
        </div>

        {/* Action */}
        <button onClick={doShare} disabled={busy} className="pop-press" style={{width:"100%",padding:"15px",background:C.red,border:"none",borderRadius:13,color:"#fff",fontSize:14,fontWeight:700,cursor:busy?"wait":"pointer",opacity:busy?0.7:1}}>
          {busy ? "Préparation…" : "📤 Partager / Enregistrer"}
        </button>
        {status==="cancelled" && <div style={{textAlign:"center",fontSize:12,color:C.t3,marginTop:10}}>Partage annulé</div>}
        {status==="downloaded" && <div style={{textAlign:"center",fontSize:12,color:C.green,marginTop:10}}>Image enregistrée ✓</div>}
        <div style={{fontSize:11,color:C.t3,textAlign:"center",marginTop:12,lineHeight:1.5}}>L'image inclut ta marque Isekai'd. Parfait pour Instagram, TikTok ou tes amis 🌸</div>
      </div>
    </div>
  );
}

// Modale de partage dédiée au proverbe du jour
function ProverbShareSheet({ C, prov, script, onClose }){
  const [format, setFormat] = useState("square");
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(()=>{
    let alive = true; let lastUrl = null;
    setBusy(true);
    generateProverbImage(prov, { format, script }).then(blob=>{
      if(!alive || !blob) return;
      lastUrl = URL.createObjectURL(blob);
      setPreviewUrl(lastUrl); setBusy(false);
    });
    return ()=>{ alive=false; if(lastUrl) URL.revokeObjectURL(lastUrl); };
  }, [format, prov, script]);

  const doShare = async ()=>{
    setBusy(true);
    const blob = await generateProverbImage(prov, { format, script });
    const res = await shareImageBlob(blob, `isekaid-proverbe.png`, `« ${prov.fr} » — proverbe japonais du jour sur Isekai'd 🎌`);
    setStatus(res); setBusy(false);
    if(res==="shared" || res==="downloaded") setTimeout(onClose, 900);
  };

  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:460,background:C.s1,borderRadius:"22px 22px 0 0",padding:"22px 20px 30px",animation:"fadeUp .3s ease",maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{width:38,height:4,background:C.border,borderRadius:2,margin:"0 auto 16px"}}/>
          <div style={{fontSize:17,color:C.text,fontWeight:600}}>Partager ce proverbe</div>
          <div style={{fontSize:12,color:C.t3,marginTop:3}}>Une image prête pour tes réseaux</div>
        </div>
        <div style={{display:"flex",gap:10,marginBottom:18}}>
          {[{id:"square",label:"Carré",sub:"Post 1:1"},{id:"story",label:"Vertical",sub:"Story 9:16"}].map(f=>(
            <button key={f.id} onClick={()=>setFormat(f.id)} style={{flex:1,padding:"12px",borderRadius:12,border:`1px solid ${format===f.id?C.gold:C.border}`,background:format===f.id?`${C.gold}18`:C.s2,cursor:"pointer"}}>
              <div style={{fontSize:13,color:format===f.id?C.gold:C.text,fontWeight:600}}>{f.label}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:2}}>{f.sub}</div>
            </button>
          ))}
        </div>
        <div style={{display:"flex",justifyContent:"center",marginBottom:18,minHeight:180}}>
          {previewUrl ? (
            <img src={previewUrl} alt="Aperçu" style={{maxWidth:format==="story"?"56%":"82%",maxHeight:300,borderRadius:12,border:`1px solid ${C.border}`,boxShadow:"0 8px 28px rgba(0,0,0,0.2)",opacity:busy?0.5:1,transition:"opacity .2s"}}/>
          ) : (
            <div style={{display:"flex",alignItems:"center",color:C.t3,fontSize:13}}>Génération…</div>
          )}
        </div>
        <button onClick={doShare} disabled={busy} className="pop-press" style={{width:"100%",padding:"15px",background:C.gold,border:"none",borderRadius:13,color:"#1A1410",fontSize:14,fontWeight:700,cursor:busy?"wait":"pointer",opacity:busy?0.7:1}}>
          {busy ? "Préparation…" : "📤 Partager / Enregistrer"}
        </button>
        {status==="cancelled" && <div style={{textAlign:"center",fontSize:12,color:C.t3,marginTop:10}}>Partage annulé</div>}
        {status==="downloaded" && <div style={{textAlign:"center",fontSize:12,color:C.green,marginTop:10}}>Image enregistrée ✓</div>}
        <div style={{fontSize:11,color:C.t3,textAlign:"center",marginTop:12,lineHeight:1.5}}>L'image inclut ta marque Isekai'd 🌸</div>
      </div>
    </div>
  );
}

function SituationDetail({C, s, onBack, script}){
  const [showShare, setShowShare] = useState(false);
  // Palette éditoriale "fiche magazine" — crème en clair, encre profonde en sombre,
  // distincte du reste de l'app pour un effet "carte à collectionner".
  const dark = C.bg === "#0F0B08";
  const paper = dark ? "#1C1B22" : "#F3EEE3";
  const ink   = dark ? "#EDE6D8" : "#23201B";
  const inkSoft = dark ? "rgba(237,230,216,0.62)" : "rgba(35,32,27,0.6)";
  const accent = "#B5703C"; // ambre éditorial
  const hair  = dark ? "rgba(237,230,216,0.14)" : "rgba(35,32,27,0.12)";

  return(
    <div style={{height:"100%",overflowY:"auto",background:paper,animation:"fadeIn .3s ease",fontFamily:"'Noto Sans JP',sans-serif"}}>
      <div style={{padding:"50px 22px 0",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
        <button onClick={onBack} style={{background:"transparent",border:`1px solid ${hair}`,borderRadius:20,padding:"7px 14px",color:inkSoft,fontSize:12,cursor:"pointer"}}>‹ Situations</button>
        <button onClick={()=>setShowShare(true)} className="pop-press" style={{display:"inline-flex",alignItems:"center",gap:6,background:accent,border:"none",borderRadius:20,padding:"8px 15px",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>
          <span>📤</span> Partager
        </button>
      </div>

      {/* En-tête éditorial */}
      <div style={{padding:"26px 24px 22px"}}>
        <div style={{fontSize:11,color:accent,letterSpacing:".28em",textTransform:"uppercase",fontWeight:700,marginBottom:18}}>会話 · Le script</div>
        <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:14}}>
          <span style={{fontSize:40}}>{s.emoji}</span>
          <div>
            <div style={{fontSize:30,fontFamily:"'Noto Serif JP',serif",fontWeight:400,color:ink,lineHeight:1.05}}>{s.titre}</div>
            <div style={{fontSize:14,color:inkSoft,fontFamily:"'Noto Serif JP',serif"}}>{s.nom_jp}</div>
          </div>
        </div>
        <div style={{width:40,height:2,background:accent,marginBottom:14}}/>
        <div style={{fontSize:14,color:inkSoft,fontStyle:"italic",lineHeight:1.6,fontFamily:"'Noto Serif JP',serif"}}>{s.contexte}</div>
        <div style={{fontSize:11,color:accent,marginTop:14,letterSpacing:".05em"}}>{s.phrases.length} phrases · de l'arrivée au départ</div>
      </div>

      {/* Liste de phrases — style éditorial : ligne par ligne, traduction à droite */}
      <div style={{padding:"0 24px 110px"}}>
        {s.phrases.map((p,i)=>(
          <div key={i} style={{paddingTop:18,paddingBottom:18,borderTop:`1px solid ${hair}`,animation:`fadeUp .4s ease ${i*0.05}s both`}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:21,fontFamily:"'Noto Serif JP',serif",color:ink,marginBottom:5,lineHeight:1.35}}>{jpMain(p, script)}</div>
                <div style={{fontSize:13,color:inkSoft,fontStyle:"italic",fontFamily:"'Noto Serif JP',serif"}}>{jpSub(p, script)}</div>
              </div>
              <SpeakButton C={C} text={p.jp} color={accent}/>
            </div>
            <div style={{fontSize:13,color:inkSoft,marginTop:8,textAlign:"right",fontFamily:"'Noto Serif JP',serif",fontStyle:"italic"}}>{p.fr}</div>
          </div>
        ))}
        {/* Pied éditorial */}
        <div style={{borderTop:`1px solid ${hair}`,marginTop:6,paddingTop:18,textAlign:"center"}}>
          <div style={{fontSize:13,color:inkSoft,fontStyle:"italic",fontFamily:"'Noto Serif JP',serif",lineHeight:1.5}}>Apprends les lignes une fois. Utilise-les à chaque fois.</div>
          <div style={{fontSize:10,color:accent,letterSpacing:".25em",textTransform:"uppercase",marginTop:10}}>異世界 · Isekai'd</div>
        </div>
      </div>
      {showShare && <ShareSheet C={C} situation={s} script={script} onClose={()=>setShowShare(false)}/>}
    </div>
  );
}

// ─── Checkpoint : quiz de validation d'un palier ──────────────────────────────
function CheckpointQuiz({C, pool, distractorPool, onPass, onExit, passRatio=0.7, label, allowAudio=false}){
  // pool: [{q, a}], distractorPool: [{q, a}] pour fabriquer de faux choix
  const questions = useMemo(()=>{
    const qs = shuffle(pool).slice(0, Math.min(8, pool.length));
    return qs.map(item=>{
      const others = shuffle(distractorPool.filter(d=>d.a!==item.a)).slice(0,3).map(d=>d.a);
      const opts = shuffle([item.a, ...others]);
      return { q:item.q, a:item.a, opts };
    });
  }, [pool, distractorPool]);

  const [idx,setIdx] = useState(0);
  const [picked,setPicked] = useState(null);
  const [score,setScore] = useState(0);
  const [done,setDone] = useState(false);

  if(questions.length===0) return null;
  const cur = questions[idx];

  if(done){
    const ratio = score/questions.length;
    const passed = ratio>=passRatio;
    return(
      <div style={{padding:"40px 26px",textAlign:"center"}}>
        <div style={{fontSize:60,marginBottom:16}}>{passed?"🎉":"💪"}</div>
        <div style={{fontSize:22,fontWeight:600,color:C.text,marginBottom:8}}>{passed?"Palier validé !":"Presque !"}</div>
        <div style={{fontSize:15,color:C.t2,marginBottom:6}}>Score : {score}/{questions.length}</div>
        <div style={{fontSize:13,color:C.t3,marginBottom:26,lineHeight:1.5}}>
          {passed ? "Tu peux passer au palier suivant." : `Il te faut ${Math.ceil(passRatio*questions.length)}/${questions.length} pour valider. Réessaie !`}
        </div>
        {passed
          ? <button onClick={onPass} style={{width:"100%",padding:"14px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Continuer →</button>
          : <button onClick={()=>{setIdx(0);setScore(0);setPicked(null);setDone(false);}} style={{width:"100%",padding:"14px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Réessayer</button>}
        <button onClick={onExit} style={{width:"100%",padding:"12px",marginTop:10,background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:13,cursor:"pointer"}}>Quitter</button>
      </div>
    );
  }

  const choose = (opt)=>{
    if(picked) return;
    setPicked(opt);
    if(opt===cur.a) setScore(s=>s+1);
    setTimeout(()=>{
      if(idx+1>=questions.length){ setDone(true); }
      else { setIdx(i=>i+1); setPicked(null); }
    }, 750);
  };

  return(
    <div style={{padding:"30px 22px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <span style={{fontSize:11,color:C.t3}}>{label}</span>
        <span style={{fontSize:11,color:C.t2}}>{idx+1}/{questions.length}</span>
      </div>
      <div style={{height:4,background:C.s3,borderRadius:2,overflow:"hidden",marginBottom:30}}>
        <div style={{height:"100%",width:`${((idx)/questions.length)*100}%`,background:C.red,borderRadius:2,transition:"width .3s"}}/>
      </div>
      <div style={{textAlign:"center",marginBottom:30}}>
        <div style={{fontSize:13,color:C.t3,marginBottom:14}}>Que signifie / comment se lit :</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <div style={{fontSize:42,fontFamily:"'Noto Serif JP',serif",color:C.text}}>{cur.q}</div>
          {allowAudio && <SpeakButton C={C} text={cur.q} color={C.gold} size={30}/>}
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:11}}>
        {cur.opts.map((opt,i)=>{
          let bg=C.s1, bd=C.border, col=C.text;
          if(picked){
            if(opt===cur.a){ bg="rgba(58,102,69,0.15)"; bd=C.green; col=C.green; }
            else if(opt===picked){ bg="rgba(201,70,61,0.12)"; bd=C.red; col=C.red; }
          }
          return(
            <button key={i} onClick={()=>choose(opt)} style={{padding:"15px",background:bg,border:`1px solid ${bd}`,borderRadius:12,color:col,fontSize:14,cursor:picked?"default":"pointer",textAlign:"left",transition:"all .2s"}}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Compréhension écrite : lire un texte JP + répondre ──
function ComprehensionRead({ C, db, script, onRecord }){
  const allExos = db?.comprehension_ecrite || [];
  const LEVELS = ["Débutant","Intermédiaire","Avancé"];
  const [level, setLevel] = useState("Débutant");
  const exos = allExos.filter(e=>e.niveau===level);
  const [idx, setIdx] = useState(0);
  const [showText, setShowText] = useState(false); // texte caché par défaut ? Non : écrite = on lit. On montre.
  const [answers, setAnswers] = useState({});
  const [showTrad, setShowTrad] = useState(false);
  const topRef = useRef(null);
  // Au changement d'exercice ou de niveau, on remonte sur le texte de départ
  useEffect(()=>{ if(topRef.current) topRef.current.scrollIntoView({block:"start"}); }, [idx, level]);
  // Reset l'index quand on change de niveau
  useEffect(()=>{ setIdx(0); setAnswers({}); setShowTrad(false); }, [level]);
  const exo = exos[idx];

  const levelChips = (
    <div style={{display:"flex",gap:8,overflowX:"auto",WebkitOverflowScrolling:"touch",marginBottom:16,paddingBottom:2}}>
      {LEVELS.map(lv=>{
        const on = level===lv;
        const emoji = {"Débutant":"🟢","Intermédiaire":"🟡","Avancé":"🔴"}[lv];
        const count = allExos.filter(e=>e.niveau===lv).length;
        return(
          <button key={lv} onClick={()=>setLevel(lv)} className="pop-press" style={{flexShrink:0,padding:"7px 13px",borderRadius:18,border:`1px solid ${on?C.red:C.border}`,background:on?C.red:C.s1,color:on?"#fff":C.t2,fontSize:12,fontWeight:on?600:500,cursor:"pointer",whiteSpace:"nowrap"}}>
            {emoji} {lv} ({count})
          </button>
        );
      })}
    </div>
  );

  if(!exo) return <div>{levelChips}<div style={{padding:"20px",color:C.t2,fontSize:13}}>Aucun exercice à ce niveau.</div></div>;

  const pick = (qi, ci)=>{
    if(answers[qi]!==undefined) return;
    setAnswers({...answers, [qi]: ci});
  };
  const allAnswered = exo.questions.every((_,qi)=>answers[qi]!==undefined);
  const score = exo.questions.filter((q,qi)=>answers[qi]===q.correct).length;

  const next = ()=>{
    setAnswers({}); setShowTrad(false);
    if(idx+1<exos.length) setIdx(idx+1); else setIdx(0);
  };

  // Texte selon le mode de script
  // Texte selon le mode : kana (défaut) → kanji → romaji
  const mainText = script==="romaji" ? exo.texte_romaji
                 : script==="kana"   ? (exo.texte_kana || exo.texte_jp)
                 : exo.texte_jp;

  return(
    <div ref={topRef} style={{scrollMarginTop:60}}>
      {levelChips}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{fontSize:15,color:C.text,fontWeight:600}}>📖 {exo.titre}</div>
        <span style={{fontSize:11,color:C.t3,fontWeight:600}}>{idx+1}/{exos.length} · {exo.niveau}</span>
      </div>

      {/* Le texte à lire */}
      <div style={{padding:"18px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,marginBottom:8}}>
        <div style={{fontSize:18,lineHeight:1.9,color:C.text,fontFamily:"'Noto Serif JP',serif"}}>{mainText}</div>
        <button onClick={()=>speakJP(exo.texte_jp)} style={{marginTop:12,padding:"7px 14px",background:"rgba(91,155,213,0.12)",border:"none",borderRadius:20,color:"#5B9BD5",fontSize:12,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}}>🔊 Écouter</button>
      </div>

      {/* Traduction repliable */}
      <button onClick={()=>setShowTrad(v=>!v)} style={{width:"100%",padding:"10px",background:"transparent",border:`1px dashed ${C.border}`,borderRadius:10,color:C.t2,fontSize:12,cursor:"pointer",marginBottom:18}}>
        {showTrad ? "▲ Masquer la traduction" : "▼ Afficher la traduction"}
      </button>
      {showTrad && <div style={{padding:"12px 16px",background:C.s2,borderRadius:10,fontSize:13,color:C.t2,fontStyle:"italic",marginBottom:18,marginTop:-8}}>{exo.traduction}</div>}

      {/* Questions */}
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        {exo.questions.map((q,qi)=>(
          <div key={qi}>
            <div style={{fontSize:14,color:C.text,fontWeight:500,marginBottom:10}}>{qi+1}. {q.q}</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {q.choix.map((ch,ci)=>{
                const answered = answers[qi]!==undefined;
                const isPicked = answers[qi]===ci;
                const isCorrect = ci===q.correct;
                let bg=C.s1, bd=C.border, col=C.text;
                if(answered){
                  if(isCorrect){ bg="rgba(78,128,96,0.12)"; bd=C.green; col=C.green; }
                  else if(isPicked){ bg="rgba(201,70,61,0.1)"; bd=C.red; col=C.red; }
                }
                return(
                  <button key={ci} onClick={()=>pick(qi,ci)} disabled={answered} style={{textAlign:"left",padding:"12px 14px",background:bg,border:`1px solid ${bd}`,borderRadius:11,color:col,fontSize:13,cursor:answered?"default":"pointer",transition:"all .2s"}}>
                    {ch} {answered && isCorrect && "✓"}
                  </button>
                );
              })}
            </div>
            {answers[qi]!==undefined && (
              <div style={{marginTop:8,fontSize:12,color:C.t2,padding:"8px 12px",background:C.s2,borderRadius:9}}>💡 {q.feedback}</div>
            )}
          </div>
        ))}
      </div>

      {/* Score + suivant */}
      {allAnswered && (
        <div style={{marginTop:22,textAlign:"center"}}>
          <div style={{fontSize:14,color:C.text,marginBottom:12}}>Score : <b style={{color:score===exo.questions.length?C.green:C.red}}>{score}/{exo.questions.length}</b></div>
          <button onClick={next} style={{padding:"13px 28px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Exercice suivant ›</button>
        </div>
      )}
    </div>
  );
}

// ── Compréhension orale : écouter (texte caché) + répondre ──
function ComprehensionListen({ C, db, script }){
  const allExos = db?.comprehension_orale || [];
  const LEVELS = ["Débutant","Intermédiaire","Avancé"];
  const [level, setLevel] = useState("Débutant");
  const exos = allExos.filter(e=>e.niveau===level);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false); // texte caché par défaut
  const [answers, setAnswers] = useState({});
  const topRef = useRef(null);
  useEffect(()=>{ if(topRef.current) topRef.current.scrollIntoView({block:"start"}); }, [idx, level]);
  useEffect(()=>{ setIdx(0); setAnswers({}); setRevealed(false); }, [level]);
  const exo = exos[idx];

  const levelChips = (
    <div style={{display:"flex",gap:8,overflowX:"auto",WebkitOverflowScrolling:"touch",marginBottom:16,paddingBottom:2}}>
      {LEVELS.map(lv=>{
        const on = level===lv;
        const emoji = {"Débutant":"🟢","Intermédiaire":"🟡","Avancé":"🔴"}[lv];
        const count = allExos.filter(e=>e.niveau===lv).length;
        return(
          <button key={lv} onClick={()=>setLevel(lv)} className="pop-press" style={{flexShrink:0,padding:"7px 13px",borderRadius:18,border:`1px solid ${on?"#9A6A8A":C.border}`,background:on?"#9A6A8A":C.s1,color:on?"#fff":C.t2,fontSize:12,fontWeight:on?600:500,cursor:"pointer",whiteSpace:"nowrap"}}>
            {emoji} {lv} ({count})
          </button>
        );
      })}
    </div>
  );

  if(!exo) return <div>{levelChips}<div style={{padding:"20px",color:C.t2,fontSize:13}}>Aucun exercice à ce niveau.</div></div>;

  const pick = (qi, ci)=>{
    if(answers[qi]!==undefined) return;
    setAnswers({...answers, [qi]: ci});
  };
  const allAnswered = exo.questions.every((_,qi)=>answers[qi]!==undefined);
  const score = exo.questions.filter((q,qi)=>answers[qi]===q.correct).length;
  const next = ()=>{ setAnswers({}); setRevealed(false); if(idx+1<exos.length) setIdx(idx+1); else setIdx(0); };

  return(
    <div ref={topRef} style={{scrollMarginTop:60}}>
      {levelChips}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{fontSize:15,color:C.text,fontWeight:600}}>🎧 {exo.titre}</div>
        <span style={{fontSize:11,color:C.t3,fontWeight:600}}>{idx+1}/{exos.length} · {exo.niveau}</span>
      </div>

      {/* Bouton d'écoute — gros, central */}
      <div style={{padding:"28px 18px",background:"rgba(122,74,106,0.08)",border:`1px solid ${C.border}`,borderRadius:16,marginBottom:14,textAlign:"center"}}>
        <button onClick={()=>speakJP(exo.audio_jp)} style={{width:72,height:72,borderRadius:"50%",background:"#9A6A8A",border:"none",color:"#fff",fontSize:30,cursor:"pointer",boxShadow:"0 4px 16px rgba(122,74,106,0.3)"}}>🔊</button>
        <div style={{fontSize:12,color:C.t2,marginTop:12}}>Appuie pour écouter — autant de fois que nécessaire</div>
      </div>

      {/* Texte caché, révélable */}
      <button onClick={()=>setRevealed(v=>!v)} style={{width:"100%",padding:"11px",background:"transparent",border:`1px dashed ${C.border}`,borderRadius:11,color:C.t2,fontSize:12,cursor:"pointer",marginBottom:18}}>
        {revealed ? "🙈 Masquer le texte" : "👁 Afficher le texte"}
      </button>
      {revealed && (
        <div style={{padding:"16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:18,marginTop:-8}}>
          <div style={{fontSize:17,lineHeight:1.8,color:C.text,fontFamily:"'Noto Serif JP',serif",marginBottom:8}}>{script==="romaji"?exo.audio_romaji:script==="kana"?(exo.audio_kana||exo.audio_jp):exo.audio_jp}</div>
          <div style={{fontSize:12,color:C.t2,fontStyle:"italic"}}>{exo.traduction}</div>
        </div>
      )}

      {/* Questions */}
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        {exo.questions.map((q,qi)=>(
          <div key={qi}>
            <div style={{fontSize:14,color:C.text,fontWeight:500,marginBottom:10}}>{qi+1}. {q.q}</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {q.choix.map((ch,ci)=>{
                const answered = answers[qi]!==undefined;
                const isPicked = answers[qi]===ci;
                const isCorrect = ci===q.correct;
                let bg=C.s1, bd=C.border, col=C.text;
                if(answered){
                  if(isCorrect){ bg="rgba(78,128,96,0.12)"; bd=C.green; col=C.green; }
                  else if(isPicked){ bg="rgba(201,70,61,0.1)"; bd=C.red; col=C.red; }
                }
                return(
                  <button key={ci} onClick={()=>pick(qi,ci)} disabled={answered} style={{textAlign:"left",padding:"12px 14px",background:bg,border:`1px solid ${bd}`,borderRadius:11,color:col,fontSize:13,cursor:answered?"default":"pointer",transition:"all .2s"}}>
                    {ch} {answered && isCorrect && "✓"}
                  </button>
                );
              })}
            </div>
            {answers[qi]!==undefined && (
              <div style={{marginTop:8,fontSize:12,color:C.t2,padding:"8px 12px",background:C.s2,borderRadius:9}}>💡 {q.feedback}</div>
            )}
          </div>
        ))}
      </div>

      {allAnswered && (
        <div style={{marginTop:22,textAlign:"center"}}>
          <div style={{fontSize:14,color:C.text,marginBottom:12}}>Score : <b style={{color:score===exo.questions.length?C.green:C.red}}>{score}/{exo.questions.length}</b></div>
          <button onClick={next} style={{padding:"13px 28px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Exercice suivant ›</button>
        </div>
      )}
    </div>
  );
}

// ─── Révision espacée : revoir les kana échus (priorité aux plus fragiles) ─────
function ReviewMode({ C, dueChars, onRecord, onExit }){
  const [queue, setQueue] = useState(()=>dueChars.slice(0, 20)); // session de 20 max
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [correct, setCorrect] = useState(0);
  const total = queue.length;
  const cur = queue[idx];

  if(!cur || idx >= queue.length){
    // Bilan de fin de session
    return(
      <div style={{padding:"40px 24px",textAlign:"center"}}>
        <div style={{fontSize:54,marginBottom:14,animation:"popBounce .6s cubic-bezier(.34,1.56,.64,1) both"}}>{correct===total?"🎉":"✓"}</div>
        <div style={{fontSize:22,color:C.text,fontWeight:600,marginBottom:8}}>Révision terminée !</div>
        <div style={{fontSize:15,color:C.t2,marginBottom:28}}>{correct} / {total} réussis</div>
        <button onClick={onExit} className="pop-press" style={{padding:"13px 28px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Retour</button>
      </div>
    );
  }

  const answer = (known)=>{
    onRecord(cur.k, known);
    setDone(d=>d+1);
    if(known) setCorrect(c=>c+1);
    setRevealed(false);
    setIdx(i=>i+1);
  };

  return(
    <div style={{padding:"20px 24px 40px"}}>
      {/* Barre de progression */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <button onClick={onExit} style={{background:"transparent",border:"none",color:C.t3,fontSize:13,cursor:"pointer"}}>✕ Quitter</button>
        <span style={{fontSize:12,color:C.t3,fontWeight:600}}>{idx+1} / {total}</span>
      </div>
      <div style={{height:4,background:C.s3,borderRadius:2,overflow:"hidden",marginBottom:32}}>
        <div style={{height:"100%",width:`${(idx/total)*100}%`,background:C.red,borderRadius:2,transition:"width .3s"}}/>
      </div>

      {/* Carte du kana */}
      <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"48px 20px",textAlign:"center",marginBottom:20,boxShadow:"0 4px 20px rgba(0,0,0,0.05)"}}>
        <div style={{fontSize:88,fontFamily:"'Noto Serif JP',serif",color:C.text,marginBottom:revealed?16:0,lineHeight:1}}>{cur.k}</div>
        {revealed && <div style={{fontSize:26,color:C.red,fontWeight:600,animation:"fadeIn .25s ease"}}>{cur.r}</div>}
        <button onClick={()=>speakJP(cur.k)} style={{marginTop:18,padding:"7px 16px",background:C.s2,border:"none",borderRadius:20,color:C.t2,fontSize:12,cursor:"pointer"}}>🔊 Écouter</button>
      </div>

      {!revealed ? (
        <button onClick={()=>setRevealed(true)} className="pop-press" style={{width:"100%",padding:"15px",background:C.text,border:"none",borderRadius:13,color:C.bg,fontSize:14,fontWeight:600,cursor:"pointer"}}>
          Afficher la réponse
        </button>
      ) : (
        <div style={{display:"flex",gap:12,animation:"fadeUp .25s ease"}}>
          <button onClick={()=>answer(false)} className="pop-press" style={{flex:1,padding:"15px",background:"transparent",border:`1.5px solid ${C.red}`,borderRadius:13,color:C.red,fontSize:14,fontWeight:600,cursor:"pointer"}}>
            😕 À revoir
          </button>
          <button onClick={()=>answer(true)} className="pop-press" style={{flex:1,padding:"15px",background:C.green,border:"none",borderRadius:13,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>
            😊 Je savais
          </button>
        </div>
      )}
    </div>
  );
}

function LearnScreen({C,script,db,kanaProgress,onRecordKana,pathProgress,onCompleteStep,onMissionTrigger}){
  const [deck,setDeck] = useState(null);   // selected deck object
  const [mode,setMode] = useState(null);   // "flash" | "quiz"
  const [situation,setSituation] = useState(null); // selected situation
  const [pathStep,setPathStep] = useState(null);   // active path step (detail)
  const [checkpoint,setCheckpoint] = useState(null); // active checkpoint step
  const [learnMode,setLearnMode] = useState(null);   // null = choix | "path" | "alphabets" | "situations" | "read" | "listen"
  // Déclenche les missions du jour "review" et "comp" quand on entre dans ces modes.
  useEffect(()=>{
    if(!onMissionTrigger) return;
    if(learnMode==="review") onMissionTrigger("review");
    if(learnMode==="read" || learnMode==="listen") onMissionTrigger("comp");
  },[learnMode]);
  const scrollRef = useRef(null);
  // Remet le scroll en haut quand on change de mode (sinon on atterrit sur les questions)
  useEffect(()=>{ if(scrollRef.current) scrollRef.current.scrollTop = 0; }, [learnMode]);
  const situations = db?.situations || [];
  const kp = kanaProgress || {};
  const completed = pathProgress?.completed || [];
  // Kana à réviser aujourd'hui (répétition espacée)
  const ALL_KANA = useMemo(()=>[...HIRAGANA, ...KATAKANA, ...HIRAGANA_DAKUTEN, ...KATAKANA_DAKUTEN], []);
  const dueChars = useMemo(()=>getDueForReview(kanaProgress, ALL_KANA), [kanaProgress, ALL_KANA]);

  // ── Checkpoint actif ──
  if(checkpoint){
    const step = checkpoint;
    let pool=[], distractor=[];
    if(step.type==="kana"){
      const dk = LEARN_DECKS.find(d=>d.id===step.deckId);
      const cards = dk?.deck || [];
      pool = cards.map(c=>({q:c.k, a:c.r}));
      distractor = pool;
    } else if(step.type==="phrases"){
      const sit = situations.find(s=>s.id===step.situationId);
      pool = (sit?.phrases||[]).map(p=>({q:p.jp, a:p.fr}));
      distractor = situations.flatMap(s=>(s.phrases||[]).map(p=>({q:p.jp,a:p.fr})));
    } else if(step.type==="final"){
      const surv = situations.filter(s=>["politesse","urgence","konbini","restaurant","train"].includes(s.id));
      pool = surv.flatMap(s=>(s.phrases||[]).map(p=>({q:p.jp, a:p.fr})));
      distractor = pool;
    }
    return(
      <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
        <div style={{padding:"50px 20px 6px"}}>
          <button onClick={()=>setCheckpoint(null)} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.t2,fontSize:12,cursor:"pointer"}}>‹ {step.title}</button>
        </div>
        <CheckpointQuiz C={C} pool={pool} distractorPool={distractor} label={`Checkpoint · ${step.title}`}
          passRatio={step.type==="final"?0.8:0.7}
          allowAudio={step.type!=="kana"}
          onPass={()=>{ onCompleteStep&&onCompleteStep(step.id); setCheckpoint(null); setPathStep(null); }}
          onExit={()=>setCheckpoint(null)}/>
      </div>
    );
  }

  // ── Détail d'un palier du parcours ──
  if(pathStep){
    const step = pathStep;
    const sit = step.situationId ? situations.find(s=>s.id===step.situationId) : null;
    const dk = step.deckId ? LEARN_DECKS.find(d=>d.id===step.deckId) : null;
    return(
      <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
        <div style={{padding:"50px 20px 110px"}}>
          <button onClick={()=>setPathStep(null)} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.t2,fontSize:12,cursor:"pointer",marginBottom:22}}>‹ Parcours</button>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:54,fontFamily:step.deckId?"'Noto Serif JP',serif":"inherit",color:C.text,marginBottom:8}}>{step.emoji}</div>
            <div style={{fontSize:21,color:C.text,fontWeight:600,marginBottom:6}}>{step.title}</div>
            <div style={{fontSize:13,color:C.t2,lineHeight:1.5,maxWidth:300,margin:"0 auto"}}>{step.goal}</div>
          </div>

          {step.type==="kana" && dk && (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:C.t3,letterSpacing:".18em",marginBottom:10,textTransform:"uppercase"}}>📚 Apprends</div>
              <div onClick={()=>setDeck(dk)} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px",display:"flex",alignItems:"center",gap:14,cursor:"pointer"}}>
                <span style={{fontSize:30,fontFamily:"'Noto Serif JP',serif",color:C.red}}>{dk.emoji}</span>
                <div style={{flex:1}}><div style={{fontSize:14,color:C.text,fontWeight:500}}>Flashcards & quiz</div><div style={{fontSize:12,color:C.t2}}>{dk.desc}</div></div>
                <span style={{fontSize:18,color:C.t3}}>›</span>
              </div>
            </div>
          )}
          {step.type==="phrases" && sit && (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:C.t3,letterSpacing:".18em",marginBottom:10,textTransform:"uppercase"}}>📚 Apprends ces phrases</div>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {sit.phrases.map((p,i)=>(
                  <div key={i} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 15px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                      <div style={{fontSize:16,fontFamily:"'Noto Serif JP',serif",color:C.text}}>{jpMain(p, script)}</div>
                      <SpeakButton C={C} text={p.jp} color={C.gold} size={26}/>
                    </div>
                    <div style={{fontSize:11,color:C.gold,fontStyle:"italic",marginBottom:3}}>{jpSub(p, script)}</div>
                    <div style={{fontSize:13,color:C.t2}}>{p.fr}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {step.type==="final" && (
            <div style={{marginBottom:14,padding:"16px",background:C.s2,border:`1px dashed ${C.border}`,borderRadius:12,fontSize:13,color:C.t2,lineHeight:1.6}}>
              🗼 Ce test final mélange toutes les situations de survie : politesses, aide, konbini, restaurant, train. Réussis-le à 80% pour prouver que tu peux te débrouiller une semaine à Tokyo !
            </div>
          )}

          <button onClick={()=>setCheckpoint(step)} style={{marginTop:8,width:"100%",padding:"15px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>
            {completed.includes(step.id) ? "Refaire le checkpoint ✓" : "Passer le checkpoint →"}
          </button>
        </div>
      </div>
    );
  }

  // Active situation detail
  if(situation) return <SituationDetail C={C} s={situation} onBack={()=>setSituation(null)} script={script}/>;

  // Active session
  if(deck && mode){
    return(
      <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
        <div style={{padding:"50px 20px 6px"}}>
          <button onClick={()=>setMode(null)} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.t2,fontSize:12,cursor:"pointer"}}>‹ {deck.label}</button>
        </div>
        {mode==="flash" ? <FlashcardMode C={C} deck={deck.deck} onExit={()=>setMode(null)} onRecord={onRecordKana}/>
         : mode==="quiz" ? <QuizMode      C={C} deck={deck.deck} onExit={()=>setMode(null)} onRecord={onRecordKana}/>
                         : <DrawKanaMode  C={C} deck={deck.deck} onExit={()=>setMode(null)} onRecord={onRecordKana}/>}
      </div>
    );
  }

  // Mode selection for a chosen deck
  if(deck){
    return(
      <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
        <div style={{padding:"50px 20px 110px"}}>
          <button onClick={()=>setDeck(null)} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.t2,fontSize:12,cursor:"pointer",marginBottom:24}}>‹ Alphabets</button>
          <div style={{textAlign:"center",marginBottom:30}}>
            <div style={{fontSize:64,fontFamily:"'Noto Serif JP',serif",color:C.text,marginBottom:6}}>{deck.emoji}</div>
            <div style={{fontSize:22,color:C.text,fontWeight:500}}>{deck.label}</div>
            <div style={{fontSize:13,color:C.t2,marginTop:4}}>{deck.desc}</div>
          </div>
          <div style={{fontSize:10,color:C.t3,letterSpacing:".2em",marginBottom:12,textTransform:"uppercase"}}>Choisis un mode</div>
          <div style={{display:"flex",flexDirection:"column",gap:11}}>
            <div onClick={()=>setMode("flash")} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer"}}>
              <span style={{fontSize:30}}>🃏</span>
              <div style={{flex:1}}><div style={{fontSize:15,color:C.text,fontWeight:500,marginBottom:2}}>Flashcards</div><div style={{fontSize:12,color:C.t2}}>Glisse pour répondre : je connais / à revoir</div></div>
              <span style={{fontSize:18,color:C.t3}}>›</span>
            </div>
            <div onClick={()=>setMode("quiz")} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer"}}>
              <span style={{fontSize:30}}>✍️</span>
              <div style={{flex:1}}><div style={{fontSize:15,color:C.text,fontWeight:500,marginBottom:2}}>Quiz</div><div style={{fontSize:12,color:C.t2}}>Choisis la bonne lecture parmi 4 options</div></div>
              <span style={{fontSize:18,color:C.t3}}>›</span>
            </div>
            <div onClick={()=>setMode("draw")} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer"}}>
              <span style={{fontSize:30}}>🖌️</span>
              <div style={{flex:1}}><div style={{fontSize:15,color:C.text,fontWeight:500,marginBottom:2}}>Dessiner</div><div style={{fontSize:12,color:C.t2}}>On te donne le son, tu traces le bon kana</div></div>
              <span style={{fontSize:18,color:C.t3}}>›</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Home: choix entre Parcours et Entraînement libre
  const seasonKey = currentSeasonKey();
  const acc = SEASON_ACCENT[seasonKey];
  return(
    <div ref={scrollRef} style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
      {/* En-tête sticky */}
      <div style={{padding:"50px 20px 14px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>学 · APPRENDRE</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text}}>{script==="romaji"?"Nihongo wo manabu":script==="kana"?"にほんごをまなぶ":"日本語を学ぶ"}</div>
          {learnMode && <button onClick={()=>setLearnMode(null)} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"6px 13px",color:C.t2,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>‹ Menu</button>}
        </div>
      </div>
      <div style={{padding:"20px 20px 110px"}}>

        {/* ── Écran de choix (aucun mode sélectionné) ── */}
        {learnMode==="review" && <ReviewMode C={C} dueChars={dueChars} onRecord={onRecordKana} onExit={()=>setLearnMode(null)}/>}

        {!learnMode && (()=>{
          const doneCount = TOKYO_PATH.filter(s=>completed.includes(s.id)).length;
          const pct = Math.round((doneCount/TOKYO_PATH.length)*100);
          return(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>

              {/* Carte Révision du jour — si des kana sont échus */}
              {dueChars.length > 0 && (
                <div className="lift" onClick={()=>setLearnMode("review")} style={{cursor:"pointer",borderRadius:18,overflow:"hidden",border:`1px solid ${C.gold}55`,background:`linear-gradient(150deg,${C.gold}1f,transparent 70%)`,position:"relative"}}>
                  <div style={{padding:"18px 20px",display:"flex",alignItems:"center",gap:16}}>
                    <div style={{fontSize:40,animation:"heartbeat 1.8s ease infinite"}}>🔁</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:10,color:C.gold,letterSpacing:".15em",textTransform:"uppercase",marginBottom:4,fontWeight:600}}>Révision du jour</div>
                      <div style={{fontSize:17,color:C.text,fontWeight:700,marginBottom:2}}>{dueChars.length} caractère{dueChars.length>1?"s":""} à revoir</div>
                      <div style={{fontSize:12,color:C.t2}}>Renforce ta mémoire avant d'oublier 🧠</div>
                    </div>
                    <span style={{fontSize:20,color:C.gold}}>›</span>
                  </div>
                </div>
              )}

              {/* Carte Parcours Tokyo — hero */}
              <div className="lift" onClick={()=>setLearnMode("path")} style={{cursor:"pointer",borderRadius:20,overflow:"hidden",border:`1px solid rgba(201,70,61,0.3)`,boxShadow:"0 4px 20px rgba(201,70,61,0.08)"}}>
                <div style={{height:6,background:`linear-gradient(90deg,${C.red},${C.gold})`}}/>
                <div style={{padding:"22px 20px 20px",background:`linear-gradient(150deg,rgba(201,70,61,0.12),rgba(158,122,26,0.05))`,position:"relative",overflow:"hidden"}}>
                  <div style={{fontSize:72,position:"absolute",top:-8,right:6,opacity:0.1,fontFamily:"'Noto Serif JP',serif"}}>🗼</div>
                  <div style={{fontSize:10,color:C.red,letterSpacing:".15em",textTransform:"uppercase",marginBottom:8}}>Parcours guidé · 8 paliers</div>
                  <div style={{fontSize:20,color:C.text,fontWeight:700,marginBottom:6}}>Survivre à Tokyo</div>
                  <div style={{fontSize:13,color:C.t2,lineHeight:1.55,marginBottom:16,maxWidth:280}}>Un programme étape par étape pour te débrouiller une semaine sur place : lire, saluer, commander, te déplacer.</div>
                  {/* Barre progression */}
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{flex:1,height:7,background:C.s3,borderRadius:4,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.gold},${C.red})`,borderRadius:4,transition:"width .6s ease"}}/>
                    </div>
                    <span style={{fontSize:12,color:C.t2,fontWeight:600,whiteSpace:"nowrap"}}>{doneCount}/{TOKYO_PATH.length} {pct>0&&`· ${pct}%`}</span>
                  </div>
                </div>
              </div>

              {/* Carte Apprendre les alphabets */}
              <div className="lift" onClick={()=>setLearnMode("alphabets")} style={{cursor:"pointer",padding:"20px",borderRadius:18,background:C.s1,border:`1px solid ${C.border}`,position:"relative",overflow:"hidden"}}>
                <div style={{height:4,background:`linear-gradient(90deg,${acc.accent},transparent)`,position:"absolute",top:0,left:0,right:0,borderRadius:"18px 18px 0 0"}}/>
                <div style={{fontSize:10,color:acc.accent,letterSpacing:".15em",textTransform:"uppercase",marginBottom:8}}>仮名 · Syllabaires</div>
                <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                  <div style={{width:48,height:48,borderRadius:13,background:acc.soft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>🎴</div>
                  <div>
                    <div style={{fontSize:17,color:C.text,fontWeight:600,marginBottom:5}}>Apprendre les alphabets</div>
                    <div style={{fontSize:12,color:C.t2,lineHeight:1.55}}>Hiragana, katakana et sons avancés : flashcards, quiz et dessin des kana.</div>
                  </div>
                </div>
              </div>

              {/* Carte Situations courantes */}
              <div className="lift" onClick={()=>setLearnMode("situations")} style={{cursor:"pointer",padding:"20px",borderRadius:18,background:C.s1,border:`1px solid ${C.border}`,position:"relative",overflow:"hidden"}}>
                <div style={{height:4,background:`linear-gradient(90deg,#C97D3C,transparent)`,position:"absolute",top:0,left:0,right:0,borderRadius:"18px 18px 0 0"}}/>
                <div style={{fontSize:10,color:"#C97D3C",letterSpacing:".15em",textTransform:"uppercase",marginBottom:8}}>会話 · Expressions</div>
                <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                  <div style={{width:48,height:48,borderRadius:13,background:"rgba(201,125,60,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>💬</div>
                  <div>
                    <div style={{fontSize:17,color:C.text,fontWeight:600,marginBottom:5}}>Situations courantes</div>
                    <div style={{fontSize:12,color:C.t2,lineHeight:1.55}}>Les phrases et expressions utiles au quotidien, classées par situation.</div>
                  </div>
                </div>
              </div>

              {/* Carte Compréhension écrite */}
              <div className="lift" onClick={()=>setLearnMode("read")} style={{cursor:"pointer",padding:"20px",borderRadius:18,background:C.s1,border:`1px solid ${C.border}`,position:"relative",overflow:"hidden"}}>
                <div style={{height:4,background:`linear-gradient(90deg,#5B9BD5,transparent)`,position:"absolute",top:0,left:0,right:0,borderRadius:"18px 18px 0 0"}}/>
                <div style={{fontSize:10,color:"#5B9BD5",letterSpacing:".15em",textTransform:"uppercase",marginBottom:8}}>読解 · Lecture</div>
                <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                  <div style={{width:48,height:48,borderRadius:13,background:"rgba(91,155,213,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>📖</div>
                  <div>
                    <div style={{fontSize:17,color:C.text,fontWeight:600,marginBottom:5}}>Compréhension écrite</div>
                    <div style={{fontSize:12,color:C.t2,lineHeight:1.55}}>Lis de courts textes en japonais et réponds à des questions de compréhension.</div>
                  </div>
                </div>
              </div>

              {/* Carte Compréhension orale */}
              <div className="lift" onClick={()=>setLearnMode("listen")} style={{cursor:"pointer",padding:"20px",borderRadius:18,background:C.s1,border:`1px solid ${C.border}`,position:"relative",overflow:"hidden"}}>
                <div style={{height:4,background:`linear-gradient(90deg,#7A4A6A,transparent)`,position:"absolute",top:0,left:0,right:0,borderRadius:"18px 18px 0 0"}}/>
                <div style={{fontSize:10,color:"#9A6A8A",letterSpacing:".15em",textTransform:"uppercase",marginBottom:8}}>聴解 · Écoute</div>
                <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                  <div style={{width:48,height:48,borderRadius:13,background:"rgba(122,74,106,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>🎧</div>
                  <div>
                    <div style={{fontSize:17,color:C.text,fontWeight:600,marginBottom:5}}>Compréhension orale</div>
                    <div style={{fontSize:12,color:C.t2,lineHeight:1.55}}>Écoute des phrases en japonais (texte masqué) et teste ta compréhension.</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Mode Parcours ── */}
        {learnMode==="path" && (<>
        {/* ── Parcours "Survivre à Tokyo" ── */}
        <div style={{marginBottom:30}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <div style={{fontSize:15,color:C.text,fontWeight:600}}>🗼 Survivre à Tokyo</div>
            <span style={{fontSize:11,color:C.t2,fontWeight:600}}>{TOKYO_PATH.filter(s=>completed.includes(s.id)).length}/{TOKYO_PATH.length}</span>
          </div>
          <div style={{fontSize:12,color:C.t2,marginBottom:14,lineHeight:1.5}}>
            {TOKYO_PATH.every(s=>completed.includes(s.id)) ? "🎉 Bravo ! Tu as les bases pour te débrouiller une semaine à Tokyo." : "Un parcours guidé, étape par étape, pour te débrouiller sur place."}
          </div>
          <div style={{height:6,background:C.s3,borderRadius:3,overflow:"hidden",marginBottom:20}}>
            <div style={{height:"100%",width:`${(TOKYO_PATH.filter(s=>completed.includes(s.id)).length/TOKYO_PATH.length)*100}%`,background:`linear-gradient(90deg,${C.gold},${C.red})`,borderRadius:3,transition:"width .5s"}}/>
          </div>
          <div>
            {TOKYO_PATH.map((step,i)=>{
              const isDone = completed.includes(step.id);
              const prevDone = i===0 || completed.includes(TOKYO_PATH[i-1].id);
              const isLocked = !prevDone && !isDone;
              const isFinal = step.type==="final";
              return(
                <div key={step.id} style={{display:"flex",gap:12,alignItems:"stretch"}}>
                  {/* Timeline dot */}
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:32,flexShrink:0}}>
                    <div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,background:isDone?C.red:(isLocked?C.s2:isFinal?"rgba(201,70,61,0.15)":"rgba(201,70,61,0.09)"),border:`2px solid ${isDone?C.red:(isLocked?C.border:isFinal?"rgba(201,70,61,0.5)":"rgba(201,70,61,0.3)")}`,color:isDone?"#fff":C.t2,boxShadow:isDone?"0 2px 8px rgba(201,70,61,0.3)":"none",transition:"all .3s"}}>
                      {isDone?"✓":(isLocked?"🔒":step.emoji)}
                    </div>
                    {i<TOKYO_PATH.length-1 && <div style={{flex:1,width:2,background:isDone?`linear-gradient(${C.red},rgba(201,70,61,0.2))`:C.border,minHeight:12,margin:"3px 0",borderRadius:1}}/>}
                  </div>
                  {/* Carte palier */}
                  <div onClick={()=>{ if(!isLocked) setPathStep(step); }} className={isLocked?"":"lift"}
                    style={{flex:1,marginBottom:10,padding:"12px 15px",cursor:isLocked?"default":"pointer",background:isDone?"rgba(201,70,61,0.04)":(isFinal&&!isLocked)?"rgba(201,70,61,0.06)":C.s1,border:`1px solid ${isDone?"rgba(201,70,61,0.35)":(isFinal&&!isLocked)?"rgba(201,70,61,0.3)":C.border}`,borderRadius:13,opacity:isLocked?0.5:1,transition:"all .2s",position:"relative",overflow:"hidden"}}>
                    {isDone && <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${C.red},transparent)`,borderRadius:"13px 13px 0 0"}}/>}
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:13,color:isDone?C.t2:C.text,fontWeight:isDone?400:600,textDecoration:isDone?"none":"none"}}>{step.title}</span>
                      {!isLocked && !isDone && <span style={{fontSize:16,color:"rgba(201,70,61,0.6)"}}>›</span>}
                      {isDone && <span style={{fontSize:11,color:C.red,fontWeight:600}}>✓</span>}
                    </div>
                    <div style={{fontSize:11,color:C.t3,lineHeight:1.4}}>{isLocked?"Termine l'étape précédente pour débloquer":step.goal}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </>)}

        {/* ── Mode Entraînement libre (flashcards + situations) ── */}
        {learnMode==="read" && <ComprehensionRead C={C} db={db} script={script} onRecord={onRecordKana}/>}
        {learnMode==="listen" && <ComprehensionListen C={C} db={db} script={script}/>}

        {learnMode==="alphabets" && (<>
        {/* Syllabaires */}
        {["Bases","Avancé"].map(grp=>(
          <div key={grp}>
            <div style={{display:"flex",alignItems:"center",gap:8,margin:grp==="Bases"?"0 0 12px":"24px 0 12px"}}>
              <div style={{flex:1,height:1,background:C.border}}/>
              <span style={{fontSize:10,color:C.t3,letterSpacing:".2em",textTransform:"uppercase",flexShrink:0}}>{grp==="Bases" ? "🔤 Syllabaires" : "⚡ Sons avancés"}</span>
              <div style={{flex:1,height:1,background:C.border}}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}} className="stagger">
              {LEARN_DECKS.filter(d=>d.group===grp).map((d,i)=>{
                const mastered = (d.deck||[]).filter(c=>(kp[c.k]?.known||0)>=2).length;
                const pct = d.deck.length ? mastered/d.deck.length : 0;
                const pctRounded = Math.round(pct*100);
                return(
                  <div key={i} className="lift" onClick={()=>setDeck(d)} style={{background:C.s1,border:`1px solid ${pct===1?"rgba(78,128,96,0.4)":C.border}`,borderRadius:16,padding:"15px 17px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",position:"relative",overflow:"hidden"}}>
                    {pct===1 && <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${C.green},transparent)`}}/>}
                    <div style={{width:46,height:46,borderRadius:12,background:pct===1?"rgba(78,128,96,0.1)":"rgba(201,70,61,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontFamily:"'Noto Serif JP',serif",color:pct===1?C.green:C.red,flexShrink:0}}>{d.emoji}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:2}}>
                        <span style={{fontSize:14,color:C.text,fontWeight:500}}>{d.label}</span>
                        <span style={{fontSize:11,color:C.t3,fontFamily:"'Noto Serif JP',serif"}}>{d.jp}</span>
                      </div>
                      <div style={{fontSize:11,color:C.t2,marginBottom:7}}>{d.desc}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{flex:1,height:4,background:C.s3,borderRadius:2,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct*100}%`,background:pct===1?C.green:C.red,borderRadius:2,transition:"width .4s"}}/>
                        </div>
                        <span style={{fontSize:10,color:pct===1?C.green:C.t3,fontWeight:600,whiteSpace:"nowrap"}}>{pctRounded}%</span>
                      </div>
                    </div>
                    <span style={{fontSize:18,color:pct===1?C.green:C.t3}}>›</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        </>)}

        {learnMode==="situations" && (<>
        {/* Situations courantes */}
        <div style={{display:"flex",flexDirection:"column",gap:10}} className="stagger">
          {situations.map((s,i)=>(
            <div key={i} className="lift" onClick={()=>setSituation(s)} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:"15px 16px",cursor:"pointer"}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
                <div style={{width:44,height:44,borderRadius:11,background:C.s2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{s.emoji}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                    <span style={{fontSize:15,color:C.text,fontWeight:500}}>{s.titre}</span>
                    <span style={{fontSize:11,color:C.t3,fontFamily:"'Noto Serif JP',serif"}}>{s.nom_jp}</span>
                  </div>
                  <div style={{fontSize:11,color:C.t2,lineHeight:1.45,marginTop:2}}>{s.phrases.length} phrases · de l'arrivée au départ</div>
                </div>
                <span style={{fontSize:18,color:C.t3,flexShrink:0}}>›</span>
              </div>
              {/* Aperçu de la première phrase — façon couverture de carrousel */}
              {s.phrases?.[0] && (
                <div style={{padding:"10px 13px",background:C.s2,borderRadius:10,borderLeft:`2px solid ${C.red}`}}>
                  <div style={{fontSize:14,fontFamily:"'Noto Serif JP',serif",color:C.text,marginBottom:2}}>{jpMain(s.phrases[0], script)}</div>
                  <div style={{fontSize:11,color:C.t3,fontStyle:"italic"}}>{s.phrases[0].fr}</div>
                </div>
              )}
            </div>
          ))}
          {situations.length===0 && <div style={{padding:"18px",textAlign:"center",color:C.t3,fontSize:12}}>Chargement…</div>}
        </div>
        </>)}
      </div>
    </div>
  );
}

// ─── Onglet Voyage (à venir) ──────────────────────────────────────────────────
// ─── Fiche itinéraire visuelle (style "Japan Travel Guide") ───────────────────
// Transforme un voyage préconçu en une belle timeline illustrée, jour par jour.
function ItineraryCard({ C, trip, lieuById, villeById, onClose, onAdopt, onOpenLieu }){
  const [dayIdx, setDayIdx] = useState(0);
  const jours = trip.jours || [];
  const day = jours[dayIdx];
  const ville = day && villeById[day.villeId];
  // Icône de transport selon une heuristique simple
  const transportIcon = (i)=> i===0 ? null : "🚶";

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
      {/* En-tête éditorial */}
      <div style={{padding:"50px 20px 0",background:C.bg}}>
        <button onClick={onClose} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"6px 13px",color:C.t2,fontSize:12,cursor:"pointer",marginBottom:16}}>‹ Retour</button>
      </div>

      {/* Bannière titre — style magazine */}
      <div style={{margin:"0 20px 18px",borderRadius:20,overflow:"hidden",position:"relative",background:`linear-gradient(150deg,${C.red}28,${C.gold}18 70%,transparent)`,border:`1px solid ${C.border}`}}>
        <div style={{padding:"24px 22px"}}>
          <div style={{fontSize:10,color:C.red,letterSpacing:".25em",textTransform:"uppercase",marginBottom:8,fontWeight:600}}>旅程 · Itinéraire</div>
          <div style={{fontSize:30,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,lineHeight:1.1,marginBottom:8}}>{trip.titre}</div>
          <div style={{fontSize:12,color:C.t2,lineHeight:1.55,marginBottom:12}}>{trip.description}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:11,padding:"4px 11px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,color:C.t2}}>🗓️ {trip.duree} jours</span>
            <span style={{fontSize:11,padding:"4px 11px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,color:C.t2}}>{trip.emoji} {trip.niveau}</span>
            <span style={{fontSize:11,padding:"4px 11px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,color:C.t2}}>📍 {trip.villes.map(id=>villeById[id]?.nom||id).join(" · ")}</span>
          </div>
        </div>
      </div>

      {/* Sélecteur de jour — onglets horizontaux */}
      <div style={{display:"flex",gap:8,overflowX:"auto",padding:"0 20px 16px",WebkitOverflowScrolling:"touch"}}>
        {jours.map((j,i)=>(
          <button key={i} onClick={()=>setDayIdx(i)} className="pop-press" style={{flexShrink:0,padding:"8px 15px",borderRadius:20,border:`1px solid ${i===dayIdx?C.red:C.border}`,background:i===dayIdx?C.red:C.s1,color:i===dayIdx?"#fff":C.t2,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
            Jour {j.num}
          </button>
        ))}
      </div>

      {/* Timeline du jour sélectionné */}
      <div key={dayIdx} className="screen-in" style={{padding:"0 20px 20px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
          <span style={{fontSize:22}}>{ville?.emoji}</span>
          <div>
            <div style={{fontSize:16,color:C.text,fontWeight:600}}>{day?.titre || `Jour ${day?.num}`}</div>
            <div style={{fontSize:11,color:C.t3}}>{ville?.nom}</div>
          </div>
        </div>

        {/* Étapes en timeline verticale */}
        <div style={{position:"relative"}}>
          {(day?.etapes||[]).map((e,i)=>{
            const l = lieuById[e.lieuId];
            if(!l) return null;
            const isLast = i === day.etapes.length-1;
            const img = l.photo || l.image;
            return(
              <div key={i} style={{display:"flex",gap:14,position:"relative",paddingBottom:isLast?0:18}}>
                {/* Colonne timeline : heure + point + ligne */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,width:48}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.red,marginBottom:6,fontFamily:"'Noto Serif JP',serif"}}>{e.heure||""}</div>
                  <div style={{width:38,height:38,borderRadius:"50%",background:`${C.red}18`,border:`2px solid ${C.red}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,zIndex:1}}>{l.emoji}</div>
                  {!isLast && <div style={{width:2,flex:1,background:`${C.red}33`,marginTop:4,minHeight:30}}/>}
                </div>
                {/* Carte du lieu */}
                <div className="lift" onClick={()=>onOpenLieu&&onOpenLieu(l.id)} style={{flex:1,minWidth:0,background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",cursor:"pointer",marginBottom:2}}>
                  <div style={{height:110,position:"relative",background:`linear-gradient(135deg,${C.red}22,${C.s2})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {/* Emoji de fallback, toujours présent en arrière-plan */}
                    <span style={{fontSize:44,opacity:0.5}}>{l.emoji}</span>
                    {img && <img src={img} alt={l.nom} loading="lazy" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={(e)=>{e.target.style.display="none";}}/>}
                  </div>
                  <div style={{padding:"11px 13px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                      <span style={{fontSize:14,color:C.text,fontWeight:600}}>{l.nom}</span>
                      {l.nom_jp && <span style={{fontSize:10,color:C.t3,fontFamily:"'Noto Serif JP',serif"}}>{l.nom_jp}</span>}
                    </div>
                    <div style={{fontSize:11,color:C.t2,lineHeight:1.45,marginBottom:6}}>{(l.description||"").slice(0,90)}{(l.description||"").length>90?"…":""}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {l.categorie && <span style={{fontSize:9,padding:"2px 8px",background:C.s2,borderRadius:12,color:C.t3}}>{l.categorie}</span>}
                      {l.duree && <span style={{fontSize:9,padding:"2px 8px",background:C.s2,borderRadius:12,color:C.t3}}>⏱️ {l.duree}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA : adopter l'itinéraire */}
      <div style={{padding:"4px 20px 110px"}}>
        <button onClick={onAdopt} className="pop-press" style={{width:"100%",padding:"15px",background:C.red,border:"none",borderRadius:14,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 16px ${C.red}44`}}>
          Utiliser cet itinéraire →
        </button>
      </div>
    </div>
  );
}

function VoyageScreen({C, user, db, script, session, isPremium, onOpenPremium}){
  const seasonKey = currentSeasonKey();
  const acc = SEASON_ACCENT[seasonKey];
  const villes = db?.villes || [];
  const lieux = db?.lieux || [];
  const preconcus = db?.voyages_preconcus || [];
  const villeById = useMemo(()=>Object.fromEntries(villes.map(v=>[v.id,v])), [villes]);

  const [trips, setTrips] = useState(()=>loadTrips());
  // vues : "home" | "browse" (préconçus) | "create" | "trip"
  const [view, setView] = useState("home");
  const [activeTripId, setActiveTripId] = useState(null);
  const [previewPreco, setPreviewPreco] = useState(null); // voyage préconçu en aperçu visuel
  const [showPremium, setShowPremium] = useState(false);
  const pushTimer = useRef(null);
  // Index lieux pour les fiches visuelles
  const lieuByIdGlobal = useMemo(()=>Object.fromEntries((db?.lieux||[]).map(l=>[l.id,l])), [db]);

  // ── Sync cloud : pull au login ──
  useEffect(()=>{
    if(session?.user && supabaseEnabled){
      fetchTrips(session.user.id).then(cloud=>{
        if(Array.isArray(cloud) && cloud.length>0){
          // Le cloud fait autorité au login (fusion simple : on prend le cloud s'il existe)
          setTrips(cloud); saveTrips(cloud);
        } else if(loadTrips().length>0){
          // Pas de cloud mais des voyages locaux → on les pousse
          saveTripsCloud(session.user.id, loadTrips());
        }
      });
    }
  },[session?.user?.id]);

  // ── Persistance locale + push cloud debounce ──
  const persist = (next)=>{
    setTrips(next); saveTrips(next);
    if(session?.user && supabaseEnabled){
      clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(()=>{ saveTripsCloud(session.user.id, next); }, 1200);
    }
  };
  const activeTrip = trips.find(t=>t.id===activeTripId);

  // Création
  const tryCreate = ()=>{
    if(trips.length >= FREE_TRIP_LIMIT && !isPremium){ setShowPremium(true); return; }
    setView("create");
  };
  const tryAdopt = (p)=>{
    if(trips.length >= FREE_TRIP_LIMIT && !isPremium){ setShowPremium(true); return; }
    const t = tripFromPreconcu(p);
    persist([...trips, t]); setActiveTripId(t.id); setView("trip");
  };
  const createTrip = (trip)=>{ persist([...trips, trip]); setActiveTripId(trip.id); setView("trip"); };
  const updateTrip = (updated)=>{ persist(trips.map(t=>t.id===updated.id?updated:t)); };
  const deleteTrip = (id)=>{ persist(trips.filter(t=>t.id!==id)); setActiveTripId(null); setView("home"); };

  // ─── Vue : création ───
  if(view==="create"){
    return <VoyageCreate C={C} villes={villes} onCancel={()=>setView("home")} onCreate={createTrip}/>;
  }
  // ─── Vue : préconçus ───
  // ─── Vue : aperçu visuel d'un itinéraire préconçu ───
  if(previewPreco){
    return <ItineraryCard C={C} trip={previewPreco} lieuById={lieuByIdGlobal} villeById={villeById}
              onClose={()=>setPreviewPreco(null)}
              onAdopt={()=>{ const p=previewPreco; setPreviewPreco(null); tryAdopt(p); }}
              onOpenLieu={null}/>;
  }

  if(view==="browse"){
    return(
      <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
        <div style={{padding:"50px 20px 14px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
          <button onClick={()=>setView("home")} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"6px 13px",color:C.t2,fontSize:12,cursor:"pointer",marginBottom:10}}>‹ Retour</button>
          <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>✨ INSPIRATION</div>
          <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text}}>Itinéraires préconçus</div>
        </div>
        <div style={{padding:"18px 20px 110px"}} className="stagger">
          {preconcus.map(p=>(
            <div key={p.id} className="lift" style={{marginBottom:14,background:C.s1,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden",cursor:"pointer"}} onClick={()=>{setPreviewPreco(p);}}>
              <div style={{height:84,background:`linear-gradient(135deg,${C.red}22,${C.gold}18)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:38,position:"relative"}}>
                {p.emoji}
                <span style={{position:"absolute",bottom:8,left:12,fontSize:9,color:C.text,background:C.s1,padding:"3px 9px",borderRadius:12,opacity:0.9}}>{p.niveau}</span>
              </div>
              <div style={{padding:"13px 15px"}}>
                <div style={{fontSize:15,color:C.text,fontWeight:600,marginBottom:3}}>{p.titre}</div>
                <div style={{fontSize:11,color:C.t3,marginBottom:6}}>{p.duree} jours · {p.villes.map(id=>villeById[id]?.nom||id).join(", ")}</div>
                <div style={{fontSize:12,color:C.t2,lineHeight:1.5,marginBottom:12}}>{p.description}</div>
                <button onClick={(e)=>{e.stopPropagation(); tryAdopt(p);}} style={{width:"100%",padding:"11px",background:C.red,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>Utiliser cet itinéraire</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  // ─── Vue : un voyage ───
  if(view==="trip" && activeTrip){
    return <VoyageTrip C={C} trip={activeTrip} db={db} villeById={villeById} script={script} user={user} isPremium={isPremium} onOpenPremium={onOpenPremium}
              onBack={()=>setView("home")} onUpdate={updateTrip} onDelete={deleteTrip}/>;
  }

  // ─── Vue : accueil ───
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
      <div style={{padding:"50px 20px 14px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>旅 · VOYAGE</div>
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text}}>Mon voyage</div>
      </div>

      <div style={{padding:"18px 20px 110px"}}>
        {trips.length===0 ? (
          <>
            {/* État vide */}
            <div style={{textAlign:"center",padding:"24px 4px 28px"}}>
              <div style={{width:88,height:88,borderRadius:"50%",background:acc.soft,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:42,margin:"0 auto 20px"}}>🗺️</div>
              <div style={{fontSize:18,color:C.text,fontWeight:600,marginBottom:8}}>Planifie ton séjour</div>
              <div style={{fontSize:13,color:C.t2,lineHeight:1.6,maxWidth:300,margin:"0 auto 22px"}}>Crée ton itinéraire jour par jour, ou inspire-toi d'un voyage préconçu.</div>
              <button onClick={tryCreate} style={{width:"100%",maxWidth:320,padding:"14px",background:C.red,border:"none",borderRadius:13,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:10}}>+ Créer mon voyage</button>
              <button onClick={()=>setView("browse")} style={{width:"100%",maxWidth:320,padding:"14px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:13,color:C.text,fontSize:14,fontWeight:600,cursor:"pointer"}}>✨ Explorer des itinéraires</button>
            </div>
          </>
        ) : (
          <>
            {/* Voyage existant */}
            {trips.map(t=>{
              const nbLieux = t.jours.reduce((a,j)=>a+j.etapes.length,0);
              return(
                <div key={t.id} className="lift" onClick={()=>{setActiveTripId(t.id);setView("trip");}} style={{marginBottom:14,background:C.s1,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden",cursor:"pointer"}}>
                  <div style={{height:70,background:`linear-gradient(135deg,${acc.accent}33,${C.gold}18)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30}}>🗾</div>
                  <div style={{padding:"13px 15px"}}>
                    <div style={{fontSize:16,color:C.text,fontWeight:600,marginBottom:3}}>{t.titre}</div>
                    <div style={{fontSize:11,color:C.t3}}>{t.jours.length} jour{t.jours.length>1?"s":""} · {nbLieux} lieu{nbLieux>1?"x":""} · {t.villes.map(id=>villeById[id]?.nom||id).join(", ")}</div>
                  </div>
                </div>
              );
            })}
            {/* Ajouter un 2e voyage → premium */}
            <button onClick={tryCreate} style={{width:"100%",padding:"13px",background:"transparent",border:`1px dashed ${C.border}`,borderRadius:13,color:C.t2,fontSize:13,cursor:"pointer",marginTop:4}}>
              + Nouveau voyage {!isPremium && "🔒"}
            </button>
            <button onClick={()=>setView("browse")} style={{width:"100%",padding:"13px",background:"transparent",border:"none",color:C.t3,fontSize:12,cursor:"pointer",marginTop:6}}>✨ Voir les itinéraires préconçus</button>
          </>
        )}
      </div>

      {/* Modale premium → ouvre la vraie page Premium */}
      {showPremium && (
        <div onClick={()=>setShowPremium(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:440,background:C.s1,borderRadius:"22px 22px 0 0",padding:"26px 22px 32px",animation:"fadeUp .3s ease"}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:12}}>🌸</div>
              <div style={{fontSize:19,color:C.text,fontWeight:700,marginBottom:8}}>Voyages illimités avec Premium</div>
              <div style={{fontSize:13,color:C.t2,lineHeight:1.6,marginBottom:20}}>La version gratuite te permet de planifier un voyage. Passe à Premium pour créer autant d'itinéraires que tu veux, ajouter tes propres lieux, et débloquer tout le contenu.</div>
              <button onClick={()=>{ setShowPremium(false); onOpenPremium&&onOpenPremium(); }} style={{width:"100%",padding:"14px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:8}}>Découvrir Premium</button>
              <button onClick={()=>setShowPremium(false)} style={{width:"100%",padding:"12px",background:"transparent",border:"none",color:C.t3,fontSize:13,cursor:"pointer"}}>Plus tard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Écran de création de voyage ──────────────────────────────────────────────
function VoyageCreate({C, villes, onCancel, onCreate}){
  const [titre, setTitre] = useState("Mon voyage au Japon");
  const [selVilles, setSelVilles] = useState([]);
  const [modeDates, setModeDates] = useState("jours"); // "jours" | "calendrier"
  const [nbJours, setNbJours] = useState(5);
  const [dateDebut, setDateDebut] = useState("");

  const toggleVille = (id)=> setSelVilles(s=> s.includes(id)? s.filter(x=>x!==id) : [...s,id]);
  // Réordonne une ville sélectionnée dans la liste (delta = -1 monte, +1 descend).
  const moveVille = (id, delta)=> setSelVilles(s=>{
    const i = s.indexOf(id);
    const j = i + delta;
    if(i<0 || j<0 || j>=s.length) return s;
    const next = [...s];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const canCreate = titre.trim() && selVilles.length>0;

  const submit = ()=>{
    if(!canCreate) return;
    const n = modeDates==="jours" ? Math.max(1,Math.min(30,nbJours||1)) : (nbJours||selVilles.length||1);
    const jours = Array.from({length:n},(_,i)=>({
      num:i+1, date:"", villeId: selVilles[Math.min(i,selVilles.length-1)], titre:"", etapes:[]
    }));
    onCreate({
      id: makeTripId(), titre:titre.trim(), mode_dates:modeDates,
      dateDebut: modeDates==="calendrier"?dateDebut:"",
      villes:[...selVilles], jours,
      checklist: DEFAULT_CHECKLIST.map((t,i)=>({id:"c"+i,texte:t,fait:false})),
    });
  };

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
      <div style={{padding:"50px 20px 14px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
        <button onClick={onCancel} style={{background:"transparent",border:"none",color:C.t2,fontSize:13,cursor:"pointer",padding:0,marginBottom:8}}>‹ Annuler</button>
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text}}>Nouveau voyage</div>
      </div>

      <div style={{padding:"18px 20px 120px"}}>
        {/* Titre */}
        <div style={{fontSize:10,color:C.t3,letterSpacing:".15em",marginBottom:7,textTransform:"uppercase"}}>Titre</div>
        <input value={titre} onChange={e=>setTitre(e.target.value)} style={{width:"100%",boxSizing:"border-box",padding:"13px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:11,color:C.text,fontSize:14,marginBottom:20,fontFamily:"inherit"}}/>

        {/* Villes */}
        <div style={{fontSize:10,color:C.t3,letterSpacing:".15em",marginBottom:7,textTransform:"uppercase"}}>Villes ({selVilles.length})</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:selVilles.length?14:20}}>
          {villes.map(v=>{
            const on = selVilles.includes(v.id);
            return <button key={v.id} onClick={()=>toggleVille(v.id)} style={{padding:"8px 13px",borderRadius:18,fontSize:12,cursor:"pointer",border:`1px solid ${on?C.red:C.border}`,background:on?"rgba(201,70,61,0.12)":C.s1,color:on?C.text:C.t2}}>{v.emoji} {v.nom} {on?"✓":""}</button>;
          })}
        </div>

        {/* Ordre du parcours — réordonnable, détermine l'ordre des jours */}
        {selVilles.length>1 && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:10,color:C.t3,letterSpacing:".15em",marginBottom:7,textTransform:"uppercase"}}>Ordre du parcours</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {selVilles.map((id,i)=>{
                const v = villes.find(x=>x.id===id);
                if(!v) return null;
                return(
                  <div key={id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:11}}>
                    <span style={{fontSize:11,color:C.t3,width:16,textAlign:"center",flexShrink:0}}>{i+1}</span>
                    <span style={{flex:1,fontSize:13,color:C.text}}>{v.emoji} {v.nom}</span>
                    <button onClick={()=>moveVille(id,-1)} disabled={i===0} aria-label="Monter" style={{width:28,height:28,borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,color:i===0?C.t3:C.text,fontSize:13,cursor:i===0?"default":"pointer",opacity:i===0?0.4:1,flexShrink:0}}>↑</button>
                    <button onClick={()=>moveVille(id,1)} disabled={i===selVilles.length-1} aria-label="Descendre" style={{width:28,height:28,borderRadius:8,border:`1px solid ${C.border}`,background:C.s2,color:i===selVilles.length-1?C.t3:C.text,fontSize:13,cursor:i===selVilles.length-1?"default":"pointer",opacity:i===selVilles.length-1?0.4:1,flexShrink:0}}>↓</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dates */}
        <div style={{fontSize:10,color:C.t3,letterSpacing:".15em",marginBottom:7,textTransform:"uppercase"}}>Dates</div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <button onClick={()=>setModeDates("jours")} style={{flex:1,padding:"10px",borderRadius:9,fontSize:12,cursor:"pointer",border:`1px solid ${modeDates==="jours"?C.red:C.border}`,background:modeDates==="jours"?"rgba(201,70,61,0.12)":C.s1,color:modeDates==="jours"?C.text:C.t2}}>Nombre de jours</button>
          <button onClick={()=>setModeDates("calendrier")} style={{flex:1,padding:"10px",borderRadius:9,fontSize:12,cursor:"pointer",border:`1px solid ${modeDates==="calendrier"?C.red:C.border}`,background:modeDates==="calendrier"?"rgba(201,70,61,0.12)":C.s1,color:modeDates==="calendrier"?C.text:C.t2}}>📅 Calendrier</button>
        </div>
        {modeDates==="jours" ? (
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
            <button onClick={()=>setNbJours(n=>Math.max(1,n-1))} style={{width:40,height:40,borderRadius:"50%",border:`1px solid ${C.border}`,background:C.s1,color:C.text,fontSize:20,cursor:"pointer"}}>−</button>
            <div style={{fontSize:18,color:C.text,fontWeight:600,minWidth:90,textAlign:"center"}}>{nbJours} jour{nbJours>1?"s":""}</div>
            <button onClick={()=>setNbJours(n=>Math.min(30,n+1))} style={{width:40,height:40,borderRadius:"50%",border:`1px solid ${C.border}`,background:C.s1,color:C.text,fontSize:20,cursor:"pointer"}}>+</button>
          </div>
        ) : (
          <div style={{marginBottom:24}}>
            <input type="date" value={dateDebut} onChange={e=>setDateDebut(e.target.value)} style={{width:"100%",boxSizing:"border-box",padding:"12px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:11,color:C.text,fontSize:14,marginBottom:10,fontFamily:"inherit"}}/>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:12,color:C.t2}}>Durée :</span>
              <button onClick={()=>setNbJours(n=>Math.max(1,n-1))} style={{width:34,height:34,borderRadius:"50%",border:`1px solid ${C.border}`,background:C.s1,color:C.text,fontSize:18,cursor:"pointer"}}>−</button>
              <span style={{fontSize:15,color:C.text,fontWeight:600,minWidth:70,textAlign:"center"}}>{nbJours} j</span>
              <button onClick={()=>setNbJours(n=>Math.min(30,n+1))} style={{width:34,height:34,borderRadius:"50%",border:`1px solid ${C.border}`,background:C.s1,color:C.text,fontSize:18,cursor:"pointer"}}>+</button>
            </div>
          </div>
        )}

        <button onClick={submit} disabled={!canCreate} style={{width:"100%",padding:"15px",background:canCreate?C.red:C.s3,border:"none",borderRadius:13,color:canCreate?"#fff":C.t3,fontSize:14,fontWeight:600,cursor:canCreate?"pointer":"default"}}>Créer le voyage →</button>
      </div>
    </div>
  );
}

// ─── Vue d'un voyage (placeholder étape suivante : itinéraire détaillé) ─────────
const VOYAGE_TYPES = [
  {id:"voir",label:"Voir",emoji:"👁️"},
  {id:"faire",label:"Faire",emoji:"🎯"},
  {id:"manger",label:"Manger",emoji:"🍜"},
  {id:"dormir",label:"Dormir",emoji:"🏨"},
  {id:"acheter",label:"Acheter",emoji:"🛍️"},
];

// ── Carte du jour (Leaflet + OpenStreetMap, gratuit, sans clé) ────────────────
function DayMap({ C, points }){
  const containerRef = useRef(null);
  const instanceRef = useRef(null);

  const ensureLeaflet = ()=> new Promise((resolve)=>{
    if(window.L){ resolve(window.L); return; }
    if(!document.getElementById("leaflet-css")){
      const link = document.createElement("link");
      link.id="leaflet-css"; link.rel="stylesheet";
      link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const existing = document.getElementById("leaflet-js");
    if(existing){ existing.addEventListener("load", ()=>resolve(window.L)); if(window.L) resolve(window.L); return; }
    const s = document.createElement("script");
    s.id="leaflet-js"; s.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = ()=>resolve(window.L);
    document.body.appendChild(s);
  });

  useEffect(()=>{
    let cancelled = false;
    const valid = points.filter(p=> typeof p.lat==="number" && typeof p.lng==="number");
    if(valid.length===0) return;
    ensureLeaflet().then((L)=>{
      if(cancelled || !containerRef.current || !L) return;
      if(instanceRef.current){ instanceRef.current.remove(); instanceRef.current=null; }
      const map = L.map(containerRef.current, { zoomControl:true });
      instanceRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom:19, attribution:"© OpenStreetMap" }).addTo(map);
      const latlngs = [];
      valid.forEach((p)=>{
        const idx = points.indexOf(p) + 1;
        const icon = L.divIcon({ className:"", html:`<div style="background:${C.red};color:#fff;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.4);border:2px solid #fff"><span style="transform:rotate(45deg);font-size:12px;font-weight:700">${idx}</span></div>`, iconSize:[26,26], iconAnchor:[13,26] });
        L.marker([p.lat,p.lng],{icon}).addTo(map).bindPopup(`<b>${idx}. ${p.nom||"Lieu"}</b>`);
        latlngs.push([p.lat,p.lng]);
      });
      if(latlngs.length>1) L.polyline(latlngs,{color:C.red,weight:2.5,opacity:0.6,dashArray:"6 6"}).addTo(map);
      if(latlngs.length===1) map.setView(latlngs[0],15); else map.fitBounds(latlngs,{padding:[30,30]});
      setTimeout(()=>map.invalidateSize(),100);
    });
    return ()=>{ cancelled=true; if(instanceRef.current){ instanceRef.current.remove(); instanceRef.current=null; } };
  }, [points]);

  const validCount = points.filter(p=> typeof p.lat==="number" && typeof p.lng==="number").length;
  if(validCount===0){
    return (
      <div style={{padding:"14px 16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,fontSize:11,color:C.t3,textAlign:"center",marginBottom:14}}>
        🗺️ Carte indisponible : les lieux de ce jour n'ont pas encore de coordonnées.
      </div>
    );
  }
  return (
    <div style={{marginBottom:16}}>
      <div ref={containerRef} style={{width:"100%",height:220,borderRadius:14,overflow:"hidden",border:`1px solid ${C.border}`,zIndex:0}}/>
      <div style={{fontSize:10,color:C.t3,marginTop:6,textAlign:"center"}}>📍 {validCount} lieu{validCount>1?"x":""} sur la carte · OpenStreetMap</div>
    </div>
  );
}

function VoyageTrip({C, trip, db, villeById, script, user, isPremium, onOpenPremium, onBack, onUpdate, onDelete}){
  const customLieux = trip.customLieux || [];
  const lieuById = useMemo(()=>{
    const base = Object.fromEntries((db?.lieux||[]).map(l=>[l.id,l]));
    customLieux.forEach(l=>{ base[l.id]=l; });
    return base;
  }, [db, customLieux]);
  const lieux = [...(db?.lieux || []), ...customLieux];
  const [dayIdx, setDayIdx] = useState(0);
  // sous-vues : "day" | "catalogue" | "detail" | "checklist" | "addcustom"
  const [sub, setSub] = useState("day");
  const [catType, setCatType] = useState("tout");
  const [detailId, setDetailId] = useState(null);
  const [noteEdit, setNoteEdit] = useState(null); // id d'étape en édition de note
  const [confirmDel, setConfirmDel] = useState(false);

  const day = trip.jours[dayIdx];
  const ville = day ? villeById[day.villeId] : null;

  // ── Mutations ──
  const addLieu = (lieuId)=>{
    const jours = trip.jours.map((j,i)=> i!==dayIdx ? j : ({...j, etapes:[...j.etapes, {id:makeStepId(), lieuId, note:""}]}));
    onUpdate({...trip, jours});
  };
  const removeEtape = (etapeId)=>{
    const jours = trip.jours.map((j,i)=> i!==dayIdx ? j : ({...j, etapes:j.etapes.filter(e=>e.id!==etapeId)}));
    onUpdate({...trip, jours});
  };
  const moveEtape = (idx, dir)=>{
    const arr = [...day.etapes]; const ni = idx+dir;
    if(ni<0||ni>=arr.length) return;
    [arr[idx],arr[ni]]=[arr[ni],arr[idx]];
    const jours = trip.jours.map((j,i)=> i!==dayIdx ? j : ({...j, etapes:arr}));
    onUpdate({...trip, jours});
  };
  const setNote = (etapeId, note)=>{
    const jours = trip.jours.map((j,i)=> i!==dayIdx ? j : ({...j, etapes:j.etapes.map(e=>e.id===etapeId?{...e,note}:e)}));
    onUpdate({...trip, jours});
  };
  const toggleCheck = (cid)=> onUpdate({...trip, checklist:(trip.checklist||[]).map(c=>c.id===cid?{...c,fait:!c.fait}:c)});
  const addCheck = (texte)=> onUpdate({...trip, checklist:[...(trip.checklist||[]), {id:"c"+Date.now(), texte, fait:false}]});
  const removeCheck = (cid)=> onUpdate({...trip, checklist:(trip.checklist||[]).filter(c=>c.id!==cid)});

  // ── Lieu personnalisé (Premium) ──
  const addCustomLieu = (data)=>{
    const id = "custom_"+Date.now().toString(36);
    const lieu = {
      id, villeId: day.villeId, nom: data.nom, nom_jp:"", type: data.type, categorie: data.categorie||"Lieu personnalisé",
      emoji: data.emoji||"📍", interets:[], quartier: data.quartier||"", description: data.description||"",
      conseil:"", duree:"", budget: data.budget||"", lat:null, lng:null, horaires:"", acces:"", prix_detail:"",
      site_web:"", a_proximite:[], image:"", custom:true,
    };
    const nextCustom = [...customLieux, lieu];
    // Ajoute directement au jour courant
    const jours = trip.jours.map((j,i)=> i!==dayIdx ? j : ({...j, etapes:[...j.etapes, {id:makeStepId(), lieuId:id, note:""}]}));
    onUpdate({...trip, customLieux: nextCustom, jours});
    setSub("day");
  };

  const idsInDay = new Set((day?.etapes||[]).map(e=>e.lieuId));

  // ── Export / Partage ──
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Construit un texte lisible de tout l'itinéraire
  const buildTripText = ()=>{
    let txt = `🗾 ${trip.titre}\n`;
    const villesNoms = trip.villes.map(id=>villeById[id]?.nom||id).join(" · ");
    txt += `${trip.jours.length} jour${trip.jours.length>1?"s":""} · ${villesNoms}\n`;
    txt += `${"─".repeat(28)}\n\n`;
    trip.jours.forEach(j=>{
      const v = villeById[j.villeId];
      txt += `📅 JOUR ${j.num} — ${v?.nom||""}${j.titre?` · ${j.titre}`:""}\n`;
      if(j.etapes.length===0){ txt += `   (aucun lieu prévu)\n`; }
      j.etapes.forEach((e,i)=>{
        const l = lieuById[e.lieuId];
        txt += `   ${i+1}. ${l?.emoji||"📍"} ${l?.nom||"Lieu"}`;
        if(l?.budget) txt += ` (${l.budget})`;
        txt += `\n`;
        if(e.note) txt += `      📝 ${e.note}\n`;
      });
      txt += `\n`;
    });
    const cl = trip.checklist||[];
    if(cl.length){
      txt += `✅ PRÉPARATIFS\n`;
      cl.forEach(c=> txt += `   ${c.fait?"☑":"☐"} ${c.texte}\n`);
      txt += `\n`;
    }
    txt += `${"─".repeat(28)}\n✨ Créé avec Isekai'd — isekaid.vercel.app`;
    return txt;
  };

  const shareNative = async ()=>{
    const text = buildTripText();
    if(navigator.share){
      try { await navigator.share({ title: trip.titre, text }); setShareOpen(false); return; }
      catch(e){ /* annulé → on garde la modale */ }
    } else {
      copyText();
    }
  };
  const copyText = async ()=>{
    const text = buildTripText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true); setTimeout(()=>setCopied(false), 2000);
    } catch(e){
      // Repli : sélection manuelle
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); setCopied(true); setTimeout(()=>setCopied(false),2000); } catch{}
      document.body.removeChild(ta);
    }
  };
  // Export PDF via fenêtre d'impression (l'utilisateur choisit "Enregistrer en PDF")
  const exportPDF = ()=>{
    const villesNoms = trip.villes.map(id=>villeById[id]?.nom||id).join(" · ");
    const joursHTML = trip.jours.map(j=>{
      const v = villeById[j.villeId];
      const etapesHTML = j.etapes.length
        ? j.etapes.map((e,i)=>{
            const l = lieuById[e.lieuId];
            return `<li><b>${l?.nom||"Lieu"}</b>${l?.categorie?` <span class="cat">· ${l.categorie}</span>`:""}${l?.budget?` <span class="cat">· ${l.budget}</span>`:""}${e.note?`<div class="note">📝 ${e.note}</div>`:""}</li>`;
          }).join("")
        : `<li class="empty">Aucun lieu prévu</li>`;
      return `<div class="day"><h2>Jour ${j.num} — ${v?.nom||""}${j.titre?` · ${j.titre}`:""}</h2><ol>${etapesHTML}</ol></div>`;
    }).join("");
    const cl = trip.checklist||[];
    const clHTML = cl.length ? `<div class="checklist"><h2>✅ Préparatifs</h2><ul>${cl.map(c=>`<li>${c.fait?"☑":"☐"} ${c.texte}</li>`).join("")}</ul></div>` : "";
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${trip.titre}</title>
      <style>
        @page { margin: 1.5cm; }
        body { font-family: -apple-system, 'Segoe UI', sans-serif; color: #1C1410; line-height: 1.5; }
        .header { border-bottom: 3px solid #C9463D; padding-bottom: 12px; margin-bottom: 24px; }
        h1 { font-size: 26px; margin: 0 0 4px; }
        .sub { color: #777; font-size: 14px; }
        .day { margin-bottom: 22px; page-break-inside: avoid; }
        h2 { font-size: 17px; color: #C9463D; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        ol, ul { margin: 8px 0; padding-left: 22px; }
        li { margin-bottom: 7px; font-size: 14px; }
        .cat { color: #999; font-size: 12px; }
        .note { color: #555; font-style: italic; font-size: 12px; margin-top: 2px; }
        .empty { color: #aaa; font-style: italic; list-style: none; }
        .checklist { margin-top: 24px; page-break-inside: avoid; }
        .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #eee; color: #999; font-size: 11px; text-align: center; }
        .kanji { color:#C9463D; font-size: 20px; }
      </style></head><body>
      <div class="header"><h1><span class="kanji">異</span> ${trip.titre}</h1>
      <div class="sub">${trip.jours.length} jour${trip.jours.length>1?"s":""} · ${villesNoms}</div></div>
      ${joursHTML}${clHTML}
      <div class="footer">✨ Créé avec Isekai'd — isekaid.vercel.app</div>
      </body></html>`;
    const w = window.open("", "_blank");
    if(!w){ alert("Autorise les fenêtres pop-up pour exporter en PDF."); return; }
    w.document.write(html); w.document.close();
    setTimeout(()=>{ w.print(); }, 350);
    setShareOpen(false);
  };

  // ─── Sous-vue : fiche détail enrichie ───
  if(sub==="detail" && detailId){
    const l = lieuById[detailId];
    if(!l){ setSub("catalogue"); return null; }
    const proches = (l.a_proximite||[]).map(id=>lieuById[id]).filter(Boolean);
    const inDay = idsInDay.has(l.id);
    return(
      <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
        {/* Bannière image / emoji */}
        <div style={{height:150,background:`linear-gradient(135deg,${C.red}44,${C.s2})`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
          <img src={l.photo || l.image} alt="" loading="lazy" onError={(e)=>{e.target.style.display="none";}} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
          {!l.photo && <span style={{fontSize:58,position:"relative",textShadow:"0 2px 12px rgba(0,0,0,0.4)"}}>{l.emoji}</span>}
          <button onClick={()=>setSub("catalogue")} style={{position:"absolute",top:44,left:16,fontSize:12,color:"#fff",background:"rgba(0,0,0,0.45)",border:"none",padding:"6px 13px",borderRadius:16,cursor:"pointer"}}>‹ Retour</button>
          {l.photo && (l.photo_author||l.photo_licence) && (
            <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"3px 8px",background:"rgba(0,0,0,0.4)",fontSize:8,color:"rgba(255,255,255,0.85)",textAlign:"right"}}>
              {l.photo_author && `${l.photo_author}`}{l.photo_author && l.photo_licence && " · "}{l.photo_licence} · Wikimedia
            </div>
          )}
        </div>
        <div style={{padding:"16px 20px 110px"}}>
          <div style={{textAlign:"center",marginBottom:14}}>
            <div style={{fontSize:19,color:C.text,fontWeight:600}}>{l.nom}</div>
            <div style={{fontSize:13,color:C.gold,fontFamily:"'Noto Serif JP',serif"}}>{l.nom_jp}</div>
            <div style={{fontSize:11,color:C.t3,marginTop:3}}>{l.categorie} · {l.quartier} · {ville?.nom}</div>
          </div>
          <div style={{fontSize:13,color:C.t2,lineHeight:1.65,marginBottom:14}}>{l.description}</div>
          {l.conseil && (
            <div style={{background:"rgba(158,122,26,0.1)",border:"1px solid rgba(158,122,26,0.3)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
              <div style={{fontSize:9,color:C.gold,letterSpacing:".1em",marginBottom:5,textTransform:"uppercase"}}>💡 Conseil de voyageur</div>
              <div style={{fontSize:12,color:C.text,lineHeight:1.55}}>{l.conseil}</div>
            </div>
          )}
          {/* Infos pratiques */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {l.horaires && <InfoBox C={C} icon="🕐" label="Horaires" val={l.horaires}/>}
            {l.prix_detail && <InfoBox C={C} icon="💴" label="Prix" val={l.prix_detail}/>}
            {l.acces && <InfoBox C={C} icon="🚉" label="Accès" val={l.acces}/>}
            {l.duree && <InfoBox C={C} icon="⏱️" label="Durée" val={l.duree}/>}
          </div>
          {l.site_web && <div style={{fontSize:11,color:C.t3,marginBottom:14}}>🔗 {l.site_web}</div>}
          {/* À proximité */}
          {proches.length>0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontSize:9,color:C.t3,letterSpacing:".1em",marginBottom:8,textTransform:"uppercase"}}>📍 À proximité</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                {proches.map(p=>(
                  <button key={p.id} onClick={()=>setDetailId(p.id)} style={{padding:"7px 11px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:16,fontSize:11,color:C.t2,cursor:"pointer"}}>{p.emoji} {p.nom}</button>
                ))}
              </div>
            </div>
          )}
          {/* Ajouter */}
          <button onClick={()=>{ if(!inDay) addLieu(l.id); setSub("day"); }} disabled={inDay}
            style={{width:"100%",padding:"14px",background:inDay?C.s3:C.red,border:"none",borderRadius:13,color:inDay?C.t2:"#fff",fontSize:14,fontWeight:600,cursor:inDay?"default":"pointer"}}>
            {inDay ? "✓ Déjà dans ce jour" : `+ Ajouter au jour ${day.num}`}
          </button>
        </div>
      </div>
    );
  }

  // ─── Sous-vue : catalogue ───
  if(sub==="catalogue"){
    const why = user?.why || [];
    const matchScore = (l)=> (l.interets||[]).filter(it=>why.includes(it)).length;
    const list = lieux
      .filter(l=> l.villeId===day.villeId && (catType==="tout"||l.type===catType))
      .map(l=>({...l, _score: matchScore(l)}))
      .sort((a,b)=> b._score - a._score);
    const hasReco = why.length>0 && list.some(l=>l._score>0);
    return(
      <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
        <div style={{padding:"50px 20px 12px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
          <button onClick={()=>setSub("day")} style={{background:"transparent",border:"none",color:C.t2,fontSize:13,cursor:"pointer",padding:0,marginBottom:8}}>‹ Retour au jour {day.num}</button>
          <div style={{fontSize:18,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:10}}>Explorer · {ville?.emoji} {ville?.nom}</div>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
            <FilterPill C={C} on={catType==="tout"} onClick={()=>setCatType("tout")}>Tout</FilterPill>
            {VOYAGE_TYPES.map(t=>(
              <FilterPill key={t.id} C={C} on={catType===t.id} onClick={()=>setCatType(t.id)}>{t.emoji} {t.label}</FilterPill>
            ))}
          </div>
        </div>
        <div style={{padding:"14px 20px 110px"}} className="stagger">
          {hasReco && <div style={{fontSize:11,color:C.t3,marginBottom:12,lineHeight:1.5}}>✨ Les lieux <b style={{color:C.gold}}>recommandés pour toi</b> apparaissent en premier, selon tes centres d'intérêt.</div>}
          {list.length===0 && <div style={{textAlign:"center",color:C.t3,fontSize:12,padding:"30px 0"}}>Aucun lieu de ce type pour {ville?.nom}.</div>}
          {list.map(l=>{
            const inDay = idsInDay.has(l.id);
            const reco = l._score>0;
            return(
              <div key={l.id} className="lift" onClick={()=>{setDetailId(l.id);setSub("detail");}} style={{display:"flex",alignItems:"center",gap:11,background:C.s1,border:`1px solid ${reco?"rgba(158,122,26,0.35)":C.border}`,borderRadius:13,padding:"12px 14px",marginBottom:9,cursor:"pointer",position:"relative",overflow:"hidden"}}>
                {reco && <div style={{position:"absolute",top:0,left:0,bottom:0,width:3,background:`linear-gradient(${C.gold},${C.gold}44)`}}/>}
                <span style={{fontSize:24,flexShrink:0}}>{l.emoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:13,color:C.text,fontWeight:500}}>{l.nom}</span>
                    {reco && <span style={{fontSize:8,padding:"2px 7px",background:"rgba(158,122,26,0.15)",border:"1px solid rgba(158,122,26,0.3)",borderRadius:10,color:C.gold,whiteSpace:"nowrap",flexShrink:0}}>✨ Pour toi</span>}
                  </div>
                  <div style={{fontSize:10,color:C.t3}}>{l.categorie} · {l.quartier} · {l.budget}</div>
                </div>
                <button onClick={(e)=>{e.stopPropagation(); if(!inDay) addLieu(l.id);}} style={{flexShrink:0,width:30,height:30,borderRadius:"50%",border:"none",background:inDay?"transparent":C.red,color:inDay?C.green:"#fff",fontSize:inDay?16:20,cursor:inDay?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{inDay?"✓":"＋"}</button>
              </div>
            );
          })}
          {/* Ajouter un lieu personnalisé (Premium) */}
          <button onClick={()=>{ if(isPremium){ setSub("addcustom"); } else { onOpenPremium&&onOpenPremium(); } }}
            style={{width:"100%",marginTop:6,padding:"13px",background:"transparent",border:`1px dashed ${isPremium?C.gold:C.border}`,borderRadius:13,color:isPremium?C.gold:C.t3,fontSize:13,fontWeight:500,cursor:"pointer"}}>
            {isPremium ? "📍 Ajouter mon propre lieu" : "📍 Ajouter mon lieu (Premium 🔒)"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Sous-vue : ajout lieu personnalisé ───
  if(sub==="addcustom"){
    return <CustomLieuForm C={C} ville={ville} onCancel={()=>setSub("catalogue")} onSave={addCustomLieu}/>;
  }

  // ─── Sous-vue : check-list ───
  if(sub==="checklist"){
    const cl = trip.checklist||[];
    const done = cl.filter(c=>c.fait).length;
    return(
      <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
        <div style={{padding:"50px 20px 12px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
          <button onClick={()=>setSub("day")} style={{background:"transparent",border:"none",color:C.t2,fontSize:13,cursor:"pointer",padding:0,marginBottom:8}}>‹ Retour</button>
          <div style={{fontSize:20,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text}}>Préparatifs ✅</div>
          <div style={{fontSize:11,color:C.t3,marginTop:3}}>{done} / {cl.length} faits</div>
        </div>
        <div style={{padding:"14px 20px 110px"}}>
          {cl.map(c=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 0",borderBottom:`1px solid ${C.border}`}}>
              <button onClick={()=>toggleCheck(c.id)} style={{width:22,height:22,flexShrink:0,borderRadius:6,border:`1px solid ${c.fait?C.green:C.t3}`,background:c.fait?C.green:"transparent",color:"#fff",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{c.fait?"✓":""}</button>
              <span style={{flex:1,fontSize:13,color:c.fait?C.t3:C.text,textDecoration:c.fait?"line-through":"none"}}>{c.texte}</span>
              <button onClick={()=>removeCheck(c.id)} style={{background:"transparent",border:"none",color:C.t3,fontSize:16,cursor:"pointer"}}>×</button>
            </div>
          ))}
          <ChecklistAdd C={C} onAdd={addCheck}/>
        </div>
      </div>
    );
  }

  // ─── Vue principale : le jour ───
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
      <div style={{padding:"50px 20px 12px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <button onClick={onBack} style={{background:"transparent",border:"none",color:C.t2,fontSize:13,cursor:"pointer",padding:0}}>‹ Mes voyages</button>
          <div style={{display:"flex",gap:7}}>
            <button onClick={()=>setShareOpen(true)} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:16,padding:"5px 12px",color:C.t2,fontSize:11,cursor:"pointer"}}>↗ Partager</button>
            <button onClick={()=>setSub("checklist")} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:16,padding:"5px 12px",color:C.t2,fontSize:11,cursor:"pointer"}}>✅ Préparatifs</button>
          </div>
        </div>
        <div style={{fontSize:20,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:10}}>{trip.titre}</div>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
          {trip.jours.map((j,i)=>(
            <button key={i} onClick={()=>setDayIdx(i)} style={{flexShrink:0,padding:"6px 13px",borderRadius:16,fontSize:12,cursor:"pointer",border:`1px solid ${i===dayIdx?C.red:C.border}`,background:i===dayIdx?C.red:C.s1,color:i===dayIdx?"#fff":C.t2}}>J{j.num}</button>
          ))}
        </div>
      </div>

      <div style={{padding:"16px 20px 110px"}}>
        {day && (
          <>
            <div style={{fontSize:10,color:C.t3,letterSpacing:".1em",marginBottom:14,textTransform:"uppercase"}}>
              Jour {day.num} · {ville?.emoji} {ville?.nom||""}{day.titre?` · ${day.titre}`:""}
            </div>
            {day.etapes.length>0 && (
              <DayMap C={C} points={day.etapes.map(e=>lieuById[e.lieuId]).filter(Boolean)}/>
            )}
            {day.etapes.length===0 ? (
              <div style={{textAlign:"center",padding:"24px 10px"}}>
                <div style={{fontSize:34,marginBottom:10}}>📍</div>
                <div style={{fontSize:13,color:C.t2,marginBottom:16}}>Aucun lieu pour ce jour.</div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:14}}>
                {day.etapes.map((e,i)=>{
                  const l = lieuById[e.lieuId];
                  return(
                    <div key={e.id} style={{display:"flex",gap:9,alignItems:"flex-start"}}>
                      {/* Flèches réordonner */}
                      <div style={{display:"flex",flexDirection:"column",gap:2,marginTop:6}}>
                        <button onClick={()=>moveEtape(i,-1)} disabled={i===0} style={{width:22,height:20,border:`1px solid ${C.border}`,borderRadius:6,background:C.s1,color:i===0?C.t3:C.t2,fontSize:10,cursor:i===0?"default":"pointer"}}>▲</button>
                        <button onClick={()=>moveEtape(i,1)} disabled={i===day.etapes.length-1} style={{width:22,height:20,border:`1px solid ${C.border}`,borderRadius:6,background:C.s1,color:i===day.etapes.length-1?C.t3:C.t2,fontSize:10,cursor:i===day.etapes.length-1?"default":"pointer"}}>▼</button>
                      </div>
                      <div className="lift" onClick={()=>{if(l){setDetailId(l.id);setSub("detail");}}} style={{flex:1,background:C.s1,border:`1px solid ${C.border}`,borderRadius:13,padding:"12px 14px",cursor:l?"pointer":"default"}}>
                        <div style={{display:"flex",alignItems:"center",gap:9}}>
                          <span style={{flexShrink:0,width:22,height:22,borderRadius:"50%",background:C.s2,color:C.t2,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>{i+1}</span>
                          <span style={{fontSize:20}}>{l?.emoji||"📍"}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,color:C.text,fontWeight:500}}>{l?.nom||e.nom||"Lieu"}</div>
                            {l && <div style={{fontSize:10,color:C.t3}}>{l.categorie} · {l.budget}</div>}
                          </div>
                          <button onClick={(ev)=>{ev.stopPropagation(); removeEtape(e.id);}} style={{background:"transparent",border:"none",color:C.t3,fontSize:18,cursor:"pointer",flexShrink:0}}>×</button>
                        </div>
                        {/* Note */}
                        {noteEdit===e.id ? (
                          <input autoFocus defaultValue={e.note} onClick={ev=>ev.stopPropagation()} onBlur={ev=>{setNote(e.id,ev.target.value);setNoteEdit(null);}} onKeyDown={ev=>{if(ev.key==="Enter"){setNote(e.id,ev.target.value);setNoteEdit(null);}}} placeholder="Ta note..." style={{width:"100%",boxSizing:"border-box",marginTop:8,padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:11,fontFamily:"inherit"}}/>
                        ) : (
                          <div onClick={(ev)=>{ev.stopPropagation();setNoteEdit(e.id);}} style={{marginTop:7,fontSize:11,color:e.note?C.t2:C.t3,fontStyle:e.note?"italic":"normal",cursor:"text"}}>
                            {e.note ? `📝 ${e.note}` : "📝 Ajouter une note"}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Ajouter un lieu */}
            <button onClick={()=>{setCatType("tout");setSub("catalogue");}} style={{width:"100%",padding:"13px",background:"transparent",border:`1px dashed ${C.border}`,borderRadius:13,color:C.red,fontSize:13,fontWeight:500,cursor:"pointer"}}>+ Ajouter un lieu à ce jour</button>

            {/* Supprimer le voyage */}
            <div style={{marginTop:30,textAlign:"center"}}>
              {!confirmDel ? (
                <button onClick={()=>setConfirmDel(true)} style={{background:"transparent",border:"none",color:C.t3,fontSize:12,cursor:"pointer"}}>Supprimer ce voyage</button>
              ) : (
                <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                  <button onClick={()=>onDelete(trip.id)} style={{padding:"8px 16px",background:C.red,border:"none",borderRadius:9,color:"#fff",fontSize:12,cursor:"pointer"}}>Confirmer la suppression</button>
                  <button onClick={()=>setConfirmDel(false)} style={{padding:"8px 16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:9,color:C.t2,fontSize:12,cursor:"pointer"}}>Annuler</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modale de partage */}
      {shareOpen && (
        <div onClick={()=>setShareOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:440,background:C.s1,borderRadius:"22px 22px 0 0",padding:"22px 22px 32px",animation:"fadeUp .3s ease"}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.s3,margin:"0 auto 18px"}}/>
            <div style={{fontSize:17,color:C.text,fontWeight:600,marginBottom:4,textAlign:"center"}}>Partager mon voyage</div>
            <div style={{fontSize:12,color:C.t2,marginBottom:20,textAlign:"center"}}>{trip.titre} · {trip.jours.length} jour{trip.jours.length>1?"s":""}</div>

            <button onClick={shareNative} style={{width:"100%",padding:"14px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              ↗ Partager l'itinéraire
            </button>

            <button onClick={copyText} style={{width:"100%",padding:"14px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:12,color:C.text,fontSize:14,fontWeight:500,cursor:"pointer",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {copied ? "✓ Copié !" : "📋 Copier le texte"}
            </button>

            <button onClick={exportPDF} style={{width:"100%",padding:"14px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:12,color:C.text,fontSize:14,fontWeight:500,cursor:"pointer",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              📄 Exporter en PDF
            </button>

            <button onClick={()=>setShareOpen(false)} style={{width:"100%",padding:"12px",background:"transparent",border:"none",color:C.t3,fontSize:13,cursor:"pointer"}}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBox({C, icon, label, val}){
  return(
    <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 11px"}}>
      <div style={{fontSize:8,color:C.t3,letterSpacing:".05em",marginBottom:3}}>{icon} {label.toUpperCase()}</div>
      <div style={{fontSize:11,color:C.text,lineHeight:1.35}}>{val}</div>
    </div>
  );
}
function FilterPill({C, on, onClick, children}){
  return <button onClick={onClick} style={{flexShrink:0,padding:"6px 12px",borderRadius:16,fontSize:11,cursor:"pointer",border:`1px solid ${on?C.red:C.border}`,background:on?C.red:C.s1,color:on?"#fff":C.t2}}>{children}</button>;
}
function ChecklistAdd({C, onAdd}){
  const [val,setVal] = useState("");
  return(
    <div style={{display:"flex",gap:8,marginTop:16}}>
      <input value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&val.trim()){onAdd(val.trim());setVal("");}}} placeholder="Ajouter un élément..." style={{flex:1,padding:"11px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:12,fontFamily:"inherit"}}/>
      <button onClick={()=>{if(val.trim()){onAdd(val.trim());setVal("");}}} style={{padding:"0 16px",background:C.red,border:"none",borderRadius:10,color:"#fff",fontSize:18,cursor:"pointer"}}>+</button>
    </div>
  );
}

// ─── Formulaire d'ajout de lieu personnalisé (Premium) ────────────────────────
function CustomLieuForm({C, ville, onCancel, onSave}){
  const [nom, setNom] = useState("");
  const [type, setType] = useState("voir");
  const [emoji, setEmoji] = useState("📍");
  const [quartier, setQuartier] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const EMOJIS = ["📍","⛩️","🏯","🍜","🍣","🍵","🏨","🛍️","🌸","🎌","🗼","🎎","🍡","🏮","⛰️","🎭"];
  const BUDGETS = ["Gratuit","¥","¥¥","¥¥¥"];
  const canSave = nom.trim().length>0;

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
      <div style={{padding:"50px 20px 14px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
        <button onClick={onCancel} style={{background:"transparent",border:"none",color:C.t2,fontSize:13,cursor:"pointer",padding:0,marginBottom:8}}>‹ Annuler</button>
        <div style={{fontSize:20,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text}}>Mon lieu · {ville?.nom}</div>
      </div>
      <div style={{padding:"18px 20px 120px"}}>
        {/* Nom */}
        <div style={{fontSize:10,color:C.t3,letterSpacing:".15em",marginBottom:7,textTransform:"uppercase"}}>Nom du lieu *</div>
        <input value={nom} onChange={e=>setNom(e.target.value)} placeholder="Ex. Café de mon ami, Hôtel réservé…" style={{width:"100%",boxSizing:"border-box",padding:"13px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:11,color:C.text,fontSize:14,marginBottom:20,fontFamily:"inherit"}}/>

        {/* Type */}
        <div style={{fontSize:10,color:C.t3,letterSpacing:".15em",marginBottom:7,textTransform:"uppercase"}}>Type</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:20}}>
          {VOYAGE_TYPES.map(t=>(
            <button key={t.id} onClick={()=>setType(t.id)} style={{padding:"8px 13px",borderRadius:18,fontSize:12,cursor:"pointer",border:`1px solid ${type===t.id?C.red:C.border}`,background:type===t.id?"rgba(201,70,61,0.12)":C.s1,color:type===t.id?C.text:C.t2}}>{t.emoji} {t.label}</button>
          ))}
        </div>

        {/* Emoji */}
        <div style={{fontSize:10,color:C.t3,letterSpacing:".15em",marginBottom:7,textTransform:"uppercase"}}>Icône</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
          {EMOJIS.map(e=>(
            <button key={e} onClick={()=>setEmoji(e)} style={{width:42,height:42,borderRadius:10,fontSize:20,cursor:"pointer",border:`1px solid ${emoji===e?C.red:C.border}`,background:emoji===e?"rgba(201,70,61,0.12)":C.s1}}>{e}</button>
          ))}
        </div>

        {/* Quartier */}
        <div style={{fontSize:10,color:C.t3,letterSpacing:".15em",marginBottom:7,textTransform:"uppercase"}}>Quartier (optionnel)</div>
        <input value={quartier} onChange={e=>setQuartier(e.target.value)} placeholder="Ex. Shibuya" style={{width:"100%",boxSizing:"border-box",padding:"13px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:11,color:C.text,fontSize:14,marginBottom:20,fontFamily:"inherit"}}/>

        {/* Budget */}
        <div style={{fontSize:10,color:C.t3,letterSpacing:".15em",marginBottom:7,textTransform:"uppercase"}}>Budget (optionnel)</div>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          {BUDGETS.map(b=>(
            <button key={b} onClick={()=>setBudget(budget===b?"":b)} style={{flex:1,padding:"10px",borderRadius:9,fontSize:12,cursor:"pointer",border:`1px solid ${budget===b?C.red:C.border}`,background:budget===b?"rgba(201,70,61,0.12)":C.s1,color:budget===b?C.text:C.t2}}>{b}</button>
          ))}
        </div>

        {/* Description */}
        <div style={{fontSize:10,color:C.t3,letterSpacing:".15em",marginBottom:7,textTransform:"uppercase"}}>Note (optionnel)</div>
        <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Pourquoi ce lieu, horaires, infos…" rows={3} style={{width:"100%",boxSizing:"border-box",padding:"13px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:11,color:C.text,fontSize:14,marginBottom:24,fontFamily:"inherit",resize:"vertical"}}/>

        <button onClick={()=>{ if(canSave) onSave({nom:nom.trim(),type,emoji,quartier:quartier.trim(),budget,description:description.trim()}); }} disabled={!canSave}
          style={{width:"100%",padding:"15px",background:canSave?C.red:C.s3,border:"none",borderRadius:13,color:canSave?"#fff":C.t3,fontSize:14,fontWeight:600,cursor:canSave?"pointer":"default"}}>
          Ajouter à ce jour →
        </button>
      </div>
    </div>
  );
}

// ─── Page Premium ─────────────────────────────────────────────────────────────
const PREMIUM_PLANS = [
  { id:"annual",  label:"Annuel",  price:"29,99 €", per:"/ an",  sub:"soit 2,50 €/mois", badge:"Le plus avantageux · -37%", highlight:true },
  { id:"monthly", label:"Mensuel", price:"3,99 €",  per:"/ mois", sub:"sans engagement", badge:null, highlight:false },
];
const PREMIUM_PERKS = [
  { emoji:"🚫", title:"Sans publicité", desc:"Profite de l'app sans aucune interruption." },
  { emoji:"🗺️", title:"Voyages illimités", desc:"Planifie autant de voyages que tu veux, plus de limite." },
  { emoji:"🔓", title:"Tout le contenu débloqué", desc:"Accède immédiatement à toutes les sections, sans attendre les paliers de streak." },
  { emoji:"📍", title:"Lieux personnalisés", desc:"Ajoute tes propres adresses à tes itinéraires." },
];

function PremiumPage({C, isPremium, premium, onActivate, onCancel, onClose, onRedeemCode, billingError, billingBusy, liveOfferings, onRestore}){
  const [sel, setSel] = useState("annual");
  const acc = SEASON_ACCENT[currentSeasonKey()];
  const [codeOpen,setCodeOpen] = useState(false);
  const [codeVal,setCodeVal] = useState("");
  const [codeError,setCodeError] = useState(false);
  // Utilise les prix live RevenueCat si dispos, sinon les prix par défaut codés en dur
  const prices = {
    monthly: liveOfferings?.monthly?.priceLabel || "3,99 €",
    annual:  liveOfferings?.annual?.priceLabel  || "29,99 €",
  };
  useEffect(()=>{ /* getProductDetails() remplacé par liveOfferings de RevenueCat */ },[]);
  const tryCode = ()=>{
    if(onRedeemCode && onRedeemCode(codeVal)){ setCodeError(false); }
    else { setCodeError(true); }
  };

  if(isPremium){
    return(
      <div style={{position:"fixed",inset:0,zIndex:400,background:C.bg,overflowY:"auto",fontFamily:"'Noto Sans JP',sans-serif"}}>
        <div style={{padding:"50px 22px 40px",textAlign:"center"}}>
          <button onClick={onClose} style={{position:"absolute",top:48,left:18,background:C.s1,border:`1px solid ${C.border}`,borderRadius:"50%",width:34,height:34,color:C.t2,fontSize:18,cursor:"pointer"}}>×</button>
          <div style={{fontSize:60,margin:"20px 0 16px"}}>🌸</div>
          <div style={{fontSize:13,color:C.gold,letterSpacing:".2em",textTransform:"uppercase",marginBottom:8}}>Membre Premium</div>
          <div style={{fontSize:24,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:12}}>Merci de ton soutien 🙏</div>
          <div style={{fontSize:14,color:C.t2,lineHeight:1.6,maxWidth:320,margin:"0 auto 30px"}}>
            Tu profites de tous les avantages Isekai'd Premium. {premium?.plan==="code" ? <>Accès débloqué via <b style={{color:C.text}}>code d'invitation</b> 🎟️</> : <>Ton abonnement <b style={{color:C.text}}>{premium?.plan==="annual"?"annuel":"mensuel"}</b> est actif.</>}
          </div>
          <div style={{maxWidth:360,margin:"0 auto"}}>
            {PREMIUM_PERKS.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,marginBottom:10,textAlign:"left"}}>
                <span style={{fontSize:26}}>{p.emoji}</span>
                <div><div style={{fontSize:14,color:C.text,fontWeight:500}}>{p.title}</div><div style={{fontSize:11,color:C.t2}}>{p.desc}</div></div>
                <span style={{marginLeft:"auto",color:C.green,fontSize:18}}>✓</span>
              </div>
            ))}
          </div>
          <button onClick={onCancel} style={{marginTop:24,background:"transparent",border:"none",color:C.t3,fontSize:12,cursor:"pointer",textDecoration:"underline"}}>Gérer / annuler l'abonnement</button>
        </div>
      </div>
    );
  }

  return(
    <div style={{position:"fixed",inset:0,zIndex:400,background:C.bg,overflowY:"auto",fontFamily:"'Noto Sans JP',sans-serif"}}>
      {/* Hero */}
      <div style={{padding:"54px 22px 28px",background:`linear-gradient(160deg,rgba(201,70,61,0.18),${acc.soft} 60%,transparent)`,position:"relative",textAlign:"center"}}>
        <button onClick={onClose} style={{position:"absolute",top:48,left:18,background:"rgba(0,0,0,0.25)",border:"none",borderRadius:"50%",width:34,height:34,color:"#fff",fontSize:18,cursor:"pointer"}}>×</button>
        <div style={{fontSize:54,marginBottom:10}}>異</div>
        <div style={{fontSize:11,color:C.gold,letterSpacing:".25em",textTransform:"uppercase",marginBottom:8}}>Isekai'd Premium</div>
        <div style={{fontSize:25,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:10,lineHeight:1.3}}>Vis le Japon<br/>sans limite</div>
        <div style={{fontSize:13,color:C.t2,lineHeight:1.6,maxWidth:300,margin:"0 auto"}}>Débloque tout le potentiel d'Isekai'd et soutiens le développement de l'app.</div>
      </div>

      <div style={{padding:"6px 22px 40px"}}>
        {/* Avantages */}
        <div style={{margin:"18px 0 26px"}}>
          {PREMIUM_PERKS.map((p,i)=>(
            <div key={i} className="lift" style={{display:"flex",alignItems:"center",gap:14,padding:"15px 16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,marginBottom:10}}>
              <div style={{width:46,height:46,borderRadius:12,background:acc.soft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{p.emoji}</div>
              <div><div style={{fontSize:15,color:C.text,fontWeight:600,marginBottom:2}}>{p.title}</div><div style={{fontSize:12,color:C.t2,lineHeight:1.45}}>{p.desc}</div></div>
            </div>
          ))}
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
        <button onClick={()=>!billingBusy && onActivate(sel)} disabled={billingBusy} className="pop-press" style={{width:"100%",padding:"16px",background:C.red,border:"none",borderRadius:14,color:"#fff",fontSize:15,fontWeight:700,cursor:billingBusy?"wait":"pointer",marginBottom:10,boxShadow:"0 4px 16px rgba(201,70,61,0.3)",opacity:billingBusy?0.7:1}}>
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
              <input value={codeVal} onChange={e=>{setCodeVal(e.target.value);setCodeError(false);}} onKeyDown={e=>{if(e.key==="Enter")tryCode();}} autoFocus placeholder="CODE-INVITATION" style={{flex:1,boxSizing:"border-box",padding:"11px 13px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,color:C.text,fontSize:14,fontFamily:"inherit",textTransform:"uppercase"}}/>
              <button onClick={tryCode} style={{padding:"0 18px",background:C.red,border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>OK</button>
            </div>
            {codeError && <div style={{fontSize:11,color:C.red,marginTop:8,textAlign:"center"}}>Code invalide. Vérifie et réessaie.</div>}
          </div>
        )}

        <button onClick={onClose} style={{width:"100%",padding:"12px",background:"transparent",border:"none",color:C.t3,fontSize:13,cursor:"pointer"}}>Peut-être plus tard</button>
      </div>
    </div>
  );
}

function ProfileScreen({C,user,dark,setDark,db,onReset,onDeleteAccount,onLogout,session,streak,favs,toggleFav,xp,rank,kanaProgress,unlocks,scenProgress,onShowTour,pathProgress,isPremium,onOpenPremium,accent,chooseAccent}){
  const lvlL={beginner:"Débutant",intermediate:"Intermédiaire",advanced:"Avancé"};
  const [showBadges,setShowBadges] = useState(false);
  const [reminders,setRemindersState] = useState(()=>{ try { return localStorage.getItem("isekaid_reminders_v1")!=="off"; } catch { return true; } });
  const setReminders = (fn)=>{
    setRemindersState(prev=>{
      const next = typeof fn==="function" ? fn(prev) : fn;
      try { localStorage.setItem("isekaid_reminders_v1", next?"on":"off"); } catch {}
      return next;
    });
  };
  const goalL={travel:"Voyager",live:"Vivre au Japon",learn:"Apprendre",imm:"Immersion"};
  const total = db ? Object.values(db).reduce((a,b)=>a+b.length,0) : 0;
  // next title progress
  const tier = rank || {min:0,title:"Curieux du Japon",emoji:"🌱"};
  const nextTier = TITLES.find(t=>t.min>(xp||0));
  const prevMin = tier.min;
  const nextMin = nextTier ? nextTier.min : tier.min;
  const progress = nextTier ? Math.min(((xp||0)-prevMin)/(nextMin-prevMin),1) : 1;
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 110px"}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:16}}>人 · PROFIL</div>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14,padding:"16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:14}}>
          <div style={{width:50,height:50,borderRadius:"50%",background:"rgba(201,70,61,0.1)",border:"2px solid rgba(201,70,61,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:user.emojiAvatar?24:20,fontFamily:"'Noto Serif JP',serif",color:C.red,flexShrink:0,overflow:"hidden"}}>
            {user.photo
              ? <img src={user.photo} alt="" referrerPolicy="no-referrer" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={(e)=>{e.target.style.display="none"; e.target.parentNode.textContent=user.emojiAvatar||(user.name||"V")[0].toUpperCase();}}/>
              : user.emojiAvatar
              ? user.emojiAvatar
              : (user.name||"V")[0].toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,color:C.text,marginBottom:4}}>{user.name}</div>
            {user.email && <div style={{fontSize:11,color:C.t3,marginBottom:2}}>{user.email}</div>}
            <div style={{fontSize:12,color:C.text,fontWeight:500}}>{tier.emoji} {tier.title} <span style={{fontSize:11,color:C.t3,fontFamily:"'Noto Serif JP',serif"}}>{tier.jp}</span></div>
          </div>
        </div>

        {/* Bannière Premium */}
        <div onClick={onOpenPremium} className="lift" style={{marginBottom:14,padding:"16px 18px",borderRadius:16,cursor:"pointer",background:isPremium?`linear-gradient(135deg,rgba(158,122,26,0.18),rgba(201,70,61,0.08))`:`linear-gradient(135deg,rgba(201,70,61,0.16),rgba(158,122,26,0.06))`,border:`1px solid ${isPremium?"rgba(158,122,26,0.4)":"rgba(201,70,61,0.3)"}`,display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontSize:30}}>{isPremium?"🌸":"✨"}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:15,color:C.text,fontWeight:700,marginBottom:2}}>{isPremium?"Membre Premium":"Passe à Premium"}</div>
            <div style={{fontSize:11,color:C.t2,lineHeight:1.4}}>{isPremium?"Merci de ton soutien 🙏 Gérer mon abonnement":"Sans pub · voyages illimités · tout débloqué"}</div>
          </div>
          <span style={{fontSize:18,color:C.t3}}>›</span>
        </div>

        {/* Mode sombre — juste sous Premium */}
        <div style={{marginBottom:14,padding:"16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:13,color:C.text,marginBottom:2}}>{dark?"Mode sombre 🌙":"Mode clair ☀️"}</div>
            <div style={{fontSize:11,color:C.t3}}>Basculer le thème de l'app</div>
          </div>
          <div onClick={()=>setDark(d=>!d)} style={{width:48,height:26,borderRadius:13,background:dark?C.red:"rgba(26,20,16,0.14)",cursor:"pointer",position:"relative",transition:"background .25s",flexShrink:0}}>
            <div style={{position:"absolute",top:3,left:dark?22:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .25s",boxShadow:"0 1px 4px rgba(0,0,0,.22)"}}/>
          </div>
        </div>

        {/* Kana mastery */}
        {(()=>{
          const hira = HIRAGANA || []; const kata = KATAKANA || [];
          const kp = kanaProgress || {};
          const masteredIn = (deck)=> deck.filter(c => (kp[c.k]?.known||0) >= 2).length;
          const hiraDone = masteredIn(hira), kataDone = masteredIn(kata);
          const hiraPct = hira.length ? hiraDone/hira.length : 0;
          const kataPct = kata.length ? kataDone/kata.length : 0;
          const Bar = ({label, jp, done, total, pct, color})=>(
            <div style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:5}}>
                <span style={{fontSize:12,color:C.text}}>{label} <span style={{fontSize:11,color:C.t3,fontFamily:"'Noto Serif JP',serif"}}>{jp}</span></span>
                <span style={{fontSize:11,color:C.t2}}>{done}/{total}</span>
              </div>
              <div style={{height:6,background:C.s3,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct*100}%`,background:color,borderRadius:3,transition:"width .5s"}}/>
              </div>
            </div>
          );
          return(
            <div style={{marginBottom:14,padding:"16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:14}}>
              <div style={{fontSize:10,color:C.t3,letterSpacing:".18em",marginBottom:12,textTransform:"uppercase"}}>🔤 Maîtrise des syllabaires</div>
              <Bar label="Hiragana" jp="ひらがな" done={hiraDone} total={hira.length} pct={hiraPct} color={C.red}/>
              <Bar label="Katakana" jp="カタカナ" done={kataDone} total={kata.length} pct={kataPct} color={C.gold}/>
              {(hiraDone+kataDone)===0 && <div style={{fontSize:11,color:C.t3,marginTop:6}}>Entraîne-toi dans l'onglet Apprendre pour remplir ces barres 🎴</div>}
            </div>
          );
        })()}
        {/* Rappels quotidiens */}
        <div style={{marginBottom:16,padding:"16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{flex:1,paddingRight:12}}>
            <div style={{fontSize:13,color:C.text,marginBottom:2}}>🔔 Rappels quotidiens</div>
            <div style={{fontSize:11,color:C.t3,lineHeight:1.4}}>Reçois un rappel pour protéger ton streak et faire ton défi du jour.</div>
          </div>
          <div onClick={()=>setReminders(r=>!r)} style={{width:48,height:26,borderRadius:13,background:reminders?C.red:"rgba(26,20,16,0.14)",cursor:"pointer",position:"relative",transition:"background .25s",flexShrink:0}}>
            <div style={{position:"absolute",top:3,left:reminders?22:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .25s",boxShadow:"0 1px 4px rgba(0,0,0,.22)"}}/>
          </div>
        </div>

        {/* Ma collection (favoris) */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:11}}>
          <div style={{fontSize:10,color:C.t3,letterSpacing:".22em",textTransform:"uppercase"}}>Ma collection ♥</div>
          <span style={{fontSize:11,color:C.t3}}>{favs?.length||0} sauvegardé{(favs?.length||0)>1?"s":""}</span>
        </div>
        {(!favs || favs.length===0) ? (
          <div style={{padding:"22px 16px",textAlign:"center",background:C.s2,border:`1px dashed ${C.border}`,borderRadius:12,marginBottom:22}}>
            <div style={{fontSize:22,marginBottom:8}}>♡</div>
            <div style={{fontSize:12,color:C.t3,lineHeight:1.6}}>Touche le cœur sur une carte<br/>pour la sauvegarder ici</div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:22}}>
            {favs.map((f,i)=>{
              const it=f.item;
              const meta={
                expr:{emoji:it.emoji||"🗣️", title:it.expression, sub:it.traduction, c:C.gold},
                cult:{emoji:it.emoji||"🏮", title:it.titre, sub:it.tag, c:C.red},
                repas:{emoji:it.emoji||"🍱", title:it.nom_jp, sub:it.traduction, c:C.green},
                tradition:{emoji:it.emoji||"⛩️", title:it.nom, sub:it.mois, c:C.red},
                code:{emoji:it.emoji||"🎌", title:it.titre, sub:it.categorie, c:C.red},
                region:{emoji:it.emoji||"🗾", title:it.nom, sub:it.position, c:C.green},
                vie:{emoji:it.emoji||"🏙️", title:it.titre, sub:it.categorie, c:"#5B7E9B"},
              }[f.type]||{emoji:"♥",title:"",sub:"",c:C.red};
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12}}>
                  <span style={{fontSize:22,flexShrink:0}}>{meta.emoji}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,color:C.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{meta.title}</div>
                    <div style={{fontSize:11,color:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{meta.sub}</div>
                  </div>
                  <span style={{fontSize:8,padding:"2px 7px",borderRadius:20,background:`${meta.c}1a`,color:meta.c,letterSpacing:".08em",textTransform:"uppercase",flexShrink:0}}>{f.type}</span>
                  <button onClick={()=>toggleFav(f.type,it)} aria-label="Retirer" style={{background:"transparent",border:"none",cursor:"pointer",color:C.red,fontSize:15,flexShrink:0,padding:4}}>♥</button>
                </div>
              );
            })}
          </div>
        )}

        {(()=>{
          const achievements = computeAchievements({ streak, xp, unlocks, scenProgress, kanaProgress, favs, pathProgress });
          const earned = achievements.filter(a=>a.unlocked).length;
          return(
            <>
              <div onClick={()=>setShowBadges(v=>!v)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:11,cursor:"pointer",userSelect:"none"}}>
                <span style={{fontSize:10,color:C.t3,letterSpacing:".22em",textTransform:"uppercase"}}>Collection de badges</span>
                <span style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:C.t2,fontWeight:600}}>{earned}/{achievements.length}</span>
                  <span style={{fontSize:12,color:C.t3,transform:showBadges?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
                </span>
              </div>
              {showBadges && (
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,animation:"fadeUp .25s ease"}}>
                  {achievements.map((b,i)=>(
                    <div key={i} title={b.desc} style={{background:C.s1,border:`1px solid ${b.unlocked?"rgba(201,70,61,.32)":C.border}`,borderRadius:12,padding:"13px 8px",textAlign:"center",opacity:b.unlocked?1:.45,transition:"all .3s"}}>
                      <div style={{fontSize:24,marginBottom:5,filter:b.unlocked?"none":"grayscale(1)"}}>{b.emoji}</div>
                      <div style={{fontSize:10,color:b.unlocked?C.text:C.t3,lineHeight:1.25,marginBottom:3}}>{b.label}</div>
                      <div style={{fontSize:8,color:C.t3,lineHeight:1.3}}>{b.unlocked?"✓":b.desc}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          );
        })()}

        {/* Revoir la présentation */}
        <button onClick={()=>onShowTour&&onShowTour()}
          style={{marginTop:22,width:"100%",padding:"13px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:13,cursor:"pointer",letterSpacing:".03em"}}>
          ✨ Revoir la présentation
        </button>

        {/* Se déconnecter — seulement si connecté */}
        {session?.user && (
          <button onClick={async ()=>{ if(confirm("Te déconnecter ? Tes données restent sauvegardées dans le cloud.")) await onLogout&&onLogout(); }}
            style={{marginTop:10,width:"100%",padding:"13px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:13,cursor:"pointer",letterSpacing:".03em"}}>
            ⎋ Se déconnecter
          </button>
        )}

        {/* Réinitialiser le profil */}
        <button onClick={()=>{ if(confirm("Réinitialiser ton profil ? Tu repasseras par l'onboarding.")) onReset&&onReset(); }}
          style={{marginTop:10,width:"100%",padding:"13px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:13,cursor:"pointer",letterSpacing:".03em"}}>
          ↺ Réinitialiser le profil
        </button>

        {/* Supprimer le compte */}
        <button onClick={()=>onDeleteAccount&&onDeleteAccount()}
          style={{marginTop:10,width:"100%",padding:"13px",background:"transparent",border:`1px solid rgba(201,70,61,0.3)`,borderRadius:12,color:C.red,fontSize:13,cursor:"pointer",letterSpacing:".03em"}}>
          🗑️ Supprimer mon compte
        </button>
        <div style={{marginTop:10,textAlign:"center",fontSize:10,color:C.t3,lineHeight:1.5}}>
          Ton profil est sauvegardé sur cet appareil —<br/>l'onboarding ne réapparaîtra qu'après réinitialisation.
        </div>
      </div>
    </div>
  );
}
const TABS=[{id:"home",kanji:"家",label:"Home"},{id:"explore",kanji:"探",label:"Explorer"},{id:"scenarios",kanji:"場",label:"Scénarios"},{id:"learn",kanji:"学",label:"Apprendre"},{id:"voyage",kanji:"旅",label:"Voyage"}];
// ─── Achievement unlocked popup ───────────────────────────────────────────────
function AchievementPopup({C, achievement, onClose}){
  if(!achievement) return null;
  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:310,backdropFilter:"blur(3px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(82vw,320px)",zIndex:311,background:C.s1,borderRadius:22,padding:"30px 26px 24px",textAlign:"center",animation:"popIn .4s cubic-bezier(.2,.9,.3,1.3)",boxShadow:"0 24px 80px rgba(0,0,0,0.4)",border:`1px solid rgba(201,70,61,0.3)`}}>
        <div style={{fontSize:11,color:C.gold,letterSpacing:".25em",textTransform:"uppercase",marginBottom:14}}>Badge débloqué</div>
        <div style={{fontSize:66,marginBottom:14,animation:"popIn .6s ease .15s both"}}>{achievement.emoji}</div>
        <div style={{fontSize:20,fontFamily:"'Noto Serif JP',serif",color:C.text,marginBottom:6}}>{achievement.label}</div>
        <div style={{fontSize:13,color:C.t2,lineHeight:1.5,marginBottom:22}}>{achievement.desc}</div>
        <button onClick={onClose} style={{width:"100%",padding:"13px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Super ! 🎉</button>
      </div>
    </>
  );
}

// ─── Daily welcome popup (streak + clé) ───────────────────────────────────────
function DailyWelcome({C, streak, dailyInfo, onClose, isPremium}){
  const count = streak?.count || 0;
  const freezes = streak?.freezes || 0;
  const milestone = dailyInfo?.milestone || null;
  const frozenUsed = dailyInfo?.frozenUsed || false;
  // Prochain contenu à débloquer via le streak
  const nextUnlock = UNLOCK_SCHEDULE.find(u=>u.day>count);
  const justUnlocked = UNLOCK_SCHEDULE.find(u=>u.day===count);
  const daysToNext = nextUnlock ? nextUnlock.day - count : null;

  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:300,backdropFilter:"blur(3px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(86vw,340px)",zIndex:301}}>
      <div style={{
        background:C.s1,
        borderRadius:22, padding:"32px 26px 26px", textAlign:"center",
        animation:"bubbleIn .5s cubic-bezier(.34,1.56,.64,1) both",
        boxShadow:"0 24px 80px rgba(0,0,0,0.4)", border:`1px solid ${milestone?"rgba(201,70,61,0.5)":C.border}`, position:"relative"
      }}>
        {milestone && (
          <div style={{position:"absolute",inset:0,overflow:"hidden",borderRadius:22,pointerEvents:"none"}}>
            {Array.from({length:14}).map((_,i)=>(
              <div key={i} style={{position:"absolute",top:"-10%",left:`${(i*7+5)%100}%`,fontSize:`${12+(i%3)*5}px`,animation:`fall ${1.5+(i%4)*0.4}s ease-in ${(i%5)*0.15}s both`}}>{["🎊","✨","🎉","🎌","⭐"][i%5]}</div>
            ))}
          </div>
        )}

        <div style={{fontSize:60,marginBottom:6,display:"inline-block",animation:milestone?"heartbeat 1.2s ease infinite":"flameFlicker 1.6s ease infinite",filter:milestone?"drop-shadow(0 0 14px rgba(201,70,61,0.6))":"drop-shadow(0 0 10px rgba(232,98,58,0.45))"}}>{milestone?milestone.emoji:"🔥"}</div>

        {milestone ? (
          <>
            <div style={{fontSize:10,color:C.gold,letterSpacing:".25em",textTransform:"uppercase",marginBottom:6}}>🎉 Palier atteint !</div>
            <div style={{fontSize:30,fontFamily:"'Noto Serif JP',serif",fontWeight:400,color:C.text,marginBottom:2}}>{milestone.label}</div>
            <div style={{fontSize:13,color:C.t2,marginBottom:20}}>{count} jours consécutifs 🎌</div>
          </>
        ) : (
          <>
            <div style={{fontSize:10,color:C.t3,letterSpacing:".25em",textTransform:"uppercase",marginBottom:6}}>Content de te revoir</div>
            <div style={{fontSize:30,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:2,display:"inline-block",animation:"countUp .5s cubic-bezier(.34,1.56,.64,1) .15s both"}}>
              {count} jour{count>1?"s":""}
            </div>
            <div style={{fontSize:13,color:C.t2,marginBottom:20}}>de streak consécutif{count>1?"s":""} 🎌</div>
          </>
        )}

        {frozenUsed && (
          <div style={{padding:"10px 14px",background:"rgba(90,184,232,0.1)",border:"1px solid rgba(90,184,232,0.3)",borderRadius:12,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22}}>🧊</span>
            <div style={{textAlign:"left"}}><div style={{fontSize:12,color:C.text,fontWeight:600}}>Un gel a sauvé ton streak !</div><div style={{fontSize:10,color:C.t2}}>Il te reste {freezes} gel{freezes>1?"s":""}</div></div>
          </div>
        )}

        {/* Déblocage du jour, ou progression vers le prochain */}
        {justUnlocked && !isPremium ? (
          <div style={{padding:"16px",background:"rgba(78,128,96,0.1)",border:"1px solid rgba(78,128,96,0.3)",borderRadius:14,marginBottom:daysToNext?14:22}}>
            <div style={{fontSize:38,marginBottom:6,display:"inline-block",animation:"zoomBadge .6s cubic-bezier(.34,1.56,.64,1) .25s both"}}>{justUnlocked.emoji}</div>
            <div style={{fontSize:14,color:C.text,fontWeight:600,marginBottom:3}}>Nouveau contenu débloqué !</div>
            <div style={{fontSize:13,color:C.t2}}>« <b style={{color:C.green}}>{justUnlocked.label}</b> » est maintenant accessible 🎉</div>
          </div>
        ) : nextUnlock && !isPremium ? (
          <div style={{padding:"16px",background:"rgba(201,70,61,0.07)",border:"1px solid rgba(201,70,61,0.2)",borderRadius:14,marginBottom:14}}>
            <div style={{fontSize:32,marginBottom:6,display:"inline-block",animation:"floatY 3s ease-in-out infinite"}}>{nextUnlock.emoji}</div>
            <div style={{fontSize:13,color:C.text,fontWeight:600,marginBottom:3}}>Prochain déblocage : {nextUnlock.label}</div>
            <div style={{fontSize:12,color:C.t2}}>Plus que <b style={{color:C.red}}>{daysToNext} jour{daysToNext>1?"s":""}</b> de streak 🔓</div>
          </div>
        ) : isPremium ? (
          <div style={{padding:"14px",background:"rgba(201,168,76,0.1)",border:"1px solid rgba(201,168,76,0.3)",borderRadius:14,marginBottom:18}}>
            <div style={{fontSize:13,color:C.text,fontWeight:600}}>✨ Premium — tout est débloqué</div>
          </div>
        ) : (
          <div style={{padding:"14px",background:"rgba(78,128,96,0.08)",border:"1px solid rgba(78,128,96,0.25)",borderRadius:14,marginBottom:18}}>
            <div style={{fontSize:13,color:C.green,fontWeight:600}}>🎉 Tout le contenu gratuit est débloqué !</div>
          </div>
        )}

        <button onClick={onClose} className="pop-press" style={{width:"100%",padding:"14px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",animation:milestone?"ring 1.4s ease .6s 2":"none"}}>
          {milestone ? "Génial ! →" : "Continuer l'aventure →"}
        </button>
      </div>
      </div>
    </>
  );
}

// ─── Écran de connexion ───────────────────────────────────────────────────────
function AuthScreen({C}){
  const [mode,setMode] = useState("signin"); // signin | signup
  const [email,setEmail] = useState("");
  const [pw,setPw] = useState("");
  const [busy,setBusy] = useState(false);
  const [msg,setMsg] = useState(null);

  const submitEmail = async ()=>{
    if(!email || !pw){ setMsg({type:"err",text:"Renseigne email et mot de passe."}); return; }
    setBusy(true); setMsg(null);
    try {
      const fn = mode==="signup" ? signUpEmail : signInEmail;
      const { error } = await fn(email, pw);
      if(error){ setMsg({type:"err",text:traduireErreur(error.message)}); }
      else if(mode==="signup"){ setMsg({type:"ok",text:"Compte créé ! Tu peux te connecter."}); setMode("signin"); }
      // en cas de succès de connexion, le listener onAuthChange prend le relais
    } catch(e){ setMsg({type:"err",text:"Une erreur est survenue."}); }
    setBusy(false);
  };
  const google = async ()=>{
    setBusy(true); setMsg(null);
    try {
      await signInGoogle();
      // En natif : le navigateur s'ouvre, on reste en "busy" jusqu'au retour deep link.
      // En web : la session arrive via redirect, on ne fait rien de plus ici.
      // Ne pas setBusy(false) en natif — l'app se relance via appUrlOpen.
    } catch(e){
      setMsg({type:"err", text:"Erreur Google: " + (e?.message || String(e))});
      setBusy(false);
    }
  };

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,display:"flex",flexDirection:"column",justifyContent:"center",padding:"40px 28px"}}>
      <div style={{textAlign:"center",marginBottom:34}}>
        <div style={{fontSize:50,fontFamily:"'Noto Serif JP',serif",fontWeight:200,color:C.text,marginBottom:6}}>異世界</div>
        <div style={{fontSize:13,color:C.t2,letterSpacing:".05em"}}>Connecte-toi pour sauvegarder ta progression</div>
      </div>

      {/* Google */}
      <button onClick={google} disabled={busy} style={{width:"100%",padding:"14px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,color:C.text,fontSize:14,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:16}}>
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Continuer avec Google
      </button>

      <div style={{display:"flex",alignItems:"center",gap:12,margin:"4px 0 16px"}}>
        <div style={{flex:1,height:1,background:C.border}}/>
        <span style={{fontSize:11,color:C.t3}}>ou</span>
        <div style={{flex:1,height:1,background:C.border}}/>
      </div>

      {/* Email */}
      <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Adresse email" autoCapitalize="none" style={{width:"100%",padding:"13px 15px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,color:C.text,fontSize:14,marginBottom:10,boxSizing:"border-box"}}/>
      <input value={pw} onChange={e=>setPw(e.target.value)} type="password" placeholder="Mot de passe" style={{width:"100%",padding:"13px 15px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,color:C.text,fontSize:14,marginBottom:14,boxSizing:"border-box"}}/>

      {msg && <div style={{fontSize:12,color:msg.type==="err"?C.red:C.green,marginBottom:12,textAlign:"center"}}>{msg.text}</div>}

      <button onClick={submitEmail} disabled={busy} style={{width:"100%",padding:"14px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:busy?"default":"pointer",opacity:busy?0.7:1,marginBottom:14}}>
        {busy ? "..." : mode==="signup" ? "Créer mon compte" : "Se connecter"}
      </button>

      <div style={{textAlign:"center",fontSize:12,color:C.t2,marginBottom:24}}>
        {mode==="signup" ? "Déjà un compte ? " : "Pas encore de compte ? "}
        <span onClick={()=>{setMode(mode==="signup"?"signin":"signup");setMsg(null);}} style={{color:C.red,cursor:"pointer",fontWeight:500}}>
          {mode==="signup" ? "Se connecter" : "S'inscrire"}
        </span>
      </div>
    </div>
  );
}
function traduireErreur(m){
  if(/Invalid login/i.test(m)) return "Email ou mot de passe incorrect.";
  if(/already registered/i.test(m)) return "Cet email a déjà un compte.";
  if(/at least 6/i.test(m)) return "Le mot de passe doit faire au moins 6 caractères.";
  if(/valid email/i.test(m)) return "Adresse email invalide.";
  return m;
}

// ─── Recherche globale ────────────────────────────────────────────────────────
function buildSearchIndex(db){
  if(!db) return [];
  const items = [];
  (db.wiki||[]).forEach(w=> items.push({type:"Wiki", emoji:"📖", color:"#9E7A1A", title:w.mot, jp:w.jp, sub:w.definition, blob:`${w.mot} ${w.romaji} ${w.jp} ${w.definition} ${w.categorie}`, raw:w, kind:"wiki"}));
  (db.expressions||[]).forEach(e=> items.push({type:"Expression", emoji:"💬", color:"#C9463D", title:e.traduction, jp:e.expression, sub:e.romaji, blob:`${e.expression} ${e.romaji} ${e.traduction} ${e.contexte}`, raw:e, kind:"expr"}));
  (db.repas||[]).forEach(r=> items.push({type:"Repas", emoji:r.emoji||"🍱", color:"#3A6645", title:r.nom_jp, jp:r.nom_jp, sub:r.description||r.romaji, blob:`${r.nom_jp} ${r.romaji||""} ${r.description||""}`, raw:r, kind:"repas"}));
  (db.traditions||[]).forEach(t=> items.push({type:"Tradition", emoji:t.emoji||"⛩️", color:"#C4956A", title:t.nom, jp:t.nom_jp, sub:t.tagline, blob:`${t.nom} ${t.nom_jp} ${t.tagline} ${t.histoire} ${t.saison}`, raw:t, kind:"tradition"}));
  (db.codes_sociaux||[]).forEach(c=> items.push({type:"Code social", emoji:c.emoji||"🤫", color:"#8B6FB0", title:c.titre, jp:c.nom_jp, sub:c.resume, blob:`${c.titre} ${c.nom_jp} ${c.resume} ${c.explication}`, raw:c, kind:"code"}));
  (db.vie_quotidienne||[]).forEach(v=> items.push({type:"Vie quotidienne", emoji:v.emoji||"🏙️", color:"#5B7E9B", title:v.titre, jp:v.nom_jp, sub:v.resume, blob:`${v.titre} ${v.nom_jp} ${v.resume} ${v.description}`, raw:v, kind:"vie"}));
  (db.regions||[]).forEach(r=> items.push({type:"Région", emoji:r.emoji||"🗾", color:"#4E8060", title:r.nom, jp:r.nom_jp, sub:r.tagline, blob:`${r.nom} ${r.nom_jp} ${r.tagline} ${r.ambiance}`, raw:r, kind:"region"}));
  return items;
}

function SearchScreen({C, db, script, onClose, onWikiTap}){
  const [q,setQ] = useState("");
  const index = useMemo(()=>buildSearchIndex(db), [db]);
  const results = useMemo(()=>{
    const query = q.trim().toLowerCase();
    if(query.length < 2) return [];
    return index.filter(it => it.blob.toLowerCase().includes(query)).slice(0, 40);
  }, [q, index]);

  return(
    <div style={{position:"fixed",inset:0,zIndex:150,background:C.bg,display:"flex",flexDirection:"column"}}>
      {/* Search bar */}
      <div style={{padding:"50px 16px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:10,alignItems:"center"}}>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12}}>
          <span style={{fontSize:15,color:C.t3}}>🔍</span>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un mot, plat, tradition…" style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.text,fontSize:14}}/>
          {q && <span onClick={()=>setQ("")} style={{fontSize:16,color:C.t3,cursor:"pointer"}}>×</span>}
        </div>
        <button onClick={onClose} style={{background:"transparent",border:"none",color:C.t2,fontSize:14,cursor:"pointer"}}>Fermer</button>
      </div>

      {/* Results */}
      <div style={{flex:1,overflowY:"auto",padding:"14px 16px 30px"}}>
        {q.trim().length<2 && (
          <div style={{textAlign:"center",padding:"40px 20px",color:C.t3}}>
            <div style={{fontSize:40,marginBottom:12}}>🔍</div>
            <div style={{fontSize:13}}>Cherche parmi {index.length} contenus :<br/>expressions, plats, traditions, codes, mots du wiki…</div>
          </div>
        )}
        {q.trim().length>=2 && results.length===0 && (
          <div style={{textAlign:"center",padding:"40px 20px",color:C.t3,fontSize:13}}>Aucun résultat pour « {q} »</div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          {results.map((it,i)=>(
            <div key={i} onClick={()=>{ if(it.kind==="wiki"){ onWikiTap(it.raw); onClose(); } }} style={{display:"flex",alignItems:"center",gap:13,padding:"13px 14px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,cursor:it.kind==="wiki"?"pointer":"default"}}>
              {it.kind==="wiki" && it.raw?.image ? (
                <img src={it.raw.image} alt={it.title} loading="lazy" style={{width:42,height:42,borderRadius:10,objectFit:"cover",flexShrink:0,background:C.s2}} onError={(e)=>{ e.target.style.display="none"; e.target.nextSibling && (e.target.nextSibling.style.display="flex"); }}/>
              ) : null}
              <span style={{fontSize:24,flexShrink:0,...(it.kind==="wiki" && it.raw?.image ? {display:"none",width:42,height:42,alignItems:"center",justifyContent:"center"} : {})}}>{it.emoji}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"baseline",gap:7,marginBottom:2}}>
                  <span style={{fontSize:14,color:C.text,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it.title}</span>
                  {it.jp && it.jp!==it.title && <span style={{fontSize:11,color:C.t3,fontFamily:"'Noto Serif JP',serif",flexShrink:0}}>{it.jp}</span>}
                </div>
                <div style={{fontSize:11,color:C.t2,lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{it.sub}</div>
              </div>
              <span style={{fontSize:8,padding:"3px 8px",background:`${it.color}18`,border:`1px solid ${it.color}40`,borderRadius:20,color:it.color,whiteSpace:"nowrap",flexShrink:0}}>{it.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BottomNav({C,active,onChange}){
  return(
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:72,display:"flex",background:C.navBg,backdropFilter:"blur(18px)",borderTop:`1px solid ${C.border}`,zIndex:100}}>
      {TABS.map(t=>{
        const on=t.id===active;
        return(
          <button key={t.id} onClick={()=>onChange(t.id)} style={{flex:1,border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,color:on?C.red:C.t3,transition:"color .2s",position:"relative"}}>
            <span style={{fontFamily:"'Noto Serif JP',serif",fontSize:on?20:18,transition:"font-size .2s"}}>{t.kanji}</span>
            <span style={{fontSize:9,letterSpacing:".04em"}}>{t.label}</span>
            {on&&<div style={{position:"absolute",bottom:8,width:4,height:4,borderRadius:"50%",background:C.red}}/>}
          </button>
        );
      })}
    </div>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
const AVATAR_PLACEHOLDERS = ["🦊","🐼","🐯","🐰","🦉","🐣","🍡","🌸","⛩️","🗻","🍜","🎌"];

function Onboarding({onComplete, googleInfo}){
  const C=LIGHT;
  const [step,setStep]=useState(0);
  const [why,setWhy]=useState([]);
  const [goal,setGoal]=useState("");
  const [level,setLevel]=useState("");
  // Pré-remplit le nom depuis Google si dispo
  const [name,setName]=useState(googleInfo?.name || "");
  // Photo : soit la photo Google, soit un emoji placeholder choisi
  const [photo,setPhoto]=useState(googleInfo?.photo || null);
  const [emojiAvatar,setEmojiAvatar]=useState(googleInfo?.photo ? null : "🦊");
  const ok=[why.length>0,!!goal,!!level][step];
  const toggle=id=>setWhy(w=>w.includes(id)?w.filter(x=>x!==id):[...w,id]);
  const chip=active=>({padding:"15px 12px",borderRadius:10,cursor:"pointer",background:active?"rgba(201,70,61,0.09)":"rgba(26,20,16,0.04)",border:`1px solid ${active?"rgba(201,70,61,0.3)":C.border}`,transition:"all .2s"});
  const titles=[{jp:"なぜ日本？",fr:"Pourquoi le Japon ?"},{jp:"目標は何？",fr:"Quel est ton objectif ?"},{jp:"あなたは？",fr:"Parle-moi de toi"}];
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
      <div style={{padding:"50px 26px 0",flexShrink:0}}>
        <div style={{display:"flex",gap:5,marginBottom:28}}>
          {[0,1,2].map(i=>(<div key={i} style={{height:2,flex:1,borderRadius:1,background:i<=step?C.red:"rgba(26,20,16,0.1)",transition:"background .4s"}}/>))}
        </div>
        <div key={step} style={{animation:"fadeUp .35s ease"}}>
          <div style={{fontSize:11,color:C.t3,letterSpacing:".28em",marginBottom:5}}>{step+1} / 3</div>
          <div style={{fontSize:26,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:4}}>{titles[step].jp}</div>
          <div style={{fontSize:14,color:C.t2}}>{titles[step].fr}</div>
        </div>
      </div>
      <div key={`b${step}`} style={{flex:1,overflowY:"auto",padding:"22px 26px",animation:"fadeUp .35s ease"}}>
        {step===0&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{WHY.map(o=>(<div key={o.id} style={chip(why.includes(o.id))} onClick={()=>toggle(o.id)}><div style={{fontSize:26,marginBottom:7,textAlign:"center"}}>{o.emoji}</div><div style={{fontSize:12,color:why.includes(o.id)?C.text:C.t2,textAlign:"center",lineHeight:1.4}}>{o.label}</div></div>))}</div>)}
        {step===1&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>{GOALS.map(o=>(<div key={o.id} style={{...chip(goal===o.id),display:"flex",alignItems:"center",gap:14,padding:"16px"}} onClick={()=>setGoal(o.id)}><span style={{fontSize:24}}>{o.emoji}</span><span style={{fontSize:14,color:goal===o.id?C.text:C.t2,flex:1}}>{o.label}</span>{goal===o.id&&<span style={{color:C.red}}>✓</span>}</div>))}</div>)}
        {step===2&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {LEVELS.map(o=>(<div key={o.id} style={{...chip(level===o.id),display:"flex",alignItems:"center",gap:14,padding:"16px"}} onClick={()=>setLevel(o.id)}><span style={{fontSize:28}}>{o.emoji}</span><div style={{flex:1}}><div style={{fontSize:14,color:level===o.id?C.text:C.t2,marginBottom:2}}>{o.label}</div><div style={{fontSize:11,color:C.t3}}>{o.sub}</div></div>{level===o.id&&<span style={{color:C.red}}>✓</span>}</div>))}
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
        <button onClick={()=>step<2?setStep(s=>s+1):onComplete({why,goal,level,name:name||"Voyageur",photo:photo||null,emojiAvatar:photo?null:emojiAvatar})} disabled={!ok}
          style={{width:"100%",padding:"15px",background:ok?C.red:"rgba(26,20,16,0.08)",border:"none",borderRadius:12,color:ok?"#fff":C.t3,fontSize:15,cursor:ok?"pointer":"default",letterSpacing:".04em",transition:"all .2s"}}>
          {step<2?"Continuer →":"Commencer l'aventure 🌸"}
        </button>
      </div>
    </div>
  );
}

// ─── Parcours de présentation (tour des fonctionnalités) ──────────────────────
// Parcours guidé contextuel : chaque étape pointe une section (onglet) réelle
const TOUR_STEPS = [
  {tab:"home",      emoji:"🏠", title:"L'accueil",        text:"Ton rendez-vous quotidien : proverbe du jour, recommandations selon tes goûts, et ta sélection « Daily Japan ». Reviens chaque jour pour du nouveau contenu et garder ta série 🔥."},
  {tab:"explore",   emoji:"🗺️", title:"Explorer",          text:"Découvre traditions, vie quotidienne, codes sociaux et régions. Les catégories se débloquent au fil de ton streak quotidien 🔥."},
  {tab:"scenarios", emoji:"🎭", title:"Scénarios",        text:"Des dialogues interactifs pour t'entraîner à de vraies conversations. Valide-les pour suivre ta progression."},
  {tab:"learn",     emoji:"🎴", title:"Apprendre",         text:"Le cœur de l'app : le parcours « Survivre à Tokyo » étape par étape, ou l'entraînement libre (flashcards de kana, situations). Avec prononciation audio 🔊."},
  {tab:"profile",   emoji:"🏆", title:"Ton profil",        text:"Suis ta progression : titre, streak, maîtrise des syllabaires, badges débloqués et tes favoris. Tout est synchronisé sur ton compte."},
];

function GuidedTour({C, step, onNext, onPrev, onSkip, onFinish, dontShowAgain, setDontShowAgain}){
  const s = TOUR_STEPS[step];
  const last = step === TOUR_STEPS.length-1;
  const first = step === 0;
  return(
    <>
      {/* Voile sombre — laisse voir la section derrière */}
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:300,backdropFilter:"blur(1px)"}}/>
      {/* Conteneur de positionnement (centrage horizontal) — ne porte AUCUNE animation */}
      <div style={{position:"fixed",left:"50%",bottom:90,transform:"translateX(-50%)",width:"min(90vw,360px)",zIndex:301}}>
        {/* Carte animée (l'animation ne touche que cet enfant, pas le centrage) */}
        <div key={step} style={{background:C.s1,borderRadius:18,padding:"22px 22px 18px",boxShadow:"0 20px 60px rgba(0,0,0,0.45)",border:`1px solid ${C.border}`,animation:"bubbleIn .42s cubic-bezier(.34,1.56,.64,1) both"}}>
        {/* Skip en haut à droite */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontSize:11,color:C.red,letterSpacing:".15em",textTransform:"uppercase"}}>Découverte · {step+1}/{TOUR_STEPS.length}</span>
          {!last && <span onClick={onSkip} className="pop-press" style={{fontSize:12,color:C.t3,cursor:"pointer"}}>Passer</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <span style={{fontSize:34,display:"inline-block",animation:"zoomBadge .5s cubic-bezier(.34,1.56,.64,1) .1s both"}}>{s.emoji}</span>
          <div style={{fontSize:19,fontWeight:600,color:C.text,animation:"slideInRight .4s ease .12s both"}}>{s.title}</div>
        </div>
        <div style={{fontSize:14,color:C.t2,lineHeight:1.6,marginBottom:18,animation:"fadeIn .5s ease .2s both"}}>{s.text}</div>

        {/* Sur la dernière étape : option de désactivation */}
        {last && (
          <div onClick={()=>setDontShowAgain(v=>!v)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 13px",background:C.s2,borderRadius:10,marginBottom:16,cursor:"pointer",border:`1px solid ${dontShowAgain?C.red:C.border}`}}>
            <div style={{width:20,height:20,borderRadius:5,flexShrink:0,border:`1px solid ${dontShowAgain?C.red:C.t3}`,background:dontShowAgain?C.red:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13}}>{dontShowAgain?"✓":""}</div>
            <span style={{fontSize:13,color:C.text}}>Ne plus afficher ce parcours à l'ouverture</span>
          </div>
        )}

        {/* Navigation */}
        <div style={{display:"flex",gap:10}}>
          {!first && <button onClick={onPrev} className="pop-press" style={{flex:"0 0 auto",padding:"13px 18px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:14,cursor:"pointer"}}>‹</button>}
          <button onClick={last ? onFinish : onNext} className="pop-press" style={{flex:1,padding:"14px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>
            {last ? "Terminer 🌸" : "Suivant →"}
          </button>
        </div>
        </div>
      </div>
    </>
  );
}

function Splash({onDone}){
  useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[]);
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0F0B08",position:"relative",overflow:"hidden"}}>
      <Petals/>
      <div style={{position:"relative",zIndex:1,textAlign:"center",animation:"fadeIn .8s ease"}}>
        <div style={{fontSize:70,fontFamily:"'Noto Serif JP',serif",fontWeight:200,color:"#F0E6D3",lineHeight:1,animation:"fadeUp .9s ease"}}>異世界</div>
        <div style={{height:1,background:"linear-gradient(90deg,transparent,#C9463D,transparent)",margin:"16px auto",width:70}}/>
        <div style={{fontSize:12,letterSpacing:".42em",color:"#9C8A74",textTransform:"uppercase"}}>ISEKAI'D</div>
        <div style={{fontSize:10,color:"#5E4E3C",marginTop:6,letterSpacing:".22em"}}>Experience Japan every day.</div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
// Persistence helpers (localStorage) — safe wrappers
const STORE_KEY = "isekaid_profile_v1";
const TOUR_KEY = "isekaid_tour_off_v1"; // "1" => parcours désactivé (ne plus afficher)
function tourDisabled(){ try { return localStorage.getItem(TOUR_KEY)==="1"; } catch { return false; } }
function setTourDisabled(off){ try { localStorage.setItem(TOUR_KEY, off?"1":"0"); } catch {} }
const THEME_KEY = "isekaid_theme_v1";
function loadProfile(){
  try { const raw = localStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
function saveProfile(u){
  try { localStorage.setItem(STORE_KEY, JSON.stringify(u)); } catch {}
}

// Extrait les infos de profil depuis une session Supabase (connexion Google/email).
// Google fournit : full_name, name, avatar_url, picture, email.
function googleUserInfo(session){
  const u = session?.user;
  if(!u) return null;
  const m = u.user_metadata || {};
  return {
    name: m.full_name || m.name || (u.email ? u.email.split("@")[0] : null),
    photo: m.avatar_url || m.picture || null,
    email: u.email || null,
  };
}

function clearProfile(){
  try { localStorage.removeItem(STORE_KEY); } catch {}
}
function loadTheme(){
  try { return localStorage.getItem(THEME_KEY) === "dark"; } catch { return false; }
}
function saveTheme(isDark){
  try { localStorage.setItem(THEME_KEY, isDark ? "dark" : "light"); } catch {}
}

// Script mode: "kanji" (漢字) or "romaji" (phonétique)
const SCRIPT_KEY = "isekaid_script_v1";

// ── Suivi des kana maîtrisés ──────────────────────────────────────────────────
const KANA_KEY = "isekaid_kana_v1"; // { "あ": {seen, known}, ... }
function loadKanaProgress(){
  try { const raw=localStorage.getItem(KANA_KEY); return raw?JSON.parse(raw):{}; }
  catch { return {}; }
}
function saveKanaProgress(p){ try { localStorage.setItem(KANA_KEY, JSON.stringify(p)); } catch {} }
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

function loadScript(){
  try {
    const v = localStorage.getItem(SCRIPT_KEY);
    return (v==="romaji"||v==="kanji"||v==="kana") ? v : "kana";
  }
  catch { return "kana"; }
}
function saveScript(mode){
  try { localStorage.setItem(SCRIPT_KEY, mode); } catch {}
}

// ─── Streak logic ─────────────────────────────────────────────────────────────
const STREAK_KEY = "isekaid_streak_v1";

// ─── Mission quotidienne ──────────────────────────────────────────────────────
const MISSION_KEY = "isekaid_mission_v1";
// Pool de missions quotidiennes — 3 sont tirées chaque jour (rotation déterministe).
// Le champ `trigger` relie la mission à une vraie action dans l'app.
const MISSION_POOL = [
  { id:"read_home",   trigger:"daily",    emoji:"📖", label:"Lire le contenu du jour",     hint:"Accueil" },
  { id:"learn_kana",  trigger:"kana",     emoji:"🎴", label:"Réviser quelques kana",        hint:"Apprendre" },
  { id:"do_review",   trigger:"review",   emoji:"🔁", label:"Faire une révision",           hint:"Apprendre" },
  { id:"like_card",   trigger:"fav",      emoji:"❤️", label:"Ajouter une carte en favori",  hint:"Explorer / Accueil" },
  { id:"do_scenario", trigger:"scenario", emoji:"🎭", label:"Terminer un scénario",         hint:"Scénarios" },
  { id:"explore_trad",trigger:"explore",  emoji:"⛩️", label:"Découvrir une tradition",      hint:"Explorer" },
  { id:"read_comp",   trigger:"comp",     emoji:"📝", label:"Faire une compréhension",      hint:"Apprendre" },
  { id:"path_step",   trigger:"path",     emoji:"🗼", label:"Avancer dans le parcours Tokyo",hint:"Apprendre" },
];

// Tire 3 missions du jour de façon déterministe (même trio toute la journée,
// change chaque jour). Graine FNV-1a + xorshift pour une bonne dispersion.
function dailyMissions(dateKey = dayKey()){
  let seed = 2166136261;
  for(let i=0;i<dateKey.length;i++){ seed ^= dateKey.charCodeAt(i); seed = Math.imul(seed, 16777619) >>> 0; }
  const pool = [...MISSION_POOL];
  const picked = [];
  for(let n=0; n<3 && pool.length; n++){
    seed ^= seed << 13; seed >>>= 0;
    seed ^= seed >> 17;
    seed ^= seed << 5; seed >>>= 0;
    const idx = seed % pool.length;
    picked.push(pool.splice(idx,1)[0]);
  }
  return picked;
}
function loadMission(){
  try {
    const raw = localStorage.getItem(MISSION_KEY);
    const m = raw ? JSON.parse(raw) : null;
    if(!m || m.day !== dayKey()) return { day: dayKey(), done: [], claimed:false };
    return m;
  } catch { return { day: dayKey(), done: [], claimed:false }; }
}
function saveMission(m){ try { localStorage.setItem(MISSION_KEY, JSON.stringify(m)); } catch {} }
// Local day key YYYY-MM-DD (no timezone surprises)
function dayKey(d=new Date()){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function daysBetween(aKey,bKey){
  const a=new Date(aKey+"T00:00:00"), b=new Date(bKey+"T00:00:00");
  return Math.round((b-a)/86400000);
}
function loadStreak(){
  try { const raw=localStorage.getItem(STREAK_KEY); return raw?JSON.parse(raw):null; }
  catch { return null; }
}
// Returns { count, best, last, freezes, lastFreezeRecharge } updated for "today"
// Streak consécutif avec 1 joker rechargeable (1 tous les 7 jours actifs).
function touchStreak(){
  const today = dayKey();
  let s = loadStreak();
  if(!s || !s.last){
    s = { count:1, best:1, last:today, freezes:1, freezeBase:0 };
  } else if(s.last === today){
    // déjà compté aujourd'hui — rien à faire
  } else {
    const gap = daysBetween(s.last, today);
    if(gap === 1){
      s.count += 1;                       // jour consécutif
    } else if(gap === 2 && (s.freezes||0) > 0){
      // 1 jour manqué mais un joker disponible → on consomme le joker, streak préservé
      s.freezes -= 1;
      s.count += 1;
      s.frozenUsed = true;
    } else {
      s.count = 1;                        // streak cassé
      s.frozenUsed = false;
    }
    s.last = today;
    if(s.count > (s.best||0)) s.best = s.count;
  }
  // Recharge d'un joker tous les 7 jours de streak (max 2 en réserve)
  const base = s.freezeBase || 0;
  if(s.count - base >= 7){
    s.freezes = Math.min((s.freezes||0) + 1, 2);
    s.freezeBase = s.count;
  }
  if(s.freezes === undefined) s.freezes = 1;
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(s)); } catch {}
  return {...s};
}
function saveStreak(s){
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(s)); } catch {}
}

// ─── Progression : déblocages & XP ────────────────────────────────────────────
const UNLOCK_KEY = "isekaid_unlocks_v1";
const SCEN_KEY = "isekaid_scenarios_v1"; // {done:[ids], xp:number}
function loadScenarioProgress(){
  try { const raw=localStorage.getItem(SCEN_KEY); return raw?JSON.parse(raw):{done:[],xp:0}; }
  catch { return {done:[],xp:0}; }
}
function saveScenarioProgress(p){ try { localStorage.setItem(SCEN_KEY, JSON.stringify(p)); } catch {} }
// ─── Déblocage progressif par paliers de streak (jours consécutifs) ───────────
// L'essentiel s'ouvre en 1 semaine ; tout le contenu gratuit en 1 mois.
// Premium (payant) débloque tout immédiatement.
const UNLOCK_SCHEDULE = [
  { day:1,  cat:"traditions",      label:"Traditions",        emoji:"⛩️" },
  { day:3,  cat:"vie_quotidienne", label:"Vie quotidienne",   emoji:"🏙️" },
  { day:5,  cat:"codes_sociaux",   label:"Codes sociaux",     emoji:"🤫" },
  { day:7,  cat:"histoire",        label:"Histoire",          emoji:"📜" },
  { day:14, cat:"regions",         label:"Régions du Japon",  emoji:"🗾" },
];
// Le palier "1 mois" : au-delà de J30, marqueur que tout le gratuit est ouvert.
const FULL_FREE_DAY = 30;
// Compat : map cat -> palier (pour savoir à quel jour une catégorie s'ouvre)
const LOCKABLE = UNLOCK_SCHEDULE.reduce((acc,u)=>{ acc[u.cat]={label:u.label,emoji:u.emoji,day:u.day,free:u.day<=1}; return acc; },{});
// Paliers de titres selon l'XP total
// ─── Accents déblocables par XP (cosmétique, motivationnel) ───
const ACCENT_THEMES = [
  { id:"classic",  label:"Rouge impérial", jp:"朱",   color:"#C9463D", minXp:0,   emoji:"🔴" },
  { id:"sakura",   label:"Sakura",         jp:"桜",   color:"#E08BA8", minXp:3,   emoji:"🌸" },
  { id:"matcha",   label:"Matcha",         jp:"抹茶", color:"#7BA05B", minXp:7,   emoji:"🍵" },
  { id:"indigo",   label:"Indigo",         jp:"藍",   color:"#3F6CA6", minXp:14,  emoji:"🟦" },
  { id:"gold",     label:"Or de Kanazawa", jp:"金",   color:"#C9A84C", minXp:30,  emoji:"🟡" },
  { id:"sumi",     label:"Encre de Sumi",  jp:"墨",   color:"#5A5560", minXp:60,  emoji:"⚫" },
];
const ACCENT_KEY = "isekaid_accent_v1";
function loadAccent(){ try { return localStorage.getItem(ACCENT_KEY) || "classic"; } catch { return "classic"; } }
function saveAccent(id){ try { localStorage.setItem(ACCENT_KEY, id); } catch {} }

const TITLES = [
  {min:0,    title:"Curieux du Japon",   jp:"興味",   emoji:"🌱"},
  {min:3,    title:"Voyageur novice",    jp:"旅人",   emoji:"🎒"},
  {min:7,    title:"Explorateur",        jp:"探検家", emoji:"🧭"},
  {min:14,   title:"Initié culturel",    jp:"文化人", emoji:"🎴"},
  {min:30,   title:"Connaisseur",        jp:"通",     emoji:"🏮"},
  {min:60,   title:"Maître du Japon",    jp:"達人",   emoji:"🎌"},
];
function loadUnlocks(){
  try { const raw=localStorage.getItem(UNLOCK_KEY); return raw?JSON.parse(raw):null; }
  catch { return null; }
}
function defaultUnlocks(){
  // free categories unlocked by default
  const u = {};
  Object.entries(LOCKABLE).forEach(([k,v])=>{ if(v.free) u[k]=true; });
  return u;
}
function getUnlocks(){ return loadUnlocks() || defaultUnlocks(); }
function saveUnlocks(u){ try { localStorage.setItem(UNLOCK_KEY, JSON.stringify(u)); } catch {} }

// ── Premium ──
const PREMIUM_KEY = "isekaid_premium_v1";
// Code d'accès secret à partager avec tes amis pour débloquer le Premium à vie.
// ⚠️ Change cette valeur pour ton propre code, puis garde-la confidentielle.
const ACCESS_CODE = "ISEKAI-FRIENDS-2026";
function loadPremium(){
  try { return JSON.parse(localStorage.getItem(PREMIUM_KEY)||"null"); } catch { return null; }
}
function savePremium(p){ try { localStorage.setItem(PREMIUM_KEY, JSON.stringify(p)); } catch {} }

// La progression cosmétique (titres, accents) est désormais basée sur le STREAK
// (nombre de jours de régularité), et non plus sur l'XP (système retiré).
function computeXP(unlocks, scenXP, streakCount){
  return streakCount || 0;   // "xp" = jours de streak, pour compat avec l'UI existante
}
function titleForXP(days){
  let t = TITLES[0];
  for(const tier of TITLES){ if(days >= tier.min) t = tier; }
  return t;
}

// ─── Favorites (collection) ───────────────────────────────────────────────────
const FAV_KEY = "isekaid_favs_v1";
function loadFavs(){
  try { const raw=localStorage.getItem(FAV_KEY); return raw?JSON.parse(raw):[]; }
  catch { return []; }
}
function saveFavs(list){
  try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch {}
}
// Build a stable id for any content item
function favId(type, item){
  const label = item.expression || item.titre || item.nom_jp || item.nom || "";
  return `${type}:${label}`;
}

export default function IsekaidApp(){
  const [screen,setScreen]=useState("splash");
  const [tab,setTabRaw]=useState("home");
  const setTab = (t)=>{ if(t==="explore") completeTask("explore"); setTabRaw(t); };
  const [user,setUser]=useState(()=>loadProfile());   // read saved profile immediately
  const [dark,setDark]=useState(()=>loadTheme());
  const [accent,setAccent]=useState(()=>loadAccent());
  const chooseAccent = (id)=>{ setAccent(id); saveAccent(id); };
  const [db,setDb]=useState(null);
  const [streak,setStreak]=useState(()=>loadStreak()||{count:0,best:0,last:null,keys:0});
  const [favs,setFavs]=useState(()=>loadFavs());
  const [unlocks,setUnlocks]=useState(()=>getUnlocks());
  const [premium,setPremium]=useState(()=>loadPremium());
  const isPremium = !!premium?.active;
  const [showPremiumPage,setShowPremiumPage]=useState(false);
  const [billingError,setBillingError]=useState(null);
  const [billingBusy,setBillingBusy]=useState(false);
  const [liveOfferings,setLiveOfferings]=useState(null);

  // Initialise RevenueCat et vérifie le statut Premium (effet déclenché après login).
  // L'initialisation réelle se fait dans un useEffect plus bas, après la déclaration de session.

  // Lance l'achat RevenueCat.
  const activatePremium = async (plan)=>{
    setBillingError(null);
    if(!isNativePlatform()){
      setBillingError("unavailable"); return;
    }
    setBillingBusy(true);
    const res = await purchasePlan(plan);
    setBillingBusy(false);
    if(res.ok){
      const p={active:true, plan, since:new Date().toISOString()};
      setPremium(p); savePremium(p); setShowPremiumPage(false);
    } else if(res.reason==="cancelled"){
      // L'utilisateur a fermé — pas d'erreur affichée.
    } else {
      setBillingError(res.reason||"error");
    }
  };

  // Restaure les achats (bouton dans la page Premium / profil).
  const restorePremium = async ()=>{
    setBillingBusy(true);
    const res = await restorePurchases();
    setBillingBusy(false);
    if(res.active){
      const p={active:true, plan:res.plan, since:new Date().toISOString(), restored:true};
      setPremium(p); savePremium(p); setShowPremiumPage(false);
    } else {
      setBillingError("restore_nothing");
    }
  };
  // Active le Premium à vie via code d'accès. Retourne true si le code est valide.
  const redeemCode = (code)=>{
    const clean = (code||"").trim().toUpperCase();
    if(clean === ACCESS_CODE.toUpperCase()){
      const p = { active:true, plan:"code", since:new Date().toISOString() };
      setPremium(p); savePremium(p);
      return true;
    }
    return false;
  };
  const cancelPremium = ()=>{ setPremium(null); savePremium(null); };
  const [scenProgress,setScenProgress]=useState(()=>loadScenarioProgress());
  const [kanaProgress,setKanaProgress]=useState(()=>loadKanaProgress());
  const [pathProgress,setPathProgress]=useState(()=>loadPathProgress());

  const completePathStep = (stepId)=>{
    completeTask("path");
    setPathProgress(prev=>{
      const completed = prev?.completed || [];
      if(completed.includes(stepId)) return prev;
      const next = { completed:[...completed, stepId] };
      savePathProgress(next);
      return next;
    });
  };

  const recordKanaResult = (char, known)=>{
    completeTask("kana");
    setKanaProgress(prev=>{
      const next = recordKana(prev, char, known);
      saveKanaProgress(next);
      return next;
    });
  };

  const xp = computeXP(unlocks, scenProgress.xp, streak?.count || 0);
  const rank = titleForXP(xp);

  // Terminer un scénario : on marque juste comme complété (plus de clés ni d'XP)
  const completeScenario = (s)=>{
    if(scenProgress.done.includes(s.id)) return;
    const newProg = {done:[...scenProgress.done, s.id], xp:0};
    setScenProgress(newProg); saveScenarioProgress(newProg);
    completeTask("scenario");
  };

  // Une catégorie est débloquée si : premium, OU pas verrouillable, OU le streak
  // a atteint le palier de jours requis.
  const isUnlocked = (catKey)=>{
    if(isPremium) return true;
    const def = LOCKABLE[catKey];
    if(!def) return true;                 // contenu non soumis à palier = libre
    const dayReached = (streak?.count || 0) >= def.day || (streak?.best || 0) >= def.day;
    return dayReached;
  };
  // Plus de déblocage manuel par clés : le déblocage est automatique via le streak.
  // (Fonction conservée pour compat d'appel mais sans effet de monnaie.)
  const unlockCategory = (catKey)=>{
    const def = LOCKABLE[catKey];
    if(!def) return {ok:false, reason:"already"};
    if(isUnlocked(catKey)) return {ok:true};
    return {ok:false, reason:"day", day:def.day};
  };
  const [wikiEntry,setWikiEntry]=useState(null);
  const [showWelcome,setShowWelcome]=useState(false);
  const [welcomeQueued,setWelcomeQueued]=useState(false);
  const [dailyInfo,setDailyInfo]=useState(null);
  const [mission,setMission]=useState(()=>loadMission());
  const [missionReward,setMissionReward]=useState(false);
  useEffect(()=>{ if(missionReward){ const t=setTimeout(()=>setMissionReward(false),3500); return ()=>clearTimeout(t); } },[missionReward]);
  // Complète une mission du jour à partir d'un TRIGGER d'action (ex: "fav", "kana", "scenario").
  // On ne valide que si ce trigger correspond à l'une des 3 missions tirées aujourd'hui.
  const completeTask = (trigger)=>{
    setMission(prev=>{
      const todays = dailyMissions(prev.day || dayKey());
      const mission = todays.find(m=>m.trigger===trigger);
      if(!mission) return prev;                       // ce trigger n'est pas une mission du jour
      if(prev.done.includes(mission.id)) return prev; // déjà validée
      const done = [...prev.done, mission.id];
      const m = {...prev, done};
      if(done.length>=todays.length && !prev.claimed){
        m.claimed = true;
        setMissionReward(true);
        // Mission du jour accomplie → on valide le streak (vraie activité du jour)
        const s = touchStreak();
        setStreak(s);
        setDailyInfo({ milestone: s.milestone, frozenUsed: s.frozenUsed });
        if(s.gainedKey || s.frozenUsed) setWelcomeQueued(true);
      }
      saveMission(m);
      return m;
    });
  };
  const [showSearch,setShowSearch]=useState(false);
  const [tourStep,setTourStep]=useState(-1); // -1 = inactif, 0+ = étape en cours
  const [tourDontShow,setTourDontShow]=useState(false);
  const [newAchievement,setNewAchievement]=useState(null);

  // Detect newly unlocked achievements and celebrate
  useEffect(()=>{
    if(!db) return;
    const earned = computeAchievements({ streak, xp, unlocks, scenProgress, kanaProgress, favs, pathProgress })
      .filter(a=>a.unlocked).map(a=>a.id);
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem("isekaid_ach_v1")||"[]"); } catch {}
    const fresh = earned.filter(id=>!seen.includes(id));
    if(fresh.length>0){
      // Don't celebrate on the very first load (seen is empty = existing user) unless it's truly new
      if(seen.length>0){
        const a = ACHIEVEMENTS.find(x=>x.id===fresh[fresh.length-1]);
        if(a) setNewAchievement(a);
      }
      try { localStorage.setItem("isekaid_ach_v1", JSON.stringify(earned)); } catch {}
    }
  },[streak, xp, unlocks, scenProgress, kanaProgress, favs, pathProgress, db]);
  const [wikiMap,setWikiMap]=useState({});
  const [script,setScript]=useState(()=>loadScript());
  const [session,setSession]=useState(null);

  // Intercepte le deep link app.isekaid://login-callback après connexion Google (natif).
  useEffect(()=>{
    let listener = null;
    const setup = async ()=>{
      try {
        const { App: CapApp } = await import("@capacitor/app");
        listener = await CapApp.addListener("appUrlOpen", async ({ url })=>{
          if(url && url.includes("login-callback")){
            const sess = await handleOAuthCallback(url);
            if(sess) setSession(sess);
          }
        });
      } catch { /* hors natif — pas de Capacitor App */ }
    };
    setup();
    return ()=>{ listener?.remove?.(); };
  },[]);

  // Initialise RevenueCat dès que la session Supabase est connue.
  useEffect(()=>{
    if(!isNativePlatform()) return;
    initRevenueCat(session?.user?.id).then(ok=>{
      if(!ok) return;
      checkPremiumStatus().then(status=>{
        if(status.active){
          const p={active:true,plan:status.plan,since:new Date().toISOString(),expiry:status.expiry?.toISOString()||null};
          setPremium(p); savePremium(p);
        } else if(premium?.active && premium?.plan!=="code"){
          setPremium(null); savePremium(null);
        }
      });
      getOfferings().then(o=>{ if(o) setLiveOfferings(o); });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[session?.user?.id]);
  const [authChecked,setAuthChecked]=useState(false);
  const [skipAuth,setSkipAuth]=useState(false);

  // Listen for auth changes
  useEffect(()=>{
    if(!supabaseEnabled){ setAuthChecked(true); return; }
    getSession().then(s=>{ setSession(s); setAuthChecked(true); });
    const sub = onAuthChange(s=> setSession(s));
    return ()=> sub.unsubscribe?.();
  },[]);

  // Enrichit le profil avec les infos Google (nom, photo, email) à la connexion.
  // Ne remplace pas un nom/photo déjà personnalisés par l'utilisateur.
  useEffect(()=>{
    const info = googleUserInfo(session);
    if(!info) return;
    setUser(prev=>{
      const base = prev || {};
      const next = {
        ...base,
        email: info.email || base.email,
        // On garde le nom/photo existants si l'utilisateur les a déjà définis
        name: (base.name && base.name!=="Voyageur") ? base.name : (info.name || base.name),
        photo: base.photo || info.photo || null,
      };
      saveProfile(next);
      return next;
    });
  },[session?.user?.id]);

  // When logged in: pull cloud progress (merge into local state)
  useEffect(()=>{
    if(!session?.user) return;
    fetchProgress(session.user.id).then(p=>{
      if(!p) return;
      if(p.streak && Object.keys(p.streak).length){ setStreak(p.streak); saveStreak(p.streak); }
      if(p.unlocks && Object.keys(p.unlocks).length){ setUnlocks(p.unlocks); saveUnlocks(p.unlocks); }
      if(p.scenarios && Object.keys(p.scenarios).length){ setScenProgress(p.scenarios); saveScenarioProgress(p.scenarios); }
      if(Array.isArray(p.favorites) && p.favorites.length){ setFavs(p.favorites); saveFavs(p.favorites); }
      if(p.kana_progress && Object.keys(p.kana_progress).length){ setKanaProgress(p.kana_progress); saveKanaProgress(p.kana_progress); }
      if(p.profile && p.profile.name){ setUser(p.profile); saveProfile(p.profile); }
      if(p.path && Array.isArray(p.path.completed)){ setPathProgress(p.path); savePathProgress(p.path); }
      // Mission : ne charger depuis le cloud que si elle concerne le jour actuel.
      // Une mission cloud périmée (autre jour) ne doit pas écraser celle d'aujourd'hui.
      if(p.mission && p.mission.day === dayKey()){ setMission(p.mission); saveMission(p.mission); }
      // Paramètres (thème, accent, script, parcours vu, premium)
      const s = p.settings;
      if(s){
        if(typeof s.dark==="boolean"){ setDark(s.dark); saveTheme(s.dark); }
        if(s.accent){ setAccent(s.accent); saveAccent(s.accent); }
        if(s.script){ setScript(s.script); saveScript(s.script); }
        if(s.tourSeen){ setTourDisabled(true); }
        if(s.premium && s.premium.active){ setPremium(s.premium); savePremium(s.premium); }
      }
    });
  },[session?.user?.id]);

  // Push progress to cloud (debounced) whenever it changes and user is logged in
  const syncRef = useRef(null);
  useEffect(()=>{
    if(!session?.user) return;
    clearTimeout(syncRef.current);
    syncRef.current = setTimeout(()=>{
      saveProgress(session.user.id, {
        streak, unlocks, scenarios:scenProgress, favorites:favs, kana_progress:kanaProgress, profile:user, path:pathProgress, mission,
        settings: { dark, accent, script, tourSeen: tourDisabled(), premium }
      });
    }, 800);
    return ()=> clearTimeout(syncRef.current);
  },[streak, unlocks, scenProgress, favs, kanaProgress, user, pathProgress, mission, dark, accent, script, premium, session?.user?.id]);

  const logout = async ()=>{
    await signOut();
    await logoutRevenueCat();
    setSession(null);
    setScreen("auth");
  };

  const isFav = (type,item)=> favs.some(f=>f.id===favId(type,item));
  const toggleFav = (type,item)=>{
    const id = favId(type,item);
    setFavs(prev=>{
      const exists = prev.some(f=>f.id===id);
      const next = exists ? prev.filter(f=>f.id!==id)
                          : [{id, type, item, savedAt:Date.now()}, ...prev];
      saveFavs(next);
      // Mission « ajouter une carte en favori » : validée seulement à l'ajout (pas au retrait)
      if(!exists) completeTask("fav");
      return next;
    });
  };
  const baseC = dark?DARK:LIGHT;
  const accentDef = ACCENT_THEMES.find(a=>a.id===accent) || ACCENT_THEMES[0];
  const C = useMemo(()=>({ ...baseC, red: accentDef.color }), [dark, accentDef.color]);

  // Load content data on startup
  useEffect(()=>{
    setDb(DATA);
    // On CHARGE le streak sans le valider. Le streak ne se valide que lorsque
    // l'utilisateur complète sa mission du jour (voir effet lié à missionDone).
    const s = loadStreak() || { count:0, best:0, last:null, freezes:1, freezeBase:0 };
    setStreak(s);
    setDailyInfo({ milestone: s.milestone, frozenUsed: s.frozenUsed });
    setWikiMap(buildWikiMap(DATA.wiki));
  },[]);

  // Persist theme whenever it changes
  useEffect(()=>{ saveTheme(dark); },[dark]);
  useEffect(()=>{ saveScript(script); },[script]);
  const toggleScript = ()=> setScript(s=> s==="kana" ? "kanji" : s==="kanji" ? "romaji" : "kana");

  // When splash finishes: decide auth → onboarding → app
  // On attend que authChecked soit true (getSession() résolu) avant de décider.
  const afterSplash = ()=>{
    if(!authChecked){
      // Session pas encore vérifiée → on attend via l'effet ci-dessous
      setScreen("loading"); return;
    }
    if(supabaseEnabled && !session && !skipAuth){ setScreen("auth"); return; }
    setScreen(user ? "app" : "onboarding");
  };

  // Si on était en "loading" (auth pas encore prête), on route dès qu'authChecked arrive
  useEffect(()=>{
    if(authChecked && screen==="loading"){
      if(supabaseEnabled && !session && !skipAuth){ setScreen("auth"); return; }
      setScreen(user ? "app" : "onboarding");
    }
  },[authChecked, screen]);

  // Once a session arrives (e.g. Google redirect or email login), advance past auth
  useEffect(()=>{
    if(session?.user && screen==="auth"){
      setScreen(user ? "app" : "onboarding");
    }
  },[session?.user, screen]);

  const skipAuthAndContinue = ()=>{
    setSkipAuth(true);
    setScreen(user ? "app" : "onboarding");
  };

  // Save profile at end of onboarding
  const completeOnboarding = (u)=>{
    saveProfile(u);
    setUser(u);
    setScreen("app");
    // Lance le parcours guidé sauf s'il a été désactivé
    if(!tourDisabled()){ setTab("home"); setTourStep(0); }
  };

  // Lance le parcours guidé à chaque ouverture (si non désactivé) — une fois l'app affichée
  useEffect(()=>{
    if(screen==="app" && user && !tourDisabled() && tourStep===-1){
      // léger délai pour laisser l'app s'afficher
      const t = setTimeout(()=>{ setTab("home"); setTourStep(0); }, 400);
      return ()=>clearTimeout(t);
    }
  },[screen, user]);

  // ── Séquencement des pop-ups : un seul overlay à la fois ──
  // Priorité : parcours guidé (tourStep>=0) > DailyWelcome (streak).
  // Le DailyWelcome en file attend que le tour soit terminé et que l'app soit visible.
  useEffect(()=>{
    if(welcomeQueued && screen==="app" && tourStep===-1 && !showWelcome){
      const t = setTimeout(()=>{ setShowWelcome(true); setWelcomeQueued(false); }, 350);
      return ()=>clearTimeout(t);
    }
  },[welcomeQueued, screen, tourStep, showWelcome]);

  const tourNext = ()=>{
    const next = tourStep+1;
    if(next < TOUR_STEPS.length){ setTab(TOUR_STEPS[next].tab); setTourStep(next); }
  };
  const tourPrev = ()=>{
    const prev = tourStep-1;
    if(prev>=0){ setTab(TOUR_STEPS[prev].tab); setTourStep(prev); }
  };
  const tourSkip = ()=>{ setTourStep(-1); setTab("home"); };
  const tourFinish = ()=>{ if(tourDontShow) setTourDisabled(true); setTourStep(-1); setTab("home"); };
  const startTour = ()=>{ setTourDontShow(false); setTab("home"); setTourStep(0); };

  // Reset profile (called from Profile screen)
  const resetProfile = ()=>{
    clearProfile();
    setUser(null);
    setScreen("onboarding");
    setTab("home");
  };

  const deleteAccount = async ()=>{
    if(!confirm("Supprimer définitivement ton compte et toutes tes données ? Cette action est irréversible.")) return;
    if(!confirm("Dernière confirmation — toutes tes données (progression, voyages, favoris) seront effacées.")) return;
    // Supprimer les données Supabase si connecté
    if(session?.user && supabaseEnabled){
      try {
        await supabase.from("progress").delete().eq("user_id", session.user.id);
        await signOut();
      } catch(e){}
    }
    // Vider tout le localStorage
    const keys = ["isekaid_profile_v1","isekaid_streak_v1","isekaid_favs_v1","isekaid_unlocks_v1",
      "isekaid_scenarios_v1","isekaid_kana_v1","isekaid_ach_v1","isekaid_tour_off_v1",
      "isekaid_path_v1","isekaid_trips_v1","isekaid_theme_v1","isekaid_script_v1"];
    keys.forEach(k=>{ try { localStorage.removeItem(k); } catch {} });
    setUser(null); setSession(null); setScreen("auth"); setTab("home");
  };

  return(
    <div style={{width:"100%",height:"100dvh",display:"flex",alignItems:"center",justifyContent:"center",background:"#080604",fontFamily:"'Noto Sans JP','Helvetica Neue',sans-serif"}}>
      <style>{CSS}</style>
      <div style={{width:"min(100vw,390px)",height:"min(100dvh,844px)",position:"relative",overflow:"hidden",borderRadius:"clamp(0px,calc((100vw - 390px)*999),44px)",background:C.bg,boxShadow:"0 40px 120px rgba(0,0,0,.8),0 0 0 1px rgba(0,0,0,.08)",transition:"background .3s"}}>
        {screen==="loading"     && <div style={{position:"fixed",inset:0,background:"#0F0B08",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:32,animation:"flameFlicker 1s ease infinite"}}>異</div></div>}
        {screen==="splash"      &&<Splash onDone={afterSplash}/>}
        {screen==="auth"       &&<AuthScreen C={C}/>}
        {screen==="onboarding" &&<Onboarding onComplete={completeOnboarding} googleInfo={googleUserInfo(session)}/>}
        {screen==="app"&&user&&(
          <>
            <div style={{position:"absolute",inset:"0 0 72px 0",overflow:"hidden"}}>
              <div key={tab} className="screen-in" style={{height:"100%"}}>
              {tab==="home"      &&<HomeScreen      C={C} user={user} db={db} streak={streak} isFav={isFav} toggleFav={toggleFav} wikiMap={wikiMap} onWikiTap={setWikiEntry} script={script} toggleScript={toggleScript} onSearch={()=>setShowSearch(true)} onProfile={()=>setTab("profile")} mission={mission} onTask={completeTask} onGoTab={setTab} isPremium={isPremium}/>}
              {tab==="explore"   &&<ExploreScreen   C={C} db={db} isFav={isFav} toggleFav={toggleFav} wikiMap={wikiMap} onWikiTap={setWikiEntry} script={script} streak={streak} isUnlocked={isUnlocked} unlockCategory={unlockCategory} onOpenPremium={()=>setShowPremiumPage(true)}/>}
              {tab==="scenarios" &&<ScenariosScreen C={C} script={script} db={db} scenariosDone={scenProgress.done} completeScenario={completeScenario}/>}
              {tab==="learn"     &&<LearnScreen     C={C} script={script} db={db} kanaProgress={kanaProgress} onRecordKana={recordKanaResult} pathProgress={pathProgress} onCompleteStep={completePathStep} onMissionTrigger={completeTask}/>}
              {tab==="profile"   &&<ProfileScreen   C={C} user={user} dark={dark} setDark={setDark} db={db} onReset={resetProfile} onDeleteAccount={deleteAccount} onLogout={logout} session={session} streak={streak} favs={favs} toggleFav={toggleFav} xp={xp} rank={rank} kanaProgress={kanaProgress} unlocks={unlocks} scenProgress={scenProgress} onShowTour={startTour} pathProgress={pathProgress} isPremium={isPremium} onOpenPremium={()=>setShowPremiumPage(true)} accent={accent} chooseAccent={chooseAccent}/>}
              {tab==="voyage"    &&<VoyageScreen    C={C} user={user} db={db} script={script} session={session} isPremium={isPremium} onOpenPremium={()=>setShowPremiumPage(true)}/>}
              </div>
            </div>
            {/* Floating kanji/romaji toggle removed — now in HomeScreen header */}
            <BottomNav C={C} active={tab} onChange={setTab}/>
            {/* Parcours guidé contextuel */}
            {tourStep>=0 && <GuidedTour C={C} step={tourStep} onNext={tourNext} onPrev={tourPrev} onSkip={tourSkip} onFinish={tourFinish} dontShowAgain={tourDontShow} setDontShowAgain={setTourDontShow}/>}
            {/* Global wiki panel — available everywhere */}
            {wikiEntry && <WikiPanel C={C} entry={wikiEntry} onClose={()=>setWikiEntry(null)} script={script}/>}
            {/* Daily welcome popup — jamais pendant le parcours guidé */}
            {showWelcome && tourStep===-1 && <DailyWelcome C={C} streak={streak} dailyInfo={dailyInfo} isPremium={isPremium} onClose={()=>setShowWelcome(false)}/>}
            {missionReward && (
              <div onClick={()=>setMissionReward(false)} style={{position:"fixed",bottom:96,left:"50%",transform:"translateX(-50%)",zIndex:320,background:C.green,color:"#fff",padding:"13px 22px",borderRadius:24,fontSize:13,fontWeight:600,boxShadow:"0 6px 24px rgba(58,102,69,0.4)",animation:"fadeUp .35s ease",display:"flex",alignItems:"center",gap:9,whiteSpace:"nowrap"}}>
                🎯 Mission accomplie ! <span style={{opacity:0.9}}>Bravo 🎌</span>
              </div>
            )}
            {/* Global search */}
            {showSearch && <SearchScreen C={C} db={db} script={script} onClose={()=>setShowSearch(false)} onWikiTap={setWikiEntry}/>}
            {showPremiumPage && <PremiumPage C={C} isPremium={isPremium} premium={premium} onActivate={activatePremium} onCancel={cancelPremium} onClose={()=>setShowPremiumPage(false)} onRedeemCode={redeemCode} billingError={billingError} billingBusy={billingBusy} liveOfferings={liveOfferings} onRestore={restorePremium}/>}
            {/* Achievement unlocked */}
            {newAchievement && <AchievementPopup C={C} achievement={newAchievement} onClose={()=>setNewAchievement(null)}/>}
          </>
        )}
      </div>
    </div>
  );
}