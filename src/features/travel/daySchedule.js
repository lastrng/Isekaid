// Estimations locales, distinctes d'un calcul de trajet ou d'horaires en temps réel.
export const TRANSPORT_MODES = Object.freeze({auto:"Automatique",walk:"À pied",transit:"Transports en commun",train:"Train interurbain",car:"Voiture / taxi"});
const DAY_MS = 86_400_000;
const WEEKDAYS = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];

export function parseTime(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value);
  return match && Number(match[1]) < 24 ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function activityFixedTime(activity) {
  return activity?.heure ?? activity?.time ?? (typeof activity?.arrivee === "string" ? activity.arrivee : "");
}

export function formatTime(minutes) {
  if (!Number.isFinite(minutes)) return "—";
  const day = Math.floor(minutes / 1440), value = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(value/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}${day > 0 ? ` (+${day} j)` : ""}`;
}

function durationPart(value, inheritedUnit = "") {
  const text = value.trim().replace(",", ".");
  if (/^\d+(?:\.\d+)?$/.test(text)) return Number(text) * (inheritedUnit === "h" ? 60 : inheritedUnit === "min" ? 1 : NaN);
  const match = /^(?:(\d+(?:\.\d+)?)\s*h(?:eures?)?\s*)?(?:(\d+(?:\.\d+)?)\s*(?:min(?:utes?)?)?)?$/.exec(text);
  return match && (match[1] || match[2]) ? Number(match[1] || 0)*60 + Number(match[2] || 0) : NaN;
}

export function parseDurationMinutes(value) {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  const text = String(value || "").toLowerCase().replace(/[~≈]/g, "").trim();
  if (/demi[- ]journ[ée]e/.test(text)) return 240;
  if (/journ[ée]e (?:compl[èe]te|enti[èe]re)/.test(text)) return 480;
  const parts = text.split(/\s*(?:[-–]|\bà\b)\s*/), unit = /h/.test(text) ? "h" : /min/.test(text) ? "min" : "";
  const values = parts.map(part => durationPart(part,unit));
  return values.length <= 2 && values.every(number => Number.isFinite(number) && number >= 0)
    ? Math.round(values.reduce((sum,number) => sum + number,0)/values.length) : null;
}

export function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
}

export function tripDayDate(trip, day, dayIndex = 0) {
  if (validDate(trip?.dateDebut)) return new Date(Date.parse(`${trip.dateDebut}T00:00:00Z`)+dayIndex*DAY_MS).toISOString().slice(0,10);
  return validDate(day?.date) ? day.date : null;
}

function catalogueTime(hour, minute) { return Number(hour)*60 + Number(minute || 0); }
const windowsFor = (open,close) => close < open ? [[0,close],[open,close+1440]] : [[open,close]];

export function placeOpeningHours(place, date, override) {
  if (override) {
    const open = parseTime(override.open), close = parseTime(override.close);
    return {source:"manual",text:override.closed ? "Fermé ce jour (renseigné)" : `${override.open}–${override.close} (renseigné)`,closed:override.closed === true,
      windows:open !== null && close !== null && open !== close ? windowsFor(open,close) : null,lastEntry:null};
  }
  const text = String(place?.horaires || "").trim(), main = text.split("(")[0].trim();
  const closure = text.match(/ferm[ée]+\s+(?:le[s]?\s+)?([^)]*)/i)?.[1] || "";
  const weekday = validDate(date) ? WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()] : null;
  const closed = Boolean(weekday && !/certains|parfois|selon|féri/i.test(closure) && new RegExp(`\\b${weekday}\\b`,"i").test(closure));
  const entry = text.match(/derni[èe]re entr[ée]e\s*(\d{1,2})\s*[h:]\s*(\d{2})?/i);
  const lastEntry = entry ? catalogueTime(entry[1],entry[2]) : null;
  if (/^(?:24\s*h\s*\/\s*24|ouvert en continu|libre accès)(?:\s|$)/i.test(main) && !/,|;/.test(main)) return {source:"catalogue",text,closed,windows:[[0,1440]],lastEntry};
  // Les horaires saisonniers ou mêlant plusieurs équipements restent à vérifier.
  const ambiguous = /saisonn|nov|déc|fév|mars|avril|oct|été|hiver|lever|coucher|parc\s*:|palais\s*:|musée\s*|bureau du|ferry/i.test(text);
  const ranges = [...main.matchAll(/(\d{1,2})\s*[h:]\s*(\d{2})?\s*[-–à]\s*(\d{1,2})\s*[h:]\s*(\d{2})?/gi)];
  const windows = ambiguous || !ranges.length ? null : ranges.map(match => {
    const open = catalogueTime(match[1],match[2]), close = catalogueTime(match[3],match[4]);
    return windowsFor(open,close);
  }).flat().filter(([open,close]) => open < 1440 && close > open && close <= 2880);
  return {source:"catalogue",text,closed,windows:windows?.length ? windows : null,lastEntry};
}

export function reservationForActivity(activity, place) {
  const saved = activity?.planning?.reservation;
  if (["not_needed","to_book","booked"].includes(saved?.status)) return {...saved,source:"manual"};
  const text = `${place?.conseil || ""} ${place?.horaires || ""}`;
  const mentioned = /\br[ée]serv(?:ations?|er|ez|e)\b|\bcr[ée]neaux? r[ée]serv[ée]s?\b/i.test(text) && !/sans r[ée]serv|aucune réservation|pas de réservation/i.test(text);
  return {status:mentioned ? "to_book" : "not_needed",time:"",reference:"",source:"catalogue"};
}

function coordinates(place) {
  return place && Number.isFinite(place.lat) && Number.isFinite(place.lng) && Math.abs(place.lat) <= 90 && Math.abs(place.lng) <= 180;
}

export function haversineKm(a, b) {
  if (!coordinates(a) || !coordinates(b)) return null;
  const rad = value => value*Math.PI/180;
  const s = Math.sin(rad(b.lat-a.lat)/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lng-a.lng)/2)**2;
  return 6371*2*Math.asin(Math.sqrt(Math.min(1,s)));
}

export function transferMatches(transfer, previous, activity) {
  return transfer && String(transfer.fromActivityId) === String(previous?.id) && String(transfer.fromPlaceId) === String(previous?.lieuId) && String(transfer.toPlaceId) === String(activity?.lieuId);
}

export function estimateTransfer(previous, activity, previousPlace, place, defaultMode = "auto") {
  if (!previous) return null;
  const distanceKm = haversineKm(previousPlace,place);
  const saved = transferMatches(activity?.planning?.transfer,previous,activity) ? activity.planning.transfer : null;
  const requested = Object.hasOwn(TRANSPORT_MODES,saved?.mode) ? saved.mode : Object.hasOwn(TRANSPORT_MODES,defaultMode) ? defaultMode : "auto";
  const intercity = Boolean(previousPlace?.villeId && place?.villeId && previousPlace.villeId !== place.villeId && distanceKm > 30);
  const mode = requested === "auto" ? (distanceKm !== null && distanceKm <= 1.5 ? "walk" : intercity ? "train" : "transit") : requested;
  let minutes = null;
  if (distanceKm !== null) {
    const raw = mode === "walk" ? distanceKm*1.3/4*60 : mode === "train" ? distanceKm*1.2/100*60+30
      : mode === "car" ? distanceKm*1.3/(intercity ? 65 : 25)*60+10 : distanceKm*1.25/22*60+12;
    minutes = Math.max(distanceKm === 0 ? 0 : 5,Math.ceil(raw/5)*5);
  }
  const manual = Number.isInteger(saved?.minutes) && saved.minutes >= 0 && saved.minutes <= 720;
  const origin = coordinates(previousPlace) ? `${previousPlace.lat},${previousPlace.lng}` : previousPlace?.nom;
  const destination = coordinates(place) ? `${place.lat},${place.lng}` : place?.nom;
  const mapsMode = mode === "walk" ? "walking" : mode === "car" ? "driving" : "transit";
  return {mode,distanceKm,minutes:manual ? saved.minutes : minutes,source:manual ? "manual" : minutes === null ? "unknown" : "estimate",
    mapsUrl:origin && destination ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${mapsMode}` : null};
}

export function officialPlaceUrl(place) {
  const text = String(place?.site_web || "").trim();
  if (!text) return null;
  try { const url = new URL(/^[a-z]+:/i.test(text) ? text : `https://${text}`); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

/** Une chronologie commune aux journées, aux totaux et au mode sur place. */
export function tripDayMetrics(day, lieuById = {}, {date = null} = {}) {
  const activities = Array.isArray(day?.activites) ? day.activites : [], settings = day?.planning || {};
  const firstTime = parseTime(reservationForActivity(activities[0],lieuById[activities[0]?.lieuId]).time) ?? parseTime(activityFixedTime(activities[0]));
  const startMinutes = parseTime(settings.startTime) ?? Math.min(firstTime ?? 540,540), endLimit = parseTime(settings.endTime) ?? 1080;
  const buffer = Number.isInteger(settings.bufferMinutes) ? Math.max(0,Math.min(90,settings.bufferMinutes)) : 10;
  const pause = Number.isInteger(settings.breakMinutes) ? Math.max(0,Math.min(180,settings.breakMinutes)) : 45;
  const defaultMode = Object.hasOwn(TRANSPORT_MODES,settings.transportMode) ? settings.transportMode : "auto";
  const incomingMinutes=Number.isInteger(settings.arrivalMinutes) && settings.arrivalMinutes>=0 && settings.arrivalMinutes<=720 ? settings.arrivalMinutes : parseDurationMinutes(day?.arriveeVille?.duree) || 0;
  let cursor = startMinutes+incomingMinutes, km = 0, visitMinutes = 0, transferMinutes = incomingMinutes, pauseMinutes = 0, waitingMinutes = 0;
  const warnings = [], stops = [];
  for (const [index,activity] of activities.entries()) {
    const place = lieuById[activity.lieuId], previous = activities[index-1];
    const leg = estimateTransfer(previous,activity,lieuById[previous?.lieuId],place,defaultMode);
    const parsed = parseDurationMinutes(place?.duree), custom = activity.planning?.visitMinutes;
    const duration = Number.isInteger(custom) && custom > 0 && custom <= 720 ? custom : parsed > 0 ? parsed : place?.type === "dormir" ? 60 : 90;
    const durationEstimated = !(Number.isInteger(custom) && custom > 0) && !(parsed > 0);
    const stopWarnings = [];
    const warn = (code,message,level="warning") => { const warning = {code,message,level,activityId:activity.id}; stopWarnings.push(warning); warnings.push(warning); };
    const reservation=reservationForActivity(activity,place);
    const requestedTime=parseTime(activityFixedTime(activity));
    const fixedTime = reservation.status === "booked" ? parseTime(reservation.time) ?? requestedTime : requestedTime;
    let breakBefore = 0;
    if (index > 0 && !pauseMinutes && pause > 0 && cursor+(leg?.minutes ?? 30)+duration > 13*60 && (fixedTime === null || cursor+pause+(leg?.minutes ?? 30)+buffer <= fixedTime)) { breakBefore=pause; cursor+=pause; pauseMinutes+=pause; }
    if (leg) {
      km += leg.distanceKm || 0;
      const travel = leg.minutes ?? 30;
      cursor += travel+buffer;
      transferMinutes += travel;
      if (leg.source === "unknown") warn("unknown_transfer","Durée du trajet à renseigner ; 30 min provisoires sont comptées.","info");
    }
    const arrivalMinutes = cursor;
    if (reservation.status === "booked" && parseTime(reservation.time) !== null && requestedTime !== null && parseTime(reservation.time) !== requestedTime) warn("different_slot","Le créneau réservé diffère de l’heure imposée ; le créneau réservé est prioritaire.");
    const savedHours=activity.planning?.openingHours;
    const hoursDateChanged=Boolean(savedHours?.date && date && savedHours.date!==date);
    const opening = placeOpeningHours(place,date,hoursDateChanged?null:savedHours);
    if(hoursDateChanged)warn("hours_date","Tes horaires vérifiés concernent une autre date ; vérifie-les pour cette journée.");
    if(reservation.status==="booked"&&reservation.date&&date&&reservation.date!==date)warn("reservation_date",`La réservation est datée du ${reservation.date}, pas du ${date} : vérifie ton billet.`);
    let start = Math.max(arrivalMinutes,fixedTime ?? arrivalMinutes);
    if (fixedTime === null && opening.windows && !opening.closed) {
      const window = opening.windows.find(([open,close]) => Math.max(start,open)+duration <= close);
      if (window) start=Math.max(start,window[0]);
    }
    waitingMinutes += Math.max(0,start-arrivalMinutes);
    const end = start+duration;
    if (fixedTime !== null && arrivalMinutes > fixedTime) warn("late_arrival",`Arrivée estimée ${formatTime(arrivalMinutes)}, après le créneau de ${formatTime(fixedTime)} (${arrivalMinutes-fixedTime} min de retard).`);
    if (opening.closed) warn("closed_day","Le lieu est indiqué fermé ce jour : change la date ou vérifie l’ouverture.");
    else if (opening.windows && !opening.windows.some(([open,close]) => start >= open && end <= close)) warn("outside_hours","La visite dépasse les horaires d’ouverture indiqués : adapte l’heure ou la durée.");
    if (opening.lastEntry !== null && start > opening.lastEntry) warn("last_entry",`L’arrivée dépasse la dernière entrée indiquée à ${formatTime(opening.lastEntry)}.`);
    if (!opening.windows && !opening.closed) warn("unknown_hours",opening.text ? "Horaires variables ou incomplets : à confirmer sur le site du lieu." : "Horaires non renseignés : à vérifier avant la visite.","info");
    if (reservation.status === "to_book") warn("reservation",reservation.source === "catalogue" ? "Réservation conseillée dans la fiche : vérifie les conditions et les places disponibles." : "Réservation restant à effectuer.");
    if (durationEstimated) warn("unknown_duration",`Durée de visite non renseignée : ${duration} min estimées, à ajuster.`,"info");
    if (leg?.distanceKm > 20 && leg.mode === "walk") warn("long_walk","Ce déplacement à pied est très long : choisis un autre mode de transport.");
    cursor=end;
    visitMinutes+=duration;
    stops.push({activity,place,leg,duration,durationEstimated,opening,reservation,arrivalMinutes,startMinutes:start,endMinutes:end,fixedMinutes:fixedTime,
      time:formatTime(start),timeLabel:`${formatTime(start)}${fixedTime !== null && start > fixedTime ? ` (prévu ${formatTime(fixedTime)})` : ""}`,breakBefore,warnings:stopWarnings});
  }
  if(stops.length && !pauseMinutes && pause>0 && cursor>13*60){cursor+=pause;pauseMinutes=pause;warnings.push({code:"late_break",message:"La pause est comptée après la dernière visite : libère un créneau pour déjeuner plus tôt.",level:"info"});}
  const totalMinutes = stops.length ? cursor-startMinutes : 0;
  if (stops.length && cursor > endLimit) warnings.push({code:"day_end",message:`Fin estimée à ${formatTime(cursor)}, après la fin souhaitée à ${formatTime(endLimit)}.`,level:"warning"});
  return {places:stops.map(stop => stop.place).filter(Boolean),km,totalMinutes,overloaded:totalMinutes > 540 || (stops.length > 0 && cursor > endLimit),stops,warnings,date,startMinutes,endMinutes:cursor,endLimit,
    visitMinutes,transferMinutes,bufferMinutes:Math.max(0,activities.length-1)*buffer,pauseMinutes,waitingMinutes,
    incomingMinutes,unknownTransfers:stops.filter(stop => stop.leg?.source === "unknown").length};
}
