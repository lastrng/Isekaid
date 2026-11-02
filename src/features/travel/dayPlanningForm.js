import { TRANSPORT_MODES, activityFixedTime, formatTime, parseDurationMinutes, parseTime, reservationForActivity, transferMatches, tripDayMetrics, validDate } from "./daySchedule.js";

export function createDayPlanningDraft(day, places = {}, {date=null} = {}) {
  return {
    startTime:day?.planning?.startTime || formatTime(tripDayMetrics(day,places).startMinutes), endTime:day?.planning?.endTime || "18:00",
    transportMode:day?.planning?.transportMode || "auto", bufferMinutes:String(day?.planning?.bufferMinutes ?? 10),
    breakMinutes:String(day?.planning?.breakMinutes ?? 45),
    arrivalMinutes:String(day?.planning?.arrivalMinutes ?? parseDurationMinutes(day?.arriveeVille?.duree) ?? 0),
    activities:Object.fromEntries((day?.activites || []).map((activity,index) => {
      const previous = day.activites[index-1];
      const transfer = transferMatches(activity.planning?.transfer,previous,activity) ? activity.planning.transfer : null;
      const reservation = reservationForActivity(activity,places[activity.lieuId]);
      const hours = activity.planning?.openingHours;
      return [activity.id,{
        fixedTime:activityFixedTime(activity), visitMinutes:String(activity.planning?.visitMinutes ?? ""),
        transferMode:transfer?.mode || "auto", transferMinutes:String(transfer?.minutes ?? ""),
        overrideHours:Boolean(hours), open:hours?.open || "", close:hours?.close || "", closed:hours?.closed === true,
        hoursDate:hours?.date || date || "", reservationDate:reservation.date || date || "",
        reservationStatus:reservation.status, reservationTime:reservation.time || "", reference:reservation.reference || "",
      }];
    })),
  };
}

function integer(value, min, max, label, optional = false) {
  if (optional && value === "") return undefined;
  const number = Number(value);
  if (value === "" || !Number.isInteger(number) || number < min || number > max) throw new Error(`${label} : indique un nombre entre ${min} et ${max}.`);
  return number;
}

function time(value, label, optional = false) {
  if (optional && !value) return "";
  if (parseTime(value) === null) throw new Error(`${label} : indique une heure valide.`);
  return value;
}

/** Applique uniquement les champs du formulaire aux données les plus récentes. */
export function applyDayPlanning(day, draft) {
  const startTime = time(draft.startTime,"Début de journée"), endTime = time(draft.endTime,"Fin de journée");
  if (parseTime(endTime) <= parseTime(startTime)) throw new Error("La fin de journée doit être après le début.");
  if (!Object.hasOwn(TRANSPORT_MODES,draft.transportMode)) throw new Error("Choisis un mode de déplacement valide.");
  const planning = {...day.planning,startTime,endTime,transportMode:draft.transportMode,
    bufferMinutes:integer(draft.bufferMinutes,0,90,"Marge entre les visites"),breakMinutes:integer(draft.breakMinutes,0,180,"Pause"),arrivalMinutes:integer(draft.arrivalMinutes,0,720,"Trajet vers la ville")};
  const activites = (day.activites || []).map((activity,index) => {
    const input = draft.activities[activity.id];
    if (!input) return activity;
    const next = {...activity.planning};
    const visitMinutes = integer(input.visitMinutes,1,720,"Durée de visite",true);
    if (visitMinutes === undefined) delete next.visitMinutes; else next.visitMinutes=visitMinutes;
    if (index > 0) {
      if (!Object.hasOwn(TRANSPORT_MODES,input.transferMode)) throw new Error("Choisis un mode de trajet valide.");
      const previous = day.activites[index-1];
      next.transfer={mode:input.transferMode,fromActivityId:previous.id,fromPlaceId:previous.lieuId,toPlaceId:activity.lieuId};
      const minutes = integer(input.transferMinutes,0,720,"Durée du trajet",true);
      if (minutes !== undefined) next.transfer.minutes=minutes;
    } else delete next.transfer;
    if (input.overrideHours) {
      if(input.hoursDate&&!validDate(input.hoursDate))throw new Error("Indique une date valide pour les horaires vérifiés.");
      next.openingHours={closed:input.closed === true,open:time(input.open,"Ouverture",input.closed),close:time(input.close,"Fermeture",input.closed)};
      if(input.hoursDate)next.openingHours.date=input.hoursDate;
      if (!input.closed && next.openingHours.open === next.openingHours.close) throw new Error("Choisis des heures d’ouverture et de fermeture différentes.");
    } else delete next.openingHours;
    if (!["not_needed","to_book","booked"].includes(input.reservationStatus)) throw new Error("Choisis un statut de réservation valide.");
    const reference=String(input.reference || "").trim();
    if (reference.length > 200) throw new Error("La référence de réservation est limitée à 200 caractères.");
    next.reservation={status:input.reservationStatus,time:input.reservationStatus === "booked" ? time(input.reservationTime,"Créneau réservé",true) : "",reference:input.reservationStatus === "booked" ? reference : ""};
    if(input.reservationStatus==="booked"&&input.reservationDate){if(!validDate(input.reservationDate))throw new Error("Indique une date valide pour ta réservation.");next.reservation.date=input.reservationDate;}
    return {...activity,heure:time(input.fixedTime,"Heure imposée",true),planning:next};
  });
  return {...day,planning,activites};
}
