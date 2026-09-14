import { getTripLifecycleStatus, TRIP_STATUS } from "../../entities/trip/tripLifecycle.js";
import { dayKey, daysBetween, nextStreakMilestone } from "./streak.js";

export const DAILY_LOOP_PHASES = Object.freeze([
  Object.freeze({ id:"discover", label:"Découverte", kinds:["discover"] }),
  Object.freeze({ id:"learn", label:"Apprentissage", kinds:["learn","understand","practice"] }),
  Object.freeze({ id:"mission", label:"Mission", kinds:["mission"] }),
]);

function dailyPhases(activities = []) {
  return DAILY_LOOP_PHASES.map(definition => {
    const items = activities.filter(activity=>definition.kinds.includes(activity?.kind));
    const done = items.length > 0 && items.every(item=>item.done === true);
    return {
      id:definition.id,
      label:definition.label,
      done,
      available:items.length > 0,
      completedItems:items.filter(item=>item.done === true).length,
      totalItems:items.length,
    };
  });
}

function safeDate(value) {
  const date=value instanceof Date?value:new Date(value);
  return Number.isNaN(date.getTime())?new Date():date;
}

export function getStreakContinuity(streak = {}, currentDate = new Date()) {
  const date=safeDate(currentDate);
  const count=streak?.count||0;
  const best=Math.max(streak?.best||0,count);
  const activeDates=new Set(Array.isArray(streak?.activityDates)?streak.activityDates:[]);
  const totalActiveDays=Math.max(streak?.totalActiveDays||0,activeDates.size,count);
  const last=streak?.last||null;
  const gap=last?daysBetween(last,dayKey(date)):null;
  const freezes=streak?.freezes||0;
  const nextMilestone=nextStreakMilestone(count);

  if(!last || count===0) return {
    state:"new",count,best,totalActiveDays,freezes,nextMilestone,
    title:"Ton rythme commence quand tu veux",
    message:"Une courte activité suffit. Rien de ton parcours n’est perdu si tu fais une pause.",
    shortLabel:"avance à ton rythme",
  };
  if(gap<=0) return {
    state:"active",count,best,totalActiveDays,freezes,nextMilestone,
    title:`${count} jour${count>1?"s":""} de régularité`,
    message:"Ta présence du jour est enregistrée. Le reste de la session peut attendre.",
    shortLabel:"activité enregistrée aujourd’hui",
  };
  if(gap===1) return {
    state:"ready",count,best,totalActiveDays,freezes,nextMilestone,
    title:`${count} jour${count>1?"s":""} de régularité`,
    message:"Retrouve ton Japon quelques minutes aujourd’hui, quand le moment te convient.",
    shortLabel:"un rendez-vous, sans pression",
  };
  if(gap===2 && freezes>0) return {
    state:"protected",count,best,totalActiveDays,freezes,nextMilestone,
    title:"Une pause est prévue",
    message:"Ton joker protège ta série. Reprends simplement avec une activité aujourd’hui.",
    shortLabel:"pause protégée par un joker",
  };
  return {
    state:"returning",count,best,totalActiveDays,freezes,nextMilestone,
    title:"Content de te retrouver",
    message:`Ta série peut repartir, mais tes ${totalActiveDays} jour${totalActiveDays>1?"s":""} d’activité et toute ta progression restent acquis.`,
    shortLabel:"ta progression reste acquise",
  };
}

function dateValue(trip) {
  return String(trip?.dateDebut||trip?.completedAt||"");
}

export function getTravelRetention(trips = [], currentDate = new Date()) {
  const usable=(trips||[]).filter(trip=>trip && getTripLifecycleStatus(trip,currentDate)!==TRIP_STATUS.CANCELLED);
  const byStatus=status=>usable.filter(trip=>getTripLifecycleStatus(trip,currentDate)===status);
  const active=byStatus(TRIP_STATUS.ACTIVE).sort((a,b)=>dateValue(a).localeCompare(dateValue(b)))[0];
  if(active) return {
    phase:"during",trip:active,title:"Pendant · aller à l’essentiel",
    message:"Aujourd’hui, ton itinéraire, le hors-ligne et SOS passent en premier.",
    action:{id:"travel_now",label:"Ouvrir le mode Voyage",tab:"voyage",tripId:active.id},
  };
  const planned=byStatus(TRIP_STATUS.PLANNED).sort((a,b)=>dateValue(a).localeCompare(dateValue(b)))[0];
  if(planned) return {
    phase:"before",trip:planned,title:"Avant · faire monter l’envie",
    message:"Prépare une journée, un lieu ou une expression utile à la fois.",
    action:{id:"prepare_trip",label:"Continuer la préparation",tab:"voyage",tripId:planned.id},
  };
  const past=[...byStatus(TRIP_STATUS.AWAITING_CONFIRMATION),...byStatus(TRIP_STATUS.COMPLETED)]
    .sort((a,b)=>dateValue(b).localeCompare(dateValue(a)))[0];
  if(past) return {
    phase:"after",trip:past,title:"Après · garder ce qui compte",
    message:"Ton itinéraire reste intact. Complète seulement les journées et souvenirs qui comptent pour toi.",
    action:{id:"remember_trip",label:"Retrouver mes souvenirs",tab:"profile",tripId:past.id},
  };
  return {
    phase:"between",trip:null,title:"Le Japon, même entre deux voyages",
    message:"Découverte, japonais et passeport font vivre ton Japon sans date de départ.",
    action:{id:"keep_exploring",label:"Explorer le Japon",tab:"explore"},
  };
}

/**
 * Source de vérité de la boucle de rétention. Elle ne crée ni points ni
 * récompenses : elle relie seulement les actions réelles et les progrès déjà
 * enregistrés dans les cinq piliers.
 */
export function buildRetentionLoop({
  dailyRitual,
  dailyActivities,
  streak,
  discoveredPrefectures=0,
  prefectureTotal=47,
  stamps=0,
  pathProgress,
  learningTotal=8,
  trips=[],
  currentDate=new Date(),
}={}) {
  const activities=dailyActivities||dailyRitual?.activities||[];
  const phases=dailyPhases(activities);
  const available=phases.filter(phase=>phase.available);
  const completed=available.filter(phase=>phase.done).length;
  const today={
    phases,
    completed,
    total:DAILY_LOOP_PHASES.length,
    complete:available.length===DAILY_LOOP_PHASES.length&&available.every(phase=>phase.done),
  };
  const learnedIds=new Set(Array.isArray(pathProgress?.completed)?pathProgress.completed:[]);
  const learningCompleted=Math.min(learnedIds.size,learningTotal);
  const durable={
    prefectures:{completed:Math.max(0,discoveredPrefectures||0),total:prefectureTotal||47},
    learning:{completed:learningCompleted,total:learningTotal,percent:learningTotal?Math.round(learningCompleted/learningTotal*100):0},
    passport:{completed:Array.isArray(stamps)?stamps.length:Math.max(0,stamps||0),total:null},
  };
  const travel=getTravelRetention(trips,currentDate);
  const incompletePhase=phases.find(phase=>phase.available&&!phase.done);
  let nextAction;
  if(incompletePhase) {
    nextAction={id:"daily",label:`Continuer · ${incompletePhase.label}`,tab:"home",phaseId:incompletePhase.id};
  } else if(travel.phase==="during" || travel.phase==="before" || travel.phase==="after") {
    nextAction=travel.action;
  } else {
    const prefectureRatio=durable.prefectures.total?durable.prefectures.completed/durable.prefectures.total:1;
    const learningRatio=durable.learning.total?durable.learning.completed/durable.learning.total:1;
    nextAction=learningRatio<=prefectureRatio && durable.learning.completed<durable.learning.total
      ? {id:"learning",label:"Continuer mon parcours japonais",tab:"learn"}
      : durable.prefectures.completed<durable.prefectures.total
        ? {id:"prefectures",label:"Découvrir une préfecture",tab:"explore"}
        : {id:"passport",label:"Voir mon passeport",tab:"profile"};
  }
  return {today,continuity:getStreakContinuity(streak,currentDate),durable,travel,nextAction};
}
