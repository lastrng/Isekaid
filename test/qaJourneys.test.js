import assert from "node:assert/strict";
import test from "node:test";

import { resolveDestination } from "../src/app/navigation/destinations.js";
import { buildSearchIndex, groupSearchResults, searchCatalog } from "../src/data/searchIndex.js";
import { resolvePastTrip } from "../src/entities/trip/tripLifecycle.js";
import { getRecommendedLearning, getUserContext } from "../src/entities/user/userContext.js";
import { answerDailyQuestion, buildDailyRitual, completeDailyActivity, dailyProgress, syncDailyMissionProgress } from "../src/features/daily/dailyModel.js";
import { buildPrefectures, markPrefectureDiscovered } from "../src/features/explore/prefectureModel.js";
import { buildJapanMode, toggleTodayActivity } from "../src/features/japan-mode/japanModeModel.js";
import { buildMyJapanSummary } from "../src/features/my-japan/myJapanModel.js";
import { buildOnboardingProfile } from "../src/features/onboarding/onboardingModel.js";
import { favId, loadFavs, saveFavs } from "../src/features/profile/favorites.js";
import { loadStreak, saveStreak, touchStreak } from "../src/features/progress/streak.js";
import { tripFromPreconcu } from "../src/features/travel/tripModel.js";
import { buildTravelOfflineSnapshot, getOfflineCapabilities, hasTravelOfflineData } from "../src/services/sync/offlineStrategy.js";

function memoryStorage(){
  const values=new Map();
  return {
    get length(){return values.size;},
    key:index=>[...values.keys()][index]??null,
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key),
    clear:()=>values.clear(),
  };
}

function withStorage(run){
  const previous=globalThis.localStorage;
  globalThis.localStorage=memoryStorage();
  try{return run();}finally{
    if(previous===undefined)delete globalThis.localStorage;
    else globalThis.localStorage=previous;
  }
}

const cities=[
  {id:"tokyo",nom:"Tokyo",nom_jp:"東京",region:"kanto",prefecture:"Tokyo"},
  {id:"kyoto",nom:"Kyoto",nom_jp:"京都",region:"kansai",prefecture:"Kyoto"},
];
const places=[
  {id:"sensoji",nom:"Sensō-ji",villeId:"tokyo",categorie:"Temple",description:"Temple historique",emoji:"⛩️"},
  {id:"fushimi",nom:"Fushimi Inari",villeId:"kyoto",categorie:"Sanctuaire",description:"Sanctuaire et torii",emoji:"⛩️"},
  {id:"ramen",nom:"Ramen-ya",villeId:"tokyo",categorie:"Restaurant",description:"Restaurant local",emoji:"🍜"},
];
const db={
  villes:cities,
  lieux:places,
  culture:[{id:"tea",titre:"Le thé au Japon",tag:"Culture",contenu:"Un geste d’hospitalité."}],
  repas:[{id:"yudofu",romaji:"Yudōfu",description:"Spécialité de Kyoto",villeId:"kyoto"}],
  expressions:[
    {id:"sumimasen",expression:"すみません",kana:"すみません",romaji:"Sumimasen",traduction:"Excusez-moi",niveau:"beginner"},
    {id:"kudasai",expression:"これをください",kana:"これをください",romaji:"Kore o kudasai",traduction:"Ceci, s’il vous plaît",niveau:"beginner"},
  ],
  situations:[
    {id:"restaurant",titre:"Commander au restaurant",description:"Demander un plat",niveau:"beginner",phrases:[{jp:"これをください",fr:"Ceci, s’il vous plaît"}]},
    {id:"train",titre:"Prendre le train",description:"À la gare",niveau:"beginner",phrases:[{jp:"何番線ですか",fr:"Quel quai ?"}]},
  ],
  voyages_preconcus:[],
};

test("QA · sans voyage : compte → Aujourd’hui → découverte → préfecture → sauvegarde → Mon Japon",()=>withStorage(()=>{
  const user=buildOnboardingProfile({relationship:"japan_lover",name:"Aiko",level:"débutant",why:["culture"]});
  assert.equal(user.goal,"imm");
  let daily=buildDailyRitual({db,date:"2026-09-11",mission:{id:"save_place",label:"Sauvegarder un lieu",targetTab:"explore"}});
  daily=completeDailyActivity(daily,daily.activities.find(item=>item.kind==="discover").id);
  daily=completeDailyActivity(daily,daily.activities.find(item=>item.kind==="learn").id);
  assert.equal(dailyProgress(daily).done,2);

  const progress=markPrefectureDiscovered(null,"kyoto",new Date("2026-09-11T10:00:00Z"));
  assert.equal(buildPrefectures({db,progress}).find(item=>item.id==="kyoto").visited,false);
  const favorite={id:favId("lieu",places[1]),type:"lieu",item:places[1]};
  saveFavs([favorite]);
  assert.deepEqual(loadFavs().map(item=>item.id),["lieu:Fushimi Inari"]);
  const summary=buildMyJapanSummary({db,cities,places,favorites:loadFavs(),prefectureProgress:progress});
  assert.equal(summary.discoveredPrefectures,1);
  assert.equal(summary.visitedPrefectures,0);
  assert.equal(summary.savedPlaces,1);
}));

test("QA · préparation : Tokyo/Kyoto → lieux → recommandations → checklist → offline",()=>withStorage(()=>{
  const template={id:"tokyo-kyoto",titre:"Tokyo & Kyoto",villes:["tokyo","kyoto"],jours:[
    {num:1,villeId:"tokyo",titre:"Tokyo",etapes:[{lieuId:"sensoji"},{lieuId:"ramen"}]},
    {num:2,villeId:"kyoto",titre:"Kyoto",etapes:[{lieuId:"fushimi"}]},
  ]};
  const trip={...tripFromPreconcu(template),dateDebut:"2026-10-10",dateFin:"2026-10-11"};
  assert.deepEqual(trip.villes,["tokyo","kyoto"]);
  assert.equal(trip.jours.flatMap(day=>day.activites).length,3);
  assert.equal(trip.checklist.length>0,true);

  const context=getUserContext({user:{why:["gastro"],level:"débutant"},db,trips:[trip],currentDate:new Date("2026-09-11T12:00:00Z")});
  const learning=getRecommendedLearning({context,db,limit:10,date:"2026-09-11"});
  assert.ok(learning.some(item=>item.sourceId==="restaurant"));
  const snapshot=buildTravelOfflineSnapshot({trips:[trip],db,sos:[{id:"medical",jp:"救急車を呼んでください"}],currentDate:new Date("2026-09-11T12:00:00Z")});
  assert.equal(hasTravelOfflineData(snapshot),true);
  const capabilities=getOfflineCapabilities({trip:snapshot.trip,days:snapshot.days,tripPlaces:snapshot.places,sos:snapshot.sos,savedExpressions:snapshot.savedExpressions,travelJapanese:snapshot.travelJapanese});
  assert.equal(capabilities.activeTrip,true);
  assert.equal(capabilities.tripDays,true);
  assert.equal(capabilities.tripPlaces,true);
  assert.equal(capabilities.checklist,true);
  assert.equal(capabilities.sos,true);
}));

test("QA · au Japon : Mode Voyage → prochaine activité → lieu → SOS et japonais offline",()=>withStorage(()=>{
  const active={id:"jp-now",titre:"Tokyo maintenant",dateDebut:"2026-09-11",dateFin:"2026-09-12",villes:["tokyo"],checklist:[],jours:[
    {num:1,villeId:"tokyo",activites:[{id:"temple",lieuId:"sensoji",fait:false},{id:"lunch",lieuId:"ramen",fait:false}]},
    {num:2,villeId:"tokyo",activites:[]},
  ]};
  const now=new Date("2026-09-11T12:00:00");
  const mode=buildJapanMode([active],db,now);
  assert.equal(mode.active,true);
  assert.equal(mode.day.num,1);
  assert.equal(mode.next.id,"temple");
  assert.equal(mode.place.id,"sensoji");
  const progressed=toggleTodayActivity([active],active.id,"temple",now);
  assert.equal(buildJapanMode(progressed,db,now).next.id,"lunch");

  const snapshot=buildTravelOfflineSnapshot({trips:[active],db,favorites:[{type:"expr",item:db.expressions[0]}],sos:[{id:"help",jp:"助けてください"}],currentDate:now});
  assert.equal(snapshot.sos[0].id,"help");
  assert.equal(snapshot.savedExpressions[0].id,"sumimasen");
  assert.ok(snapshot.travelJapanese.some(item=>["restaurant","train"].includes(item.raw.id)));
}));

test("QA · après voyage : terminer → lieux visités → stamps → préfecture → carnet → Mon Japon",()=>{
  const past={id:"memory",titre:"Tokyo vécu",dateDebut:"2026-08-01",dateFin:"2026-08-02",jours:[
    {num:1,date:"2026-08-01",villeId:"tokyo",activites:[{id:"visit",lieuId:"sensoji",fait:true,note:"Le calme du matin."}]},
  ]};
  const completed=resolvePastTrip(past,true,new Date("2026-08-03T10:00:00Z"));
  const summary=buildMyJapanSummary({db,cities,places,trips:[completed],prefectureProgress:{version:1,entries:{tokyo:{discovered:true}}},currentDate:new Date("2026-09-11T12:00:00Z")});
  assert.equal(summary.completedTrips,1);
  assert.equal(summary.visitedPlaces,1);
  assert.equal(summary.visitedPrefectures,1);
  assert.ok(summary.stamps.some(stamp=>stamp.type==="prefecture"));
  assert.ok(summary.stamps.some(stamp=>stamp.type==="trip"));
  assert.equal(summary.carnets[0].status,"started");
  assert.equal(summary.memories[0].note,"Le calme du matin.");
});

test("QA · quotidien : découverte → apprentissage → mission → progression → streak tolérant",()=>withStorage(()=>{
  let ritual=buildDailyRitual({db,date:"2026-09-11",mission:{id:"daily-mission",label:"Faire une action",targetTab:"explore"}});
  ritual=completeDailyActivity(ritual,ritual.activities.find(item=>item.kind==="discover").id);
  ritual=completeDailyActivity(ritual,ritual.activities.find(item=>item.kind==="learn").id);
  const quiz=ritual.activities.find(item=>item.kind==="understand");
  ritual=answerDailyQuestion(ritual,quiz.id,quiz.question.answer);
  ritual=syncDailyMissionProgress(ritual,["daily-mission"]);
  assert.deepEqual(dailyProgress(ritual),{done:4,total:4,percent:100,complete:true});

  const today=new Date();
  const twoDaysAgo=new Date(today);twoDaysAgo.setDate(today.getDate()-2);
  const key=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  saveStreak({count:4,best:4,last:key(twoDaysAgo),freezes:1,totalActiveDays:4,activityDates:[key(twoDaysAgo)]});
  const streak=touchStreak();
  assert.equal(streak.count,5);
  assert.equal(streak.frozenUsed,true);
  assert.equal(streak.freezes,0);
  assert.deepEqual(loadStreak(),streak);
}));

test("QA · transversal : deep links et recherche universelle gardent leurs catégories",()=>{
  assert.equal(resolveDestination("mon_japon"),"profile");
  assert.equal(resolveDestination("Voyager"),"voyage");
  const prefectures=buildPrefectures({db});
  const index=buildSearchIndex({...db,voyages_preconcus:[{id:"kyoto-essential",titre:"Kyoto essentiel",villes:["kyoto"],jours:[]}]},{prefectures,trips:[],lessons:[{id:"temple",title:"Expressions utiles dans un temple",goal:"Kyoto"}]});
  const groups=groupSearchResults(searchCatalog(index,"Kyoto"),{limitPerGroup:20});
  for(const expected of ["prefectures","cities","places","discover","learn","trips"]){
    assert.ok(groups.some(group=>group.id===expected),`catégorie ${expected}`);
  }
});
