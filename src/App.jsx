import DATA from "./japan-data.json";
import { useState, useEffect, useRef, useMemo } from "react";

// ─── Themes ───────────────────────────────────────────────────────────────────
const LIGHT = {
  bg:"#FAF7F2", s1:"#FFFFFF", s2:"#F3EDE3", s3:"#EAE2D6",
  text:"#1C1410", t2:"#7A6858", t3:"#A89880",
  red:"#C9463D", gold:"#9E7A1A", green:"#3A6645",
  border:"rgba(26,20,16,0.09)", navBg:"rgba(250,247,242,0.97)",
};
const DARK = {
  bg:"#0F0B08", s1:"#1A1410", s2:"#241C15", s3:"#2E231B",
  text:"#F0E6D3", t2:"#9C8A74", t3:"#5E4E3C",
  red:"#C9463D", gold:"#C9A84C", green:"#4E8060",
  border:"rgba(240,230,211,0.07)", navBg:"rgba(15,11,8,0.97)",
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
  songs:[
    {titre:"Plastic Love",artiste:"Mariya Takeuchi",genre:"City Pop",annee:"1984",histoire:"Sortie discrètement en 1984, cette chanson a resurgi avec force en 2017 grâce à un algorithme YouTube mystérieux. Sa basse irrésistible et la voix soyeuse de Takeuchi incarnent l'essence du City Pop tokyoïte.",pourquoi_japon:"Plastic Love capture l'âme de Tokyo la nuit — lumineuse, solitaire, magnifiquement superficielle et profondément mélancolique.",youtube_query:"Mariya Takeuchi Plastic Love 1984",emoji:"🌃"},
    {titre:"First Love",artiste:"Hikaru Utada",genre:"J-Pop",annee:"1999",histoire:"Album le plus vendu de l'histoire du Japon, First Love a fait d'Utada une icône à 16 ans. La chanson titre est une ballade pure sur les premières amours et la mélancolie du souvenir.",pourquoi_japon:"First Love capture la natsukashii — cette nostalgie douce-amère qui rend les souvenirs d'amour plus beaux dans la distance que dans leur vécu.",youtube_query:"Hikaru Utada First Love official",emoji:"💿"},
    {titre:"Sukiyaki",artiste:"Kyu Sakamoto",genre:"Enka",annee:"1961",histoire:"Première chanson japonaise à atteindre le numéro 1 aux États-Unis. Son vrai titre signifie 'Je marche la tête levée pour que mes larmes ne coulent pas'.",pourquoi_japon:"Elle incarne le stoïcisme japonais : sourire au monde même quand le cœur pleure, continuer à avancer la tête haute.",youtube_query:"Kyu Sakamoto Sukiyaki 上を向いて歩こう",emoji:"🌟"},
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
const BADGES = [{emoji:"🌸",label:"1er jour",unlocked:true},{emoji:"⛩️",label:"Culture x5",unlocked:false},{emoji:"🗣️",label:"1er scénario",unlocked:false},{emoji:"🔥",label:"7j streak",unlocked:false},{emoji:"🗾",label:"Tokyo unlock",unlocked:false},{emoji:"🏯",label:"Local-like",unlocked:false}];
const EXPLORE_MODS = [{emoji:"⛩️",title:"Traditions",sub:"Obon, Hanami, Hatsumōde…"},{emoji:"🏙️",title:"Vie quotidienne",sub:"Konbini, école, travail"},{emoji:"🤫",title:"Codes sociaux",sub:"Honne, tatemae, hiérarchie"},{emoji:"🗾",title:"Régions du Japon",sub:"Tokyo, Osaka, Kyoto, Okinawa"}];
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
@keyframes p1{0%{transform:translateY(-10px) rotate(0);opacity:0}10%{opacity:.55}90%{opacity:.2}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}
@keyframes p2{0%{transform:translateY(-10px) translateX(0) rotate(0);opacity:0}10%{opacity:.4}100%{transform:translateY(110vh) translateX(38px) rotate(-540deg);opacity:0}}
`;

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
            <div style={{fontSize:26,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:2}}>{script==="romaji"?entry.romaji:entry.jp}</div>
            <div style={{fontSize:12,color:color,fontStyle:"italic",marginBottom:2}}>{script==="romaji"?entry.jp:entry.romaji}</div>
            <div style={{fontSize:16,fontWeight:500,color:C.text}}>{entry.mot}</div>
          </div>
          <span style={{fontSize:9,padding:"4px 10px",background:`${color}18`,border:`1px solid ${color}44`,borderRadius:20,color,letterSpacing:".1em",marginTop:4}}>{entry.categorie}</span>
        </div>
        {/* Divider */}
        <div style={{height:1,background:C.border,marginBottom:14}}/>
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
      <div style={{fontSize:34,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,lineHeight:1.2,marginBottom:5}}>{script==="romaji"?data.romaji:data.expression}</div>
      <div style={{fontSize:12,color:C.gold,fontStyle:"italic",marginBottom:3}}>{data.romaji}</div>
      <div style={{fontSize:14,color:C.t2,fontWeight:500,marginBottom:13}}>{data.traduction}</div>
      <div style={{fontSize:13,color:C.t2,lineHeight:1.78,marginBottom:13}}>{wt(data.contexte)}</div>
      <div style={{padding:"11px 13px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8}}>
        <div style={{fontSize:9,color:C.gold,letterSpacing:".18em",marginBottom:6}}>EXEMPLE</div>
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
      <div style={{fontSize:32,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,lineHeight:1.2,marginBottom:5}}>{script==="romaji"?data.romaji:data.nom_jp} {data.emoji}</div>
      <div style={{fontSize:12,color:C.green,fontStyle:"italic",marginBottom:11}}>{data.romaji} — {data.traduction}</div>
      <p style={{fontSize:13,color:C.t2,lineHeight:1.8,marginBottom:12}}>{wt(data.description)}</p>
      <div style={{padding:"11px 13px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{fontSize:15,flexShrink:0}}>💡</span>
        <p style={{fontSize:12,color:C.t2,margin:0,lineHeight:1.6,fontStyle:"italic"}}>{wt(data.fun_fact)}</p>
      </div>
    </div>
  );
}

function SongCard({C,data,fav,onFav,wikiMap,onWikiTap}){
  if(!data) return null;
  const ytUrl=`https://www.youtube.com/results?search_query=${encodeURIComponent(data.youtube_query||data.titre+" "+data.artiste)}`;
  return(
    <div style={{borderRadius:14,overflow:"hidden",border:`1px solid ${C.border}`,animation:"fadeUp .4s ease"}}>
      <div style={{background:"linear-gradient(135deg,#221440 0%,#3D1628 55%,#142038 100%)",padding:"20px 18px 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:10,color:"rgba(240,230,211,0.5)",letterSpacing:".2em",textTransform:"uppercase"}}>🎵 Song of the day {data.emoji}</div>
          {onFav&&<button onClick={onFav} aria-label="Sauvegarder" style={{background:fav?"rgba(201,70,61,0.25)":"rgba(255,255,255,0.08)",border:`1px solid ${fav?"rgba(201,70,61,0.5)":"rgba(255,255,255,0.15)"}`,borderRadius:20,width:30,height:30,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,padding:0,color:fav?"#ff6b5e":"rgba(240,230,211,0.7)"}}>{fav?"♥":"♡"}</button>}
        </div>
        <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:16}}>
          <div style={{width:62,height:62,borderRadius:"50%",flexShrink:0,background:"radial-gradient(circle at 50%,#0a0a0a 18%,#252525 20%,#1a1a1a 48%,#252525 50%,#0d0d0d 100%)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 18px rgba(0,0,0,.55)",animation:"spin 5s linear infinite"}}>
            <div style={{width:11,height:11,borderRadius:"50%",background:"#C9463D"}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:17,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:"#F0E6D3",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{data.titre}</div>
            <div style={{fontSize:13,color:"rgba(240,230,211,0.6)",marginBottom:8}}>{data.artiste}</div>
            <div style={{display:"flex",gap:6}}>
              <span style={{fontSize:9,padding:"2px 9px",background:"rgba(240,230,211,0.1)",borderRadius:20,color:"rgba(240,230,211,0.7)"}}>{data.genre}</span>
              <span style={{fontSize:9,padding:"2px 9px",background:"rgba(240,230,211,0.06)",borderRadius:20,color:"rgba(240,230,211,0.4)"}}>{data.annee}</span>
            </div>
          </div>
        </div>
        <a href={ytUrl} target="_blank" rel="noreferrer" style={{display:"block",padding:"11px",background:"rgba(201,70,61,0.82)",borderRadius:9,textAlign:"center",color:"#fff",fontSize:13,textDecoration:"none",letterSpacing:".05em"}}>
          ▶ Écouter sur YouTube
        </a>
      </div>
      <div style={{background:C.s1,padding:"16px 18px"}}>
        <div style={{fontSize:9,color:"#8B6FB0",letterSpacing:".22em",marginBottom:9,textTransform:"uppercase"}}>Histoire de la chanson</div>
        <p style={{fontSize:13,color:C.t2,lineHeight:1.82,marginBottom:11}}>{data.histoire}</p>
        <div style={{padding:"10px 13px",background:C.s2,borderLeft:"3px solid #8B6FB0",borderRadius:"0 6px 6px 0"}}>
          <p style={{fontSize:11,color:C.t3,margin:0,fontStyle:"italic",lineHeight:1.65}}>{data.pourquoi_japon}</p>
        </div>
      </div>
    </div>
  );
}

function StreakSection({C,streak}){
  const count = streak?.count || 0;
  const best  = streak?.best  || 0;
  const dow=new Date().getDay(), todayIdx=dow===0?6:dow-1;
  const days=["L","M","M","J","V","S","D"];

  // Next milestone among common targets
  const milestones=[7,14,30,60,100,365];
  const nextGoal = milestones.find(m=>m>count) || count;
  const progress = Math.min(count/nextGoal,1);

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
            {count>=nextGoal ? "Record en cours ! 🎉" : `Prochain jalon : ${nextGoal} jours 🎯`}
          </div>
        </div>
        <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(201,70,61,0.08)",border:"1.5px solid rgba(201,70,61,0.22)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:count>0?"glow 2.5s ease infinite":"none"}}>
          <span style={{fontSize:22}}>🔥</span>
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:10,color:C.t3}}>Vers {nextGoal} jours consécutifs</span>
          <span style={{fontSize:11,color:C.red,fontWeight:500}}>{count} / {nextGoal}</span>
        </div>
        <div style={{height:4,background:C.s3,borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${progress*100}%`,background:C.red,borderRadius:2,transition:"width .5s ease"}}/>
        </div>
      </div>
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
      {/* Best streak record */}
      <div style={{paddingTop:14,borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>🏆</span>
          <span style={{fontSize:12,color:C.t2}}>Meilleur streak</span>
        </div>
        <span style={{fontSize:14,color:C.text,fontWeight:600}}>{best} jour{best>1?"s":""}</span>
      </div>
    </div>
  );
}

// ─── Wiki engine ──────────────────────────────────────────────────────────────
// Split text into segments, marking known wiki terms as tapable
function parseWikiText(text, wikiMap){
  if (!text || !wikiMap || Object.keys(wikiMap).length === 0)
    return [{type:"text", value:text}];
  const triggers = Object.keys(wikiMap).sort((a,b)=>b.length-a.length);
  const escaped = triggers.map(w => w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(pattern);
  return parts.filter(p => p !== "").map(part => {
    const entry = wikiMap[part.toLowerCase()];
    return entry ? {type:"wiki", value:part, term:entry} : {type:"text", value:part};
  });
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
function Slider({C, children}){
  const items = Array.isArray(children) ? children.filter(Boolean) : [children];
  const [idx, setIdx] = useState(0);
  const ref = useRef(null);

  const onScroll = ()=>{
    const el = ref.current;
    if(!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if(i !== idx) setIdx(i);
  };

  const goTo = (i)=>{
    const el = ref.current;
    if(!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setIdx(i);
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
function HomeScreen({C,user,db,streak,isFav,toggleFav,wikiMap,onWikiTap,script,toggleScript}){
  const [expr,  setExpr]  = useState(null);
  const [cult,  setCult]  = useState(null);
  const [repas, setRepas] = useState(null);
  const [song,  setSong]  = useState(null);
  const [streakFlip, setStreakFlip] = useState(false); // false=flamme, true=titre
  const loaded = useRef(false);

  // Auto-alternate streak badge every 3s
  useEffect(()=>{
    const t = setInterval(()=> setStreakFlip(f=>!f), 5000);
    return ()=> clearInterval(t);
  },[]);

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
    if(!which || which==="song") {
      setSong(  explore ? pick(db.songs)       : pickDaily(db.songs,       today, "song"));
    }
  };

  useEffect(() => {
    if(!loaded.current && db) { loaded.current=true; refresh(); } // initial = today's fixed content
  }, [db]);

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
      {/* Sticky header */}
      <div style={{padding:"50px 20px 14px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
        {/* Row 1 — date + badges alignés */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div>
            <div style={{fontSize:10,color:C.t3,letterSpacing:".2em",marginBottom:2}}>{month} {day}日（{weekday}）</div>
            <div style={{fontSize:11,color:C.t2}}>{g.fr}</div>
          </div>
          {/* Streak + script toggle alignés */}
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {/* Streak badge — alterne flamme / titre app */}
            <div onClick={()=>setStreakFlip(f=>!f)} style={{display:"flex",alignItems:"center",gap:3,padding:"4px 9px",background:"rgba(201,70,61,0.08)",border:"1px solid rgba(201,70,61,0.2)",borderRadius:20,cursor:"pointer",minWidth:44,justifyContent:"center",transition:"all .3s"}}>
              {streakFlip
                ? <span style={{fontSize:10,fontFamily:"'Noto Serif JP',serif",color:C.red,fontWeight:500,letterSpacing:".04em"}}>異世界</span>
                : <><span style={{fontSize:11}}>🔥</span><span style={{fontSize:11,color:C.text,fontWeight:600}}>{streak?.count||0}</span></>
              }
            </div>
            {/* Script toggle — aligné avec le streak */}
            <button onClick={toggleScript} style={{padding:"4px 10px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:20,cursor:"pointer",fontFamily:"'Noto Serif JP',serif",fontSize:12,color:C.t2,lineHeight:1}}>
              {script==="kanji" ? "あ" : "A"}
            </button>
          </div>
        </div>
        {/* Row 2 — salutation japonaise */}
        <div style={{fontSize:21,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text}}>{g.jp}</div>
      </div>

      <div style={{padding:"18px 20px 110px"}}>
        {/* Section 1 — Daily Japan (slider) */}
        <SH C={C} kanji="日" title="Daily Japan" sub="Ta sélection du jour" onRefresh={()=>refresh("daily",true)}/>
        <div style={{marginBottom:28}}>
          {db ? (
            <Slider C={C}>
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

        {/* Section 2 — Song of the Day */}
        <SH C={C} kanji="音" title="Song of the Day" sub="Musique japonaise du jour" onRefresh={()=>refresh("song",true)}/>
        <div style={{marginBottom:28}}>
          <SongCard C={C} data={song} fav={song&&isFav("song",song)} onFav={song&&(()=>toggleFav("song",song))} wikiMap={wikiMap} onWikiTap={onWikiTap}/>
        </div>

        {/* Section 3 — Streak */}
        <SH C={C} kanji="火" title="Streak & Fidélisation" sub="Ta progression quotidienne"/>
        <StreakSection C={C} streak={streak}/>
      </div>
    </div>
  );
}

// ─── Other screens
function ExploreScreen({C,db,isFav,toggleFav,wikiMap,onWikiTap,script,streak,isUnlocked,unlockCategory}){
  const [view,setView] = useState(null);
  const [confirmCat,setConfirmCat] = useState(null); // category pending unlock confirm
  const [toast,setToast] = useState(null);

  if(view==="traditions") return <TraditionsScreen C={C} db={db} isFav={isFav} toggleFav={toggleFav} wikiMap={wikiMap} onWikiTap={onWikiTap} script={script}/>;
  if(view==="codes")      return <CodesScreen C={C} db={db} isFav={isFav} toggleFav={toggleFav} wikiMap={wikiMap} onWikiTap={onWikiTap} script={script}/>;
  if(view==="regions")    return <RegionsScreen C={C} db={db} isFav={isFav} toggleFav={toggleFav} wikiMap={wikiMap} onWikiTap={onWikiTap} script={script}/>;
  if(view==="vie")        return <VieScreen C={C} db={db} isFav={isFav} toggleFav={toggleFav} wikiMap={wikiMap} onWikiTap={onWikiTap} script={script}/>;

  // module title → {route, catKey}
  const MODS = {
    "Traditions":      {route:"traditions",  cat:"traditions"},
    "Vie quotidienne": {route:"vie",         cat:"vie_quotidienne"},
    "Codes sociaux":   {route:"codes",       cat:"codes_sociaux"},
    "Régions du Japon":{route:"regions",     cat:"regions"},
  };
  const keys = streak?.keys || 0;

  const tryOpen = (m)=>{
    const def = MODS[m.title];
    if(!def) return;
    if(isUnlocked(def.cat)) { setView(def.route); return; }
    setConfirmCat(def.cat); // show unlock confirm
  };
  const doUnlock = (catKey)=>{
    const res = unlockCategory(catKey);
    setConfirmCat(null);
    if(res.ok){ setToast("Catégorie débloquée ! 🎉"); setTimeout(()=>setToast(null),2200); }
    else if(res.reason==="keys"){ setToast("Pas assez de clés 🔑"); setTimeout(()=>setToast(null),2200); }
  };

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 110px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
          <div>
            <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>探 · EXPLORER</div>
            <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text}}>{script==="romaji"?"Bunka wo sagasu":"文化を探す"}</div>
          </div>
          {/* Key balance */}
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",background:"rgba(201,70,61,0.07)",border:"1px solid rgba(201,70,61,0.2)",borderRadius:20}}>
            <span style={{fontSize:14}}>🔑</span>
            <span style={{fontSize:14,fontWeight:700,color:C.text}}>{keys}</span>
          </div>
        </div>
        <div style={{fontSize:13,color:C.t2,marginBottom:22}}>Débloque les catégories avec tes clés 🔑</div>

        <div style={{display:"flex",flexDirection:"column",gap:11}}>
          {EXPLORE_MODS.map((m,i)=>{
            const def = MODS[m.title];
            const unlocked = def && isUnlocked(def.cat);
            const lockDef = def && LOCKABLE[def.cat];
            return(
              <div key={i} onClick={()=>tryOpen(m)} style={{position:"relative",background:C.s1,border:`1px solid ${unlocked?"rgba(201,70,61,0.3)":C.border}`,borderRadius:14,padding:"18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",transition:"all .2s",overflow:"hidden"}}>
                <span style={{fontSize:28,flexShrink:0,filter:unlocked?"none":"grayscale(0.6) opacity(0.7)"}}>{m.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,color:C.text,marginBottom:3}}>{m.title}</div>
                  <div style={{fontSize:12,color:C.t2}}>{m.sub}</div>
                </div>
                {unlocked
                  ? <span style={{fontSize:10,padding:"3px 10px",background:"rgba(201,70,61,0.1)",border:"1px solid rgba(201,70,61,0.25)",borderRadius:20,color:C.red,whiteSpace:"nowrap"}}>Disponible</span>
                  : <span style={{fontSize:11,padding:"4px 11px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:20,color:C.t2,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>🔒 {lockDef?.cost} 🔑</span>}
                <div style={{fontSize:16,color:C.t3}}>{unlocked?"›":""}</div>
              </div>
            );
          })}
        </div>

        <div style={{marginTop:18,padding:"14px 16px",background:C.s2,border:`1px dashed ${C.border}`,borderRadius:12,fontSize:12,color:C.t3,lineHeight:1.6}}>
          🔑 Tu gagnes <b style={{color:C.t2}}>1 clé par jour</b> de connexion. Utilise-les pour débloquer des catégories — chaque déblocage améliore ton titre.
        </div>
      </div>

      {/* Unlock confirm modal */}
      {confirmCat && (()=>{
        const def = LOCKABLE[confirmCat];
        const enough = keys >= def.cost;
        return(
          <>
            <div onClick={()=>setConfirmCat(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200}}/>
            <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"min(100vw,390px)",zIndex:201,background:C.s1,borderRadius:"20px 20px 0 0",padding:"0 22px 36px",animation:"slideUp .25s ease"}}>
              <div style={{width:36,height:4,borderRadius:2,background:C.s3,margin:"12px auto 20px"}}/>
              <div style={{textAlign:"center",fontSize:40,marginBottom:10}}>{def.emoji}</div>
              <div style={{textAlign:"center",fontSize:18,color:C.text,fontWeight:500,marginBottom:6}}>Débloquer « {def.label} »</div>
              <div style={{textAlign:"center",fontSize:13,color:C.t2,lineHeight:1.6,marginBottom:18}}>
                Coût : <b style={{color:C.red}}>{def.cost} 🔑</b> · Tu as <b>{keys} 🔑</b><br/>
                Rapporte <b style={{color:C.green}}>+{def.xp} XP</b> vers ton prochain titre
              </div>
              <button onClick={()=>enough&&doUnlock(confirmCat)} disabled={!enough} style={{width:"100%",padding:"14px",background:enough?C.red:C.s3,border:"none",borderRadius:12,color:enough?"#fff":C.t3,fontSize:14,fontWeight:600,cursor:enough?"pointer":"not-allowed",marginBottom:9}}>
                {enough ? `Débloquer pour ${def.cost} 🔑` : `Il te manque ${def.cost-keys} clé(s)`}
              </button>
              {!enough && <div style={{textAlign:"center",fontSize:11,color:C.t3,marginBottom:4}}>Reviens demain pour gagner +1 clé 🔥</div>}
              <button onClick={()=>setConfirmCat(null)} style={{width:"100%",padding:"11px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:13,cursor:"pointer"}}>Plus tard</button>
            </div>
          </>
        );
      })()}

      {/* Toast */}
      {toast && <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:210,background:C.text,color:C.bg,padding:"11px 20px",borderRadius:24,fontSize:13,fontWeight:500,boxShadow:"0 4px 20px rgba(0,0,0,0.3)",animation:"fadeUp .3s ease"}}>{toast}</div>}
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
                  <div style={{fontSize:16,fontFamily:"'Noto Serif JP',serif",color:C.text,marginBottom:2}}>{script==="romaji"?w.romaji:w.jp}</div>
                  <div style={{fontSize:11,color:C.gold,fontStyle:"italic",marginBottom:2}}>{script==="romaji"?w.jp:w.romaji}</div>
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
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:3}}>{script==="romaji"?"Nichijō seikatsu":"日常生活"}</div>
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
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:3}}>{script==="romaji"?"Nihon no chihō":"日本の地方"}</div>
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
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:3}}>{script==="romaji"?"Anmoku no rūru":"暗黙のルール"}</div>
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

function TraditionsScreen({C,db,isFav,toggleFav,wikiMap,onWikiTap,script}){
  const [season,setSeason] = useState("printemps");
  const [selected,setSelected] = useState(null);
  const traditions = db?.traditions || [];

  if(selected) return <TraditionDetail C={C} t={selected} onBack={()=>setSelected(null)} fav={isFav&&isFav("tradition",selected)} onFav={toggleFav&&(()=>toggleFav("tradition",selected))} wikiMap={wikiMap} onWikiTap={onWikiTap} script={script}/>;

  const seasonData = SEASONS.find(s=>s.id===season);
  const filtered = traditions.filter(t=>t.saison===season);

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 12px"}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>暦 · TRADITIONS</div>
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:3}}>{script==="romaji"?"Nenchū gyōji":"年中行事"}</div>
        <div style={{fontSize:13,color:C.t2,marginBottom:18}}>Le calendrier des traditions japonaises</div>
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
      <div style={{padding:"0 20px 110px",display:"flex",flexDirection:"column",gap:11}}>
        {filtered.map((t,i)=>(
          <div key={i} onClick={()=>setSelected(t)} style={{
            background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 16px",
            display:"flex",alignItems:"center",gap:14,cursor:"pointer",transition:"all .2s",animation:"fadeUp .4s ease"
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

function ScenariosScreen({C,script}){
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 110px"}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>場 · SCÉNARIOS</div>
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:3}}>{script==="romaji"?"Shinario":"シナリオ"}</div>
        <div style={{fontSize:13,color:C.t2,marginBottom:22}}>Simulations de situations réelles</div>
        <div style={{display:"flex",flexDirection:"column",gap:11}}>
          {SCENS.map((s,i)=>(
            <div key={i} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px",display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:28,flexShrink:0}}>{s.emoji}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,color:C.text,marginBottom:5}}>{s.title}</div>
                <span style={{fontSize:9,padding:"2px 8px",border:`1px solid ${s.color}55`,borderRadius:20,color:s.color}}>{s.diff}</span>
              </div>
              <div style={{fontSize:11,color:C.t3}}>Bientôt</div>
            </div>
          ))}
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
    <div style={{padding:"40px 24px",textAlign:"center"}}>
      <div style={{fontSize:54,marginBottom:14}}>{score/cards.length>=0.8?"🏆":score/cards.length>=0.5?"👍":"📚"}</div>
      <div style={{fontSize:20,color:C.text,fontWeight:500,marginBottom:8}}>Quiz terminé !</div>
      <div style={{fontSize:14,color:C.t2,marginBottom:26}}>Score : <b style={{color:C.red}}>{score}</b> / {cards.length}</div>
      <button onClick={onExit} style={{width:"100%",padding:"14px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Retour</button>
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
          let bg=C.s1, bd=C.border, col=C.text;
          if(picked){
            if(opt.r===card.r){ bg="rgba(78,128,96,0.15)"; bd="rgba(78,128,96,0.4)"; col=C.green; }
            else if(opt.r===picked){ bg="rgba(201,70,61,0.12)"; bd="rgba(201,70,61,0.4)"; col=C.red; }
          }
          return(
            <button key={i} onClick={()=>choose(opt)} style={{padding:"18px",background:bg,border:`1px solid ${bd}`,borderRadius:14,color:col,fontSize:20,fontWeight:600,cursor:picked?"default":"pointer",transition:"all .2s"}}>
              {opt.r}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const LEARN_DECKS = [
  {id:"hira", label:"Hiragana", jp:"ひらがな", emoji:"あ", deck:HIRAGANA, desc:"46 caractères de base · mots japonais"},
  {id:"kata", label:"Katakana", jp:"カタカナ", emoji:"ア", deck:KATAKANA, desc:"46 caractères de base · mots étrangers"},
];

function LearnScreen({C,script}){
  const [deck,setDeck] = useState(null);   // selected deck object
  const [mode,setMode] = useState(null);   // "flash" | "quiz"

  // Active session
  if(deck && mode){
    return(
      <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
        <div style={{padding:"50px 20px 6px"}}>
          <button onClick={()=>setMode(null)} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.t2,fontSize:12,cursor:"pointer"}}>‹ {deck.label}</button>
        </div>
        {mode==="flash" ? <FlashcardMode C={C} deck={deck.deck} onExit={()=>setMode(null)}/>
                        : <QuizMode      C={C} deck={deck.deck} onExit={()=>setMode(null)}/>}
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
              <div style={{flex:1}}><div style={{fontSize:15,color:C.text,fontWeight:500,marginBottom:2}}>Flashcards</div><div style={{fontSize:12,color:C.t2}}>Vois le caractère, devine, retourne pour vérifier</div></div>
              <span style={{fontSize:18,color:C.t3}}>›</span>
            </div>
            <div onClick={()=>setMode("quiz")} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer"}}>
              <span style={{fontSize:30}}>✍️</span>
              <div style={{flex:1}}><div style={{fontSize:15,color:C.text,fontWeight:500,marginBottom:2}}>Quiz</div><div style={{fontSize:12,color:C.t2}}>Choisis la bonne lecture parmi 4 options</div></div>
              <span style={{fontSize:18,color:C.t3}}>›</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Deck selection (home)
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 110px"}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>学 · APPRENDRE</div>
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:3}}>{script==="romaji"?"Nihongo wo manabu":"日本語を学ぶ"}</div>
        <div style={{fontSize:13,color:C.t2,marginBottom:22}}>Apprends à lire le japonais</div>

        <div style={{fontSize:10,color:C.t3,letterSpacing:".2em",marginBottom:12,textTransform:"uppercase"}}>🔤 Les syllabaires</div>
        <div style={{display:"flex",flexDirection:"column",gap:11}}>
          {LEARN_DECKS.map((d,i)=>(
            <div key={i} onClick={()=>setDeck(d)} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px",display:"flex",alignItems:"center",gap:16,cursor:"pointer",animation:"fadeUp .4s ease"}}>
              <span style={{fontSize:40,fontFamily:"'Noto Serif JP',serif",color:C.red,width:48,textAlign:"center"}}>{d.emoji}</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={{fontSize:16,color:C.text,fontWeight:500}}>{d.label}</span><span style={{fontSize:12,color:C.t3,fontFamily:"'Noto Serif JP',serif"}}>{d.jp}</span></div>
                <div style={{fontSize:12,color:C.t2,marginTop:3}}>{d.desc}</div>
              </div>
              <span style={{fontSize:18,color:C.t3}}>›</span>
            </div>
          ))}
        </div>

        <div style={{marginTop:18,padding:"14px 16px",background:C.s2,border:`1px dashed ${C.border}`,borderRadius:12,fontSize:12,color:C.t3,lineHeight:1.6}}>
          💡 Commence par l'hiragana, c'est la base du japonais. Le katakana s'utilise pour les mots empruntés (コーヒー = coffee).
        </div>
      </div>
    </div>
  );
}

function ProfileScreen({C,user,dark,setDark,db,onReset,streak,favs,toggleFav,xp,rank}){
  const lvlL={beginner:"Débutant",intermediate:"Intermédiaire",advanced:"Avancé"};
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
          <div style={{width:50,height:50,borderRadius:"50%",background:"rgba(201,70,61,0.1)",border:"2px solid rgba(201,70,61,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontFamily:"'Noto Serif JP',serif",color:C.red,flexShrink:0}}>
            {(user.name||"V")[0].toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,color:C.text,marginBottom:4}}>{user.name}</div>
            <div style={{fontSize:12,color:C.text,fontWeight:500}}>{tier.emoji} {tier.title} <span style={{fontSize:11,color:C.t3,fontFamily:"'Noto Serif JP',serif"}}>{tier.jp}</span></div>
          </div>
        </div>

        {/* XP / Title progress */}
        <div style={{marginBottom:14,padding:"16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <span style={{fontSize:16}}>⭐</span>
              <span style={{fontSize:13,color:C.text,fontWeight:600}}>{xp||0} XP</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:"rgba(201,70,61,0.07)",border:"1px solid rgba(201,70,61,0.18)",borderRadius:20}}>
              <span style={{fontSize:12}}>🔑</span><span style={{fontSize:12,fontWeight:700,color:C.text}}>{streak?.keys||0}</span>
            </div>
          </div>
          <div style={{height:6,background:C.s3,borderRadius:3,overflow:"hidden",marginBottom:7}}>
            <div style={{height:"100%",width:`${progress*100}%`,background:`linear-gradient(90deg,${C.gold},${C.red})`,borderRadius:3,transition:"width .5s"}}/>
          </div>
          <div style={{fontSize:11,color:C.t3}}>
            {nextTier ? <>Prochain titre : <b style={{color:C.t2}}>{nextTier.emoji} {nextTier.title}</b> à {nextTier.min} XP</> : "Titre maximal atteint ! 🎌"}
          </div>
        </div>
        {/* Theme toggle */}
        <div style={{marginBottom:16,padding:"16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:13,color:C.text,marginBottom:2}}>{dark?"Mode sombre 🌙":"Mode clair ☀️"}</div>
            <div style={{fontSize:11,color:C.t3}}>Basculer le thème de l'app</div>
          </div>
          <div onClick={()=>setDark(d=>!d)} style={{width:48,height:26,borderRadius:13,background:dark?C.red:"rgba(26,20,16,0.14)",cursor:"pointer",position:"relative",transition:"background .25s",flexShrink:0}}>
            <div style={{position:"absolute",top:3,left:dark?22:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left .25s",boxShadow:"0 1px 4px rgba(0,0,0,.22)"}}/>
          </div>
        </div>
        {/* DB stats */}
        {db && (
          <div style={{marginBottom:16,padding:"14px 16px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:12,display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:20}}>📚</span>
            <div>
              <div style={{fontSize:12,color:C.text,fontWeight:500}}>{total} contenus chargés</div>
              <div style={{fontSize:10,color:C.t3}}>depuis japan-data.json — aucun appel API</div>
            </div>
            <span style={{marginLeft:"auto",fontSize:14}}>✅</span>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          {[
            {v:String(streak?.count||0),label:"Streak",emoji:"🔥"},
            {v:total||"—",label:"Contenus",emoji:"📖"},
            {v:lvlL[user.level]||"Débutant",label:"Niveau",emoji:"🎯"},
            {v:goalL[user.goal]||"Immersion",label:"Objectif",emoji:"🗾"},
          ].map((s,i)=>(
            <div key={i} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,padding:"15px 13px"}}>
              <div style={{fontSize:18,marginBottom:4}}>{s.emoji}</div>
              <div style={{fontSize:15,color:C.text,fontWeight:500,marginBottom:1}}>{s.v}</div>
              <div style={{fontSize:10,color:C.t3,letterSpacing:".07em"}}>{s.label}</div>
            </div>
          ))}
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
                song:{emoji:it.emoji||"🎵", title:it.titre, sub:it.artiste, c:"#8B6FB0"},
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

        <div style={{fontSize:10,color:C.t3,letterSpacing:".22em",marginBottom:11,textTransform:"uppercase"}}>Collection de badges</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {BADGES.map((b,i)=>(
            <div key={i} style={{background:C.s1,border:`1px solid ${b.unlocked?"rgba(201,70,61,.28)":C.border}`,borderRadius:12,padding:"13px",textAlign:"center",opacity:b.unlocked?1:.5}}>
              <div style={{fontSize:24,marginBottom:5}}>{b.emoji}</div>
              <div style={{fontSize:11,color:b.unlocked?C.text:C.t3}}>{b.label}</div>
              {!b.unlocked&&<div style={{fontSize:9,color:C.t3,marginTop:2}}>🔒</div>}
            </div>
          ))}
        </div>

        {/* Réinitialiser le profil */}
        <button onClick={()=>{ if(confirm("Réinitialiser ton profil ? Tu repasseras par l'onboarding.")) onReset&&onReset(); }}
          style={{marginTop:22,width:"100%",padding:"13px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:13,cursor:"pointer",letterSpacing:".03em"}}>
          ↺ Réinitialiser le profil
        </button>
        <div style={{marginTop:10,textAlign:"center",fontSize:10,color:C.t3,lineHeight:1.5}}>
          Ton profil est sauvegardé sur cet appareil —<br/>l'onboarding ne réapparaîtra qu'après réinitialisation.
        </div>
      </div>
    </div>
  );
}
const TABS=[{id:"home",kanji:"家",label:"Home"},{id:"explore",kanji:"探",label:"Explorer"},{id:"scenarios",kanji:"場",label:"Scénarios"},{id:"learn",kanji:"学",label:"Apprendre"},{id:"profile",kanji:"人",label:"Profil"}];
// ─── Daily welcome popup (streak + clé) ───────────────────────────────────────
function DailyWelcome({C, streak, onClose}){
  const count = streak?.count || 0;
  const keys = streak?.keys || 0;
  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:300,backdropFilter:"blur(3px)"}}/>
      <div style={{
        position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        width:"min(86vw,340px)", zIndex:301, background:C.s1,
        borderRadius:22, padding:"32px 26px 26px", textAlign:"center",
        animation:"popIn .35s cubic-bezier(.2,.9,.3,1.3)",
        boxShadow:"0 24px 80px rgba(0,0,0,0.4)", border:`1px solid ${C.border}`
      }}>
        {/* Flame */}
        <div style={{fontSize:60,marginBottom:6,animation:"glow 2s ease infinite"}}>🔥</div>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".25em",textTransform:"uppercase",marginBottom:6}}>Content de te revoir</div>
        <div style={{fontSize:30,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:2}}>
          {count} jour{count>1?"s":""}
        </div>
        <div style={{fontSize:13,color:C.t2,marginBottom:22}}>de streak consécutif{count>1?"s":""} 🎌</div>

        {/* Key reward */}
        <div style={{padding:"16px",background:"rgba(201,70,61,0.07)",border:"1px solid rgba(201,70,61,0.2)",borderRadius:14,marginBottom:22}}>
          <div style={{fontSize:38,marginBottom:6,animation:"popIn .5s ease .2s both"}}>🔑</div>
          <div style={{fontSize:14,color:C.text,fontWeight:600,marginBottom:3}}>+1 clé gagnée !</div>
          <div style={{fontSize:12,color:C.t2}}>Tu as maintenant <b style={{color:C.red}}>{keys} clé{keys>1?"s":""}</b> à dépenser</div>
        </div>

        <button onClick={onClose} style={{width:"100%",padding:"14px",background:C.red,border:"none",borderRadius:12,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>
          Continuer l'aventure →
        </button>
      </div>
    </>
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
function Onboarding({onComplete}){
  const C=LIGHT;
  const [step,setStep]=useState(0);
  const [why,setWhy]=useState([]);
  const [goal,setGoal]=useState("");
  const [level,setLevel]=useState("");
  const [name,setName]=useState("");
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
              <div style={{fontSize:11,color:C.t3,marginBottom:8,letterSpacing:".12em"}}>Ton prénom (optionnel)</div>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex : Léa" style={{background:"rgba(26,20,16,0.04)",border:`1px solid ${C.border}`,color:C.text}}/>
            </div>
          </div>
        )}
      </div>
      <div style={{padding:"14px 26px 34px",flexShrink:0}}>
        <button onClick={()=>step<2?setStep(s=>s+1):onComplete({why,goal,level,name:name||"Voyageur"})} disabled={!ok}
          style={{width:"100%",padding:"15px",background:ok?C.red:"rgba(26,20,16,0.08)",border:"none",borderRadius:12,color:ok?"#fff":C.t3,fontSize:15,cursor:ok?"pointer":"default",letterSpacing:".04em",transition:"all .2s"}}>
          {step<2?"Continuer →":"Commencer l'aventure 🌸"}
        </button>
      </div>
    </div>
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
const THEME_KEY = "isekaid_theme_v1";
function loadProfile(){
  try { const raw = localStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
function saveProfile(u){
  try { localStorage.setItem(STORE_KEY, JSON.stringify(u)); } catch {}
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
function loadScript(){
  try { return localStorage.getItem(SCRIPT_KEY) === "romaji" ? "romaji" : "kanji"; }
  catch { return "kanji"; }
}
function saveScript(mode){
  try { localStorage.setItem(SCRIPT_KEY, mode); } catch {}
}

// ─── Streak logic ─────────────────────────────────────────────────────────────
const STREAK_KEY = "isekaid_streak_v1";
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
// Returns { count, best, last, keys } updated for "today"
function touchStreak(){
  const today = dayKey();
  let s = loadStreak();
  let gainedKey = false;
  if(!s || !s.last){
    s = { count:1, best:1, last:today, keys:1, totalKeysEarned:1 };
    gainedKey = true;
  } else if(s.last === today){
    // already counted today — no change, ensure keys fields exist
    if(s.keys===undefined) s.keys = 0;
    if(s.totalKeysEarned===undefined) s.totalKeysEarned = s.keys;
  } else {
    const gap = daysBetween(s.last, today);
    if(gap === 1) s.count += 1;        // consecutive day
    else if(gap >= 2) s.count = 1;     // streak broken (keys are kept!)
    s.last = today;
    if(s.count > (s.best||0)) s.best = s.count;
    // +1 key per active day
    s.keys = (s.keys||0) + 1;
    s.totalKeysEarned = (s.totalKeysEarned||0) + 1;
    gainedKey = true;
  }
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(s)); } catch {}
  return {...s, gainedKey};
}
function saveStreak(s){
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(s)); } catch {}
}

// ─── Progression : déblocages & XP ────────────────────────────────────────────
const UNLOCK_KEY = "isekaid_unlocks_v1";
// Catégories verrouillables : coût en clés + XP accordé
const LOCKABLE = {
  traditions:    {label:"Traditions",      emoji:"⛩️", cost:0, xp:100, free:true},
  vie_quotidienne:{label:"Vie quotidienne", emoji:"🏙️", cost:1, xp:120, free:false},
  codes_sociaux: {label:"Codes sociaux",   emoji:"🤫", cost:5, xp:150, free:false},
  regions:       {label:"Régions du Japon",emoji:"🗾", cost:5, xp:150, free:false},
};
// Paliers de titres selon l'XP total
const TITLES = [
  {min:0,    title:"Curieux du Japon",   jp:"興味",   emoji:"🌱"},
  {min:100,  title:"Voyageur novice",    jp:"旅人",   emoji:"🎒"},
  {min:250,  title:"Explorateur",        jp:"探検家", emoji:"🧭"},
  {min:400,  title:"Initié culturel",    jp:"文化人", emoji:"🎴"},
  {min:520,  title:"Connaisseur",        jp:"通",     emoji:"🏮"},
  {min:9999, title:"Maître du Japon",    jp:"達人",   emoji:"🎌"},
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
function computeXP(unlocks){
  let xp = 0;
  Object.keys(unlocks||{}).forEach(k=>{ if(unlocks[k] && LOCKABLE[k]) xp += LOCKABLE[k].xp; });
  return xp;
}
function titleForXP(xp){
  let t = TITLES[0];
  for(const tier of TITLES){ if(xp >= tier.min) t = tier; }
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
  const [tab,setTab]=useState("home");
  const [user,setUser]=useState(()=>loadProfile());   // read saved profile immediately
  const [dark,setDark]=useState(()=>loadTheme());
  const [db,setDb]=useState(null);
  const [streak,setStreak]=useState(()=>loadStreak()||{count:0,best:0,last:null,keys:0});
  const [favs,setFavs]=useState(()=>loadFavs());
  const [unlocks,setUnlocks]=useState(()=>getUnlocks());

  const xp = computeXP(unlocks);
  const rank = titleForXP(xp);

  // Unlock a category: spend keys, grant XP via unlock state
  const unlockCategory = (catKey)=>{
    const def = LOCKABLE[catKey];
    if(!def || unlocks[catKey]) return {ok:false, reason:"already"};
    if((streak.keys||0) < def.cost) return {ok:false, reason:"keys"};
    // spend keys
    const newStreak = {...streak, keys:(streak.keys||0)-def.cost};
    setStreak(newStreak); saveStreak(newStreak);
    // unlock
    const newUnlocks = {...unlocks, [catKey]:true};
    setUnlocks(newUnlocks); saveUnlocks(newUnlocks);
    return {ok:true};
  };
  const isUnlocked = (catKey)=> !LOCKABLE[catKey] || !!unlocks[catKey];
  const [wikiEntry,setWikiEntry]=useState(null);
  const [showWelcome,setShowWelcome]=useState(false);
  const [wikiMap,setWikiMap]=useState({});
  const [script,setScript]=useState(()=>loadScript());

  const isFav = (type,item)=> favs.some(f=>f.id===favId(type,item));
  const toggleFav = (type,item)=>{
    const id = favId(type,item);
    setFavs(prev=>{
      const exists = prev.some(f=>f.id===id);
      const next = exists ? prev.filter(f=>f.id!==id)
                          : [{id, type, item, savedAt:Date.now()}, ...prev];
      saveFavs(next);
      return next;
    });
  };
  const C=dark?DARK:LIGHT;

  // Load content data on startup
  useEffect(()=>{
    setDb(DATA);
    const s = touchStreak();
    setStreak(s);
    setWikiMap(buildWikiMap(DATA.wiki));
    if(s.gainedKey) setShowWelcome(true); // show daily popup only when a key was earned
  },[]);

  // Persist theme whenever it changes
  useEffect(()=>{ saveTheme(dark); },[dark]);
  useEffect(()=>{ saveScript(script); },[script]);
  const toggleScript = ()=> setScript(s=> s==="kanji" ? "romaji" : "kanji");

  // When splash finishes: skip onboarding if a profile is already loaded
  const afterSplash = ()=>{
    setScreen(user ? "app" : "onboarding");
  };

  // Save profile at end of onboarding
  const completeOnboarding = (u)=>{
    saveProfile(u);
    setUser(u);
    setScreen("app");
  };

  // Reset profile (called from Profile screen)
  const resetProfile = ()=>{
    clearProfile();
    setUser(null);
    setScreen("onboarding");
    setTab("home");
  };

  return(
    <div style={{width:"100%",height:"100dvh",display:"flex",alignItems:"center",justifyContent:"center",background:"#080604",fontFamily:"'Noto Sans JP','Helvetica Neue',sans-serif"}}>
      <style>{CSS}</style>
      <div style={{width:"min(100vw,390px)",height:"min(100dvh,844px)",position:"relative",overflow:"hidden",borderRadius:"clamp(0px,calc((100vw - 390px)*999),44px)",background:C.bg,boxShadow:"0 40px 120px rgba(0,0,0,.8),0 0 0 1px rgba(0,0,0,.08)",transition:"background .3s"}}>
        {screen==="splash"     &&<Splash onDone={afterSplash}/>}
        {screen==="onboarding" &&<Onboarding onComplete={completeOnboarding}/>}
        {screen==="app"&&user&&(
          <>
            <div style={{position:"absolute",inset:"0 0 72px 0",overflow:"hidden"}}>
              {tab==="home"      &&<HomeScreen      C={C} user={user} db={db} streak={streak} isFav={isFav} toggleFav={toggleFav} wikiMap={wikiMap} onWikiTap={setWikiEntry} script={script} toggleScript={toggleScript}/>}
              {tab==="explore"   &&<ExploreScreen   C={C} db={db} isFav={isFav} toggleFav={toggleFav} wikiMap={wikiMap} onWikiTap={setWikiEntry} script={script} streak={streak} isUnlocked={isUnlocked} unlockCategory={unlockCategory}/>}
              {tab==="scenarios" &&<ScenariosScreen C={C} script={script}/>}
              {tab==="learn"     &&<LearnScreen     C={C} script={script}/>}
              {tab==="profile"   &&<ProfileScreen   C={C} user={user} dark={dark} setDark={setDark} db={db} onReset={resetProfile} streak={streak} favs={favs} toggleFav={toggleFav} xp={xp} rank={rank}/>}
            </div>
            {/* Floating kanji/romaji toggle removed — now in HomeScreen header */}
            <BottomNav C={C} active={tab} onChange={setTab}/>
            {/* Global wiki panel — available everywhere */}
            {wikiEntry && <WikiPanel C={C} entry={wikiEntry} onClose={()=>setWikiEntry(null)} script={script}/>}
            {/* Daily welcome popup */}
            {showWelcome && <DailyWelcome C={C} streak={streak} onClose={()=>setShowWelcome(false)}/>}
          </>
        )}
      </div>
    </div>
  );
}
