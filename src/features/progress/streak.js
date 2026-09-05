import { readJson, readString, writeJson, writeString } from "../../lib/storage.js";

const STREAK_KEY = "isekaid_streak_v1";

// Local day key YYYY-MM-DD (no timezone surprises)
function dayKey(d=new Date()){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function daysBetween(aKey,bKey){
  const a=new Date(aKey+"T00:00:00"), b=new Date(bKey+"T00:00:00");
  return Math.round((b-a)/86400000);
}
// Salutation quotidienne (Système 4.b) : joue une seule fois par jour, au
// tout premier atterrissage sur Home — voir HomeScreen.
const GREETING_KEY = "isekaid_last_greeting_date";
function isNewGreetingDay(){
  return readString(GREETING_KEY) !== dayKey();
}
function markGreetingSeenToday(){
  return writeString(GREETING_KEY, dayKey());
}
function loadStreak(){
  return readJson(STREAK_KEY, null);
}
// ─── Paliers de streak (micro-récompense visuelle, indépendante des
// déblocages de contenu de UNLOCK_SCHEDULE) — réutilise la modale
// DailyWelcome existante (champ `milestone`) pour la célébration.
const STREAK_MILESTONES = [
  { day:3,   label:"3 jours d'affilée",     emoji:"🔥" },
  { day:7,   label:"1 semaine complète",    emoji:"⭐" },
  { day:14,  label:"2 semaines de suite",   emoji:"🎖️" },
  { day:30,  label:"1 mois de régularité",  emoji:"🏅" },
  { day:100, label:"100 jours, légendaire", emoji:"🏆" },
];
function nextStreakMilestone(count){
  return STREAK_MILESTONES.find(m=>m.day>count) || null;
}

// Returns { count, best, last, freezes, lastFreezeRecharge } updated for "today"
// Streak consécutif avec 1 joker rechargeable (1 tous les 7 jours actifs).
function touchStreak(){
  const today = dayKey();
  let s = loadStreak();
  const prevCount = s?.count || 0;
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
  // Palier franchi aujourd'hui (compteur qui vient de changer + tombe pile sur un palier)
  s.milestone = (s.count !== prevCount && STREAK_MILESTONES.find(m=>m.day===s.count)) || null;
  writeJson(STREAK_KEY, s);
  return {...s};
}
function saveStreak(s){
  return writeJson(STREAK_KEY, s);
}


export {
  STREAK_MILESTONES,
  dayKey,
  daysBetween,
  isNewGreetingDay,
  loadStreak,
  markGreetingSeenToday,
  nextStreakMilestone,
  saveStreak,
  touchStreak,
};
