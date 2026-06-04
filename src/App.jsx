import DATA from "./japan-data.json";
import { useState, useEffect, useRef } from "react";

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
          <span style={{fontSize:12}}>↻</span> Nouveau
        </button>
      )}
    </div>
  );
}

// ─── Content cards ────────────────────────────────────────────────────────────
function ExprCard({C,data}){
  if(!data) return null;
  return(
    <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:18,animation:"fadeUp .4s ease"}}>
      <div style={{fontSize:10,color:C.gold,letterSpacing:".2em",marginBottom:12,textTransform:"uppercase"}}>表現 · Expression du jour {data.emoji}</div>
      <div style={{fontSize:34,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,lineHeight:1.2,marginBottom:5}}>{data.expression}</div>
      <div style={{fontSize:12,color:C.gold,fontStyle:"italic",marginBottom:3}}>{data.romaji}</div>
      <div style={{fontSize:14,color:C.t2,fontWeight:500,marginBottom:13}}>{data.traduction}</div>
      <div style={{fontSize:13,color:C.t2,lineHeight:1.78,marginBottom:13}}>{data.contexte}</div>
      <div style={{padding:"11px 13px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8}}>
        <div style={{fontSize:9,color:C.gold,letterSpacing:".18em",marginBottom:6}}>EXEMPLE</div>
        <div style={{fontSize:13,color:C.text,marginBottom:3}}>{data.exemple_jp}</div>
        <div style={{fontSize:11,color:C.t3,fontStyle:"italic"}}>{data.exemple_fr}</div>
      </div>
    </div>
  );
}

function CultCard({C,data}){
  if(!data) return null;
  return(
    <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:18,animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:11}}>
        <div style={{fontSize:10,color:C.red,letterSpacing:".2em",textTransform:"uppercase"}}>文化 · Culture {data.emoji}</div>
        <span style={{fontSize:9,padding:"3px 8px",background:`rgba(201,70,61,0.07)`,border:`1px solid rgba(201,70,61,0.2)`,borderRadius:20,color:C.red,whiteSpace:"nowrap",flexShrink:0,marginLeft:8}}>{data.tag}</span>
      </div>
      <div style={{fontSize:17,fontFamily:"'Noto Serif JP',serif",color:C.text,marginBottom:11,lineHeight:1.45}}>{data.titre}</div>
      <p style={{fontSize:13,color:C.t2,lineHeight:1.82,marginBottom:13}}>{data.contenu}</p>
      <div style={{padding:"11px 13px",background:C.s2,borderLeft:`3px solid ${C.red}`,borderRadius:"0 7px 7px 0"}}>
        <div style={{fontSize:9,color:C.red,letterSpacing:".18em",marginBottom:4}}>À RETENIR</div>
        <p style={{fontSize:12,color:C.t2,lineHeight:1.65,margin:0,fontStyle:"italic"}}>{data.insight}</p>
      </div>
    </div>
  );
}

function RepasCard({C,data}){
  if(!data) return null;
  return(
    <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:18,animation:"fadeUp .4s ease"}}>
      <div style={{fontSize:10,color:C.green,letterSpacing:".2em",marginBottom:11,textTransform:"uppercase"}}>🍱 Repas · {data.moment}</div>
      <div style={{fontSize:32,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,lineHeight:1.2,marginBottom:5}}>{data.nom_jp} {data.emoji}</div>
      <div style={{fontSize:12,color:C.green,fontStyle:"italic",marginBottom:11}}>{data.romaji} — {data.traduction}</div>
      <p style={{fontSize:13,color:C.t2,lineHeight:1.8,marginBottom:12}}>{data.description}</p>
      <div style={{padding:"11px 13px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:8,display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{fontSize:15,flexShrink:0}}>💡</span>
        <p style={{fontSize:12,color:C.t2,margin:0,lineHeight:1.6,fontStyle:"italic"}}>{data.fun_fact}</p>
      </div>
    </div>
  );
}

function SongCard({C,data}){
  if(!data) return null;
  const ytUrl=`https://www.youtube.com/results?search_query=${encodeURIComponent(data.youtube_query||data.titre+" "+data.artiste)}`;
  return(
    <div style={{borderRadius:14,overflow:"hidden",border:`1px solid ${C.border}`,animation:"fadeUp .4s ease"}}>
      <div style={{background:"linear-gradient(135deg,#221440 0%,#3D1628 55%,#142038 100%)",padding:"20px 18px 18px"}}>
        <div style={{fontSize:10,color:"rgba(240,230,211,0.5)",letterSpacing:".2em",marginBottom:14,textTransform:"uppercase"}}>🎵 Song of the day {data.emoji}</div>
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

function StreakSection({C}){
  const dow=new Date().getDay(), todayIdx=dow===0?6:dow-1;
  const days=["L","M","M","J","V","S","D"];
  return(
    <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:18,animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <div style={{fontSize:10,color:C.t3,letterSpacing:".2em",marginBottom:5,textTransform:"uppercase"}}>Streak actuel</div>
          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
            <span style={{fontSize:42,fontWeight:500,color:C.text,fontFamily:"'Noto Serif JP',serif",lineHeight:1}}>1</span>
            <span style={{fontSize:13,color:C.t2}}>jour</span>
          </div>
          <div style={{fontSize:11,color:C.t3,marginTop:3}}>Prochain jalon : 7 jours 🎯</div>
        </div>
        <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(201,70,61,0.08)",border:"1.5px solid rgba(201,70,61,0.22)",display:"flex",alignItems:"center",justifyContent:"center",animation:"glow 2.5s ease infinite"}}>
          <span style={{fontSize:24}}>🔥</span>
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
          <span style={{fontSize:10,color:C.t3}}>Vers 7 jours consécutifs</span>
          <span style={{fontSize:11,color:C.red,fontWeight:500}}>1 / 7</span>
        </div>
        <div style={{height:4,background:C.s3,borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(1/7)*100}%`,background:C.red,borderRadius:2}}/>
        </div>
      </div>
      <div style={{display:"flex",gap:5,justifyContent:"space-between",marginBottom:18}}>
        {days.map((lbl,i)=>{
          const done=i<todayIdx, isToday=i===todayIdx;
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
      <div style={{paddingTop:14,borderTop:`1px solid ${C.border}`}}>
        <div style={{fontSize:9,color:C.t3,letterSpacing:".2em",marginBottom:10,textTransform:"uppercase"}}>Badges à débloquer</div>
        <div style={{display:"flex",gap:8}}>
          {[{e:"🎋",l:"7 jours"},{e:"⛩️",l:"Culture x5"},{e:"🗣️",l:"Scénario"}].map((b,i)=>(
            <div key={i} style={{flex:1,padding:"10px 8px",background:C.s2,border:`1px dashed ${C.border}`,borderRadius:10,textAlign:"center",opacity:.65}}>
              <div style={{fontSize:18,marginBottom:4}}>{b.e}</div>
              <div style={{fontSize:9,color:C.t3}}>{b.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function HomeScreen({C,user,db}){
  const [expr,  setExpr]  = useState(null);
  const [cult,  setCult]  = useState(null);
  const [repas, setRepas] = useState(null);
  const [song,  setSong]  = useState(null);
  const loaded = useRef(false);

  const {month,day,weekday,hour} = getJPDate();
  const g = greet(hour, user.name==="Voyageur"?"":user.name);
  const rankLabel = {beginner:"Curious Tourist",intermediate:"Konbini Explorer",advanced:"Tokyo Wanderer"};

  const refresh = (which) => {
    if(!db) return;
    if(!which || which==="daily") {
      setExpr(pick(db.expressions));
      setCult(pick(db.culture));
      setRepas(pick(db.repas));
    }
    if(!which || which==="song") setSong(pick(db.songs));
  };

  useEffect(() => {
    if(!loaded.current && db) { loaded.current=true; refresh(); }
  }, [db]);

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,fontFamily:"'Noto Sans JP',sans-serif"}}>
      {/* Sticky header */}
      <div style={{padding:"50px 20px 14px",background:C.bg,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:10,color:C.t3,letterSpacing:".2em"}}>{month} {day}日（{weekday}）</div>
          <div style={{display:"flex",gap:7}}>
            <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:"rgba(201,70,61,0.08)",border:"1px solid rgba(201,70,61,0.2)",borderRadius:20,animation:"glow 2.5s ease infinite"}}>
              <span style={{fontSize:11}}>🔥</span>
              <span style={{fontSize:11,color:C.text,fontWeight:500}}>1 jour</span>
            </div>
            <div style={{padding:"4px 10px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:20}}>
              <span style={{fontSize:10,color:C.t2}}>{rankLabel[user.level]||"Curious Tourist"}</span>
            </div>
          </div>
        </div>
        <div style={{fontSize:21,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:2}}>{g.jp}</div>
        <div style={{fontSize:13,color:C.t2}}>{g.fr}</div>
      </div>

      <div style={{padding:"18px 20px 110px"}}>
        {/* Section 1 — Daily Japan */}
        <SH C={C} kanji="日" title="Daily Japan" sub="Expression · Culture · Repas" onRefresh={()=>refresh("daily")}/>
        <div style={{display:"flex",flexDirection:"column",gap:11,marginBottom:28}}>
          <ExprCard  C={C} data={expr}/>
          <CultCard  C={C} data={cult}/>
          <RepasCard C={C} data={repas}/>
          {!db && (
            <div style={{padding:"24px",textAlign:"center",background:C.s1,border:`1px solid ${C.border}`,borderRadius:14}}>
              <div style={{fontSize:20,marginBottom:8}}>⏳</div>
              <div style={{fontSize:12,color:C.t3}}>Chargement du contenu…</div>
            </div>
          )}
        </div>

        {/* Section 2 — Song of the Day */}
        <SH C={C} kanji="音" title="Song of the Day" sub="Musique japonaise du jour" onRefresh={()=>refresh("song")}/>
        <div style={{marginBottom:28}}>
          <SongCard C={C} data={song}/>
        </div>

        {/* Section 3 — Streak */}
        <SH C={C} kanji="火" title="Streak & Fidélisation" sub="Ta progression quotidienne"/>
        <StreakSection C={C}/>
      </div>
    </div>
  );
}

// ─── Other screens ────────────────────────────────────────────────────────────
function ExploreScreen({C,db}){
  const [view,setView] = useState(null);
  if(view==="traditions") return <TraditionsScreen C={C} db={db}/>;
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 110px"}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>探 · EXPLORER</div>
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:3}}>文化を探す</div>
        <div style={{fontSize:13,color:C.t2,marginBottom:22}}>Découvrir la culture japonaise</div>
        <div style={{display:"flex",flexDirection:"column",gap:11}}>
          {EXPLORE_MODS.map((m,i)=>{
            const active = m.title==="Traditions";
            return(
              <div key={i} onClick={()=>active&&setView("traditions")} style={{background:C.s1,border:`1px solid ${active?"rgba(201,70,61,0.3)":C.border}`,borderRadius:14,padding:"18px",display:"flex",alignItems:"center",gap:14,cursor:active?"pointer":"default",transition:"all .2s"}}>
                <span style={{fontSize:28,flexShrink:0}}>{m.emoji}</span>
                <div style={{flex:1}}><div style={{fontSize:14,color:C.text,marginBottom:3}}>{m.title}</div><div style={{fontSize:12,color:C.t2}}>{m.sub}</div></div>
                {active
                  ? <span style={{fontSize:10,padding:"3px 10px",background:"rgba(201,70,61,0.1)",border:"1px solid rgba(201,70,61,0.25)",borderRadius:20,color:C.red,whiteSpace:"nowrap"}}>Disponible</span>
                  : <span style={{fontSize:11,color:C.t3}}>Bientôt</span>}
                <div style={{fontSize:16,color:C.t3}}>›</div>
              </div>
            );
          })}
        </div>
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

function TraditionDetail({C,t,onBack}){
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg,animation:"fadeIn .3s ease"}}>
      {/* Hero */}
      <div style={{padding:"50px 20px 24px",background:`linear-gradient(160deg,rgba(201,70,61,0.1) 0%,transparent 90%)`,position:"relative"}}>
        <button onClick={onBack} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:20,padding:"7px 14px",color:C.t2,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginBottom:20}}>
          ‹ Calendrier
        </button>
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
          <p style={{fontSize:14,color:C.t2,lineHeight:1.85,margin:0}}>{t.histoire}</p>
        </div>

        {/* Rituels */}
        <div>
          <div style={{fontSize:10,color:C.red,letterSpacing:".2em",marginBottom:12,textTransform:"uppercase"}}>⛩️ Rituels traditionnels</div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {t.rituels.map((r,i)=>(
              <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 14px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:10}}>
                <span style={{minWidth:22,height:22,borderRadius:"50%",background:"rgba(201,70,61,0.12)",color:C.red,fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span>
                <span style={{fontSize:13,color:C.t2,lineHeight:1.55}}>{r}</span>
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
                <span style={{fontSize:13,color:C.t2,lineHeight:1.55}}>{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gastronomie */}
        <div style={{padding:"14px 16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:12,display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:22,flexShrink:0}}>🍱</span>
          <div>
            <div style={{fontSize:10,color:C.gold,letterSpacing:".15em",marginBottom:5,textTransform:"uppercase"}}>Gastronomie associée</div>
            <p style={{fontSize:13,color:C.t2,margin:0,lineHeight:1.55}}>{t.gastronomie}</p>
          </div>
        </div>

        {/* Lieu phare */}
        <div style={{padding:"14px 16px",background:C.s1,border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.red}`,borderRadius:"0 10px 10px 0",display:"flex",gap:12,alignItems:"flex-start"}}>
          <span style={{fontSize:22,flexShrink:0}}>📍</span>
          <div>
            <div style={{fontSize:10,color:C.red,letterSpacing:".15em",marginBottom:5,textTransform:"uppercase"}}>Où la vivre au Japon</div>
            <p style={{fontSize:13,color:C.t2,margin:0,lineHeight:1.55}}>{t.lieu_phare}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TraditionsScreen({C,db}){
  const [season,setSeason] = useState("printemps");
  const [selected,setSelected] = useState(null);
  const traditions = db?.traditions || [];

  if(selected) return <TraditionDetail C={C} t={selected} onBack={()=>setSelected(null)}/>;

  const seasonData = SEASONS.find(s=>s.id===season);
  const filtered = traditions.filter(t=>t.saison===season);

  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 12px"}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>暦 · TRADITIONS</div>
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:3}}>年中行事</div>
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

function ScenariosScreen({C}){
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 110px"}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>場 · SCÉNARIOS</div>
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:3}}>シナリオ</div>
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

function LearnScreen({C}){
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 110px"}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:5}}>学 · APPRENDRE</div>
        <div style={{fontSize:22,fontFamily:"'Noto Serif JP',serif",fontWeight:300,color:C.text,marginBottom:3}}>日本語を学ぶ</div>
        <div style={{fontSize:13,color:C.t2,marginBottom:22}}>Apprentissage naturel et contextuel</div>
        <div style={{display:"flex",flexDirection:"column",gap:11}}>
          {LEARN_S.map((l,i)=>(
            <div key={i} style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px",display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:28}}>{l.emoji}</span>
              <div><div style={{fontSize:14,color:C.text,marginBottom:3}}>{l.title}</div><div style={{fontSize:12,color:C.t2}}>{l.sub}</div></div>
            </div>
          ))}
        </div>
        <div style={{marginTop:16,padding:"15px",textAlign:"center",background:C.s2,border:`1px dashed ${C.border}`,borderRadius:12}}>
          <div style={{fontSize:11,color:C.t3}}>Module complet bientôt 📖</div>
        </div>
      </div>
    </div>
  );
}

function ProfileScreen({C,user,dark,setDark,db}){
  const lvlL={beginner:"Débutant",intermediate:"Intermédiaire",advanced:"Avancé"};
  const goalL={travel:"Voyager",live:"Vivre au Japon",learn:"Apprendre",imm:"Immersion"};
  const total = db ? Object.values(db).reduce((a,b)=>a+b.length,0) : 0;
  return(
    <div style={{height:"100%",overflowY:"auto",background:C.bg}}>
      <div style={{padding:"50px 20px 110px"}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:".3em",marginBottom:16}}>人 · PROFIL</div>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16,padding:"16px",background:C.s1,border:`1px solid ${C.border}`,borderRadius:14}}>
          <div style={{width:50,height:50,borderRadius:"50%",background:"rgba(201,70,61,0.1)",border:"2px solid rgba(201,70,61,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontFamily:"'Noto Serif JP',serif",color:C.red,flexShrink:0}}>
            {(user.name||"V")[0].toUpperCase()}
          </div>
          <div>
            <div style={{fontSize:16,color:C.text,marginBottom:4}}>{user.name}</div>
            <div style={{fontSize:11,color:C.t2}}>🌱 Curious Tourist</div>
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
            {v:"1",label:"Streak",emoji:"🔥"},
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
      </div>
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
const TABS=[{id:"home",kanji:"家",label:"Home"},{id:"explore",kanji:"探",label:"Explorer"},{id:"scenarios",kanji:"場",label:"Scénarios"},{id:"learn",kanji:"学",label:"Apprendre"},{id:"profile",kanji:"人",label:"Profil"}];
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
export default function IsekaidApp(){
  const [screen,setScreen]=useState("splash");
  const [tab,setTab]=useState("home");
  const [user,setUser]=useState(null);
  const [dark,setDark]=useState(false);
  const [db,setDb]=useState(null);
  const C=dark?DARK:LIGHT;

  // Load from imported JSON — no fetch needed
  useEffect(()=>{ setDb(DATA); },[]);

  return(
    <div style={{width:"100%",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#080604",fontFamily:"'Noto Sans JP','Helvetica Neue',sans-serif"}}>
      <style>{CSS}</style>
      <div style={{width:"min(100vw,390px)",height:"min(100vh,844px)",position:"relative",overflow:"hidden",borderRadius:"clamp(0px,calc((100vw - 390px)*999),44px)",background:C.bg,boxShadow:"0 40px 120px rgba(0,0,0,.8),0 0 0 1px rgba(0,0,0,.08)",transition:"background .3s"}}>
        {screen==="splash"     &&<Splash onDone={()=>setScreen("onboarding")}/>}
        {screen==="onboarding" &&<Onboarding onComplete={u=>{setUser(u);setScreen("app");}}/>}
        {screen==="app"&&user&&(
          <>
            <div style={{position:"absolute",inset:"0 0 72px 0",overflow:"hidden"}}>
              {tab==="home"      &&<HomeScreen      C={C} user={user} db={db}/>}
              {tab==="explore"   &&<ExploreScreen   C={C} db={db}/>}
              {tab==="scenarios" &&<ScenariosScreen C={C}/>}
              {tab==="learn"     &&<LearnScreen     C={C}/>}
              {tab==="profile"   &&<ProfileScreen   C={C} user={user} dark={dark} setDark={setDark} db={db}/>}
            </div>
            <BottomNav C={C} active={tab} onChange={setTab}/>
          </>
        )}
      </div>
    </div>
  );
}
