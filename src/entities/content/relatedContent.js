const CONTEXTUAL_CONTENT = [
  { id:"onsen-rules", title:"3 règles avant un onsen", summary:"Lave-toi avant le bain, n’immerge jamais la serviette et vérifie la politique concernant les tatouages.", tags:["onsen","bain","spa"], priority:100 },
  { id:"shrine-etiquette", title:"Comment se comporter au sanctuaire", summary:"Incline-toi au torii, purifie tes mains si le bassin est ouvert et laisse le centre du chemin symboliquement libre.", tags:["sanctuaire","shinto","jinja","torii"], priority:90 },
  { id:"temple-etiquette", title:"Avant de visiter un temple", summary:"Reste discret, respecte les zones sans photo et ne confonds pas les rites bouddhistes avec ceux d’un sanctuaire shinto.", tags:["temple","bouddhisme"], priority:85 },
  { id:"restaurant-tips", title:"Au restaurant : l’essentiel", summary:"On ne laisse généralement pas de pourboire. Pose l’argent sur le plateau et utilise « gochisōsama deshita » en partant.", tags:["restaurant","repas","gastro","marché"], priority:80 },
  { id:"train-car", title:"Trouver sa voiture de train", summary:"Repère le numéro de voiture sur le billet puis les marquages au sol. Fais la queue derrière la ligne correspondante.", tags:["train","shinkansen","gare","transport"], priority:80 },
];

function textTokens(value) {
  return String(value || "").toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, " ");
}

export function contentTags(content) {
  const text = textTokens([content?.type,content?.categorie,content?.nom,content?.nom_jp,content?.description,...(content?.interets||[]),...(content?.tags||[])].join(" "));
  return [...new Set(CONTEXTUAL_CONTENT.flatMap(item=>item.tags).filter(tag=>text.includes(textTokens(tag))).concat(content?.tags||[]))];
}

export function getRelatedContent(content, catalog = CONTEXTUAL_CONTENT, limit = 2) {
  const tags = new Set(contentTags(content));
  return catalog.map(item=>({...item,score:(item.tags||[]).filter(tag=>tags.has(tag)).length})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score || (b.priority||0)-(a.priority||0)).slice(0,limit);
}

export { CONTEXTUAL_CONTENT };
