import { BookOpen, Compass, Map, NotebookPen, Sparkles } from "lucide-react";

export const PRODUCT_STEPS = Object.freeze([
  Object.freeze({
    id:"promise", eyebrow:"Bienvenue dans Isekaid", title:"Ton Japon commence ici",
    description:"Découvre, apprends, prépare ton voyage et garde tout ce que tu vivras au Japon.",
    Icon:NotebookPen, action:"Commencer",
  }),
  Object.freeze({
    id:"today", eyebrow:"Aujourd’hui", title:"Un peu de Japon chaque jour",
    description:"Découvre un lieu, apprends une expression, teste-toi et accomplis une petite mission.",
    sequence:["Découvrir","Apprendre","Comprendre","Mission"], Icon:Sparkles, action:"Continuer",
  }),
  Object.freeze({
    id:"learn", eyebrow:"Apprendre", title:"Le japonais utile, au bon moment",
    description:"Kana, situations, scénarios et expressions pensés pour ton niveau et ton voyage.",
    examples:["Restaurant","Train","Hôtel","Konbini"], Icon:BookOpen, action:"Continuer",
  }),
  Object.freeze({
    id:"travel", eyebrow:"Voyage", title:"Avant, pendant et après ton voyage",
    description:"Prépare ton itinéraire, retrouve ce dont tu as besoin sur place et garde ton voyage en souvenir.",
    sequence:["Avant · préparer","Pendant · mode Japon","Après · souvenirs"], Icon:Map, action:"Continuer",
  }),
  Object.freeze({
    id:"discover", eyebrow:"Découvrir · Mon Japon", title:"Explore, puis garde ce qui compte",
    description:"Explore le Japon à ton rythme et construis ton propre carnet au fil des découvertes.",
    panels:[{title:"Découvrir",text:"47 préfectures, lieux, culture, gastronomie et vie quotidienne."},{title:"Mon Japon",text:"Tes favoris, voyages terminés, souvenirs et accomplissements."}],
    Icon:Compass, action:"Commencer mon Japon",
  }),
]);

export const UPDATE_STEPS = Object.freeze([
  Object.freeze({id:"today",eyebrow:"Isekaid a évolué · Aujourd’hui",title:"Ton rendez-vous quotidien",description:"Une session courte réunit découverte, japonais, compréhension et mission.",Icon:Sparkles,action:"Continuer"}),
  Object.freeze({id:"travel",eyebrow:"Voyage",title:"Avant, pendant et après",description:"Prépare ton séjour, passe en Mode Japon sur place, puis retrouve ton carnet et tes souvenirs.",Icon:Map,action:"Continuer"}),
  Object.freeze({id:"my-japan",eyebrow:"Mon Japon",title:"Tout ce qui compte, au même endroit",description:"Favoris, voyages, souvenirs, passeport et accomplissements construisent désormais ton Japon.",Icon:NotebookPen,action:"Découvrir les nouveautés"}),
]);

export const CONTEXTUAL_GUIDES = Object.freeze({
  today:Object.freeze({id:"today",title:"Ton rendez-vous quotidien",description:"Commence par Découvrir. La suite se débloque étape par étape.",action:"Compris"}),
  learn:Object.freeze({id:"learn",title:"Apprends ce qui te sera utile",description:"Suis ton parcours ou choisis une situation liée à ton prochain voyage.",action:"Compris"}),
  discover:Object.freeze({id:"discover",title:"Explore le Japon à ton rythme",description:"Découvre ses 47 préfectures, ses lieux, sa culture et ses habitudes.",action:"Explorer"}),
  myJapan:Object.freeze({id:"myJapan",title:"Voici ton Japon",description:"Tout ce que tu sauvegardes, visites et accomplis se retrouve ici.",action:"Compris"}),
});

export function travelGuideFor(state) {
  if(state==="ACTIVE_TRIP") return {id:"travel",title:"Bienvenue en Mode Japon",description:"Ta journée, ton itinéraire, le SOS et ton japonais utile restent accessibles rapidement.",action:"Compris"};
  if(state==="POST_TRIP") return {id:"travel",title:"Ton voyage reste avec toi",description:"Retrouve tes souvenirs et crée ton carnet de voyage.",action:"Compris"};
  if(state==="PRE_TRIP") return {id:"travel",title:"Ton voyage prend forme",description:"Ici, retrouve ta prochaine action, ton itinéraire et tes préparatifs essentiels.",action:"Compris"};
  return {id:"travel",title:"Prépare ton premier voyage",description:"Crée ton voyage ou pars d’un itinéraire pour commencer à organiser ton Japon.",action:"Compris"};
}
