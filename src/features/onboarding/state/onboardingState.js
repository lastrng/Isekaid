import { readJson, writeJson } from "../../../lib/storage.js";

export const CURRENT_ONBOARDING_VERSION = 2;
export const GUIDE_IDS = Object.freeze(["today","travel","learn","discover","myJapan"]);
const KEY_PREFIX = "isekaid_onboarding_state_v2_";

export function onboardingOwnerKey(userId) {
  return String(userId || "local").replace(/[^a-zA-Z0-9_-]/g,"-").slice(0,120) || "local";
}

export function onboardingStorageKey(userId) { return `${KEY_PREFIX}${onboardingOwnerKey(userId)}`; }

export function emptyOnboardingState() {
  return {version:CURRENT_ONBOARDING_VERSION,completed:false,completedAt:null,migration:null,skipped:false,presentation:null,guidesResetAt:null,seenGuides:Object.fromEntries(GUIDE_IDS.map(id=>[id,false]))};
}

export function normalizeOnboardingState(value) {
  const base=emptyOnboardingState();
  if(!value || typeof value!=="object" || Array.isArray(value))return base;
  const presentation=["new","update","replay"].includes(value.presentation?.mode)?{mode:value.presentation.mode,index:Math.max(0,Math.min(value.presentation.mode==="update"?2:4,Math.trunc(Number(value.presentation.index)||0)))}:null;
  return {...base,...value,version:Math.max(1,Number(value.version)||1),completed:value.completed===true,skipped:value.skipped===true,presentation,seenGuides:Object.fromEntries(GUIDE_IDS.map(id=>[id,value.seenGuides?.[id]===true]))};
}

export function loadOnboardingState(userId) { return normalizeOnboardingState(readJson(onboardingStorageKey(userId),null)); }
export function saveOnboardingState(userId,state) { const normalized=normalizeOnboardingState(state); return globalThis.localStorage && writeJson(onboardingStorageKey(userId),normalized) ? normalized : null; }

// Late acknowledgements cannot erase completion recorded on another device.
export function mergeOnboardingStates(local,remote) {
  if(!remote)return normalizeOnboardingState(local);
  if(!local)return normalizeOnboardingState(remote);
  const a=normalizeOnboardingState(local),b=normalizeOnboardingState(remote);
  if(a.version!==b.version)return a.version>b.version?a:b;
  const completed=[a,b].filter(s=>s.completed).sort((x,y)=>String(y.completedAt||"").localeCompare(String(x.completedAt||"")))[0];
  const reset=String(a.guidesResetAt||"")>=String(b.guidesResetAt||"")?a:b;
  const sameReset=a.guidesResetAt===b.guidesResetAt;
  return {...b,...a,completed:Boolean(completed),completedAt:completed?.completedAt||null,migration:completed?.migration||a.migration||b.migration,skipped:completed?.skipped||false,
    guidesResetAt:reset.guidesResetAt,seenGuides:Object.fromEntries(GUIDE_IDS.map(id=>[id,sameReset?a.seenGuides[id]||b.seenGuides[id]:reset.seenGuides[id]]))};
}

export function completeOnboardingState(previous,{migration=null,skipped=false,now=new Date().toISOString()}={}) {
  return {...normalizeOnboardingState(previous),version:CURRENT_ONBOARDING_VERSION,completed:true,completedAt:now,migration,skipped,presentation:null};
}

export function markGuideSeen(previous,id) {
  const state=normalizeOnboardingState(previous);
  if(!GUIDE_IDS.includes(id))return state;
  return {...state,seenGuides:{...state.seenGuides,[id]:true}};
}

export function resetOnboardingPresentation(previous) {
  return {...normalizeOnboardingState(previous),presentation:{mode:"replay",index:0}};
}

export function resetContextualGuides(previous) {
  return {...normalizeOnboardingState(previous),guidesResetAt:new Date().toISOString(),seenGuides:Object.fromEntries(GUIDE_IDS.map(id=>[id,false]))};
}

export function onboardingEntry({hasProfile,state}) {
  const normalized=normalizeOnboardingState(state);
  if(!hasProfile||(!normalized.completed&&normalized.presentation?.mode==="new"))return "new";
  if(normalized.completed && normalized.version>=CURRENT_ONBOARDING_VERSION)return "app";
  return "update";
}

export function devResetOnboarding(userId,{guidesOnly=false}={}) {
  if(!import.meta.env?.DEV)return false;
  const current=loadOnboardingState(userId);
  return Boolean(saveOnboardingState(userId,guidesOnly?resetContextualGuides(current):resetContextualGuides(resetOnboardingPresentation(emptyOnboardingState()))));
}
