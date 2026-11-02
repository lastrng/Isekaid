import { cloneElement, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Clock, Settings2 } from "lucide-react";
import { productTheme } from "../shared/ProductUI.jsx";
import { TRANSPORT_MODES, formatTime, officialPlaceUrl, tripDayMetrics } from "./daySchedule.js";
import { applyDayPlanning, createDayPlanningDraft } from "./dayPlanningForm.js";
import "./dayPlanning.css";

export function durationLabel(minutes) {
  const hours=Math.floor(minutes/60), rest=minutes%60;
  return hours ? `${hours} h${rest ? ` ${String(rest).padStart(2,"0")}` : ""}` : `${rest} min`;
}

function Warnings({warnings}) {
  if (!warnings.length) return null;
  return <ul className="day-planning__warnings">{warnings.map((warning,index) => <li key={`${warning.code}:${index}`} className={warning.level === "info" ? "day-planning__info" : ""}><AlertTriangle size={13} aria-hidden/><span>{warning.message}</span></li>)}</ul>;
}

export function DayScheduleSummary({ C, schedule, onEdit }) {
  if (!schedule.stops.length) return null;
  const alerts=schedule.warnings.filter(warning => warning.level === "warning");
  return <section className="day-planning-summary" style={productTheme(C)} aria-label="Faisabilité de ma journée">
    <div className="day-planning-summary__heading"><strong>{formatTime(schedule.startMinutes)} → {formatTime(schedule.endMinutes)}</strong><span>{durationLabel(schedule.totalMinutes)}</span></div>
    <p>{durationLabel(schedule.visitMinutes)} de visites · {durationLabel(schedule.transferMinutes)} de trajets</p>
    {schedule.incomingMinutes>0&&<p>Dont {durationLabel(schedule.incomingMinutes)} pour rejoindre la ville avant les visites.</p>}
    <p>{durationLabel(schedule.bufferMinutes)} de marge · {durationLabel(schedule.pauseMinutes)} de pause{schedule.waitingMinutes ? ` · ${durationLabel(schedule.waitingMinutes)} d’attente` : ""}</p>
    {schedule.overloaded&&<p className="day-planning-summary__alert">Journée chargée : ajuste une durée ou déplace une visite.</p>}
    {alerts.length>0&&<details><summary>{alerts.length} point{alerts.length>1?"s":""} à vérifier</summary><Warnings warnings={alerts}/></details>}
    <p className="day-planning__hint">Trajets estimés, horaires indicatifs. Vérifie les horaires du jour et les réservations.</p>
    <button type="button" className="day-planning__edit" onClick={onEdit}><Settings2 size={15} aria-hidden/> Organiser les horaires<ArrowRight size={15} aria-hidden/></button>
  </section>;
}

export function TransferSummary({ leg, breakBefore = 0 }) {
  if (!leg) return null;
  return <div className="day-planning-transfer">
    {breakBefore>0&&<span>Pause prévue · {durationLabel(breakBefore)}</span>}
    <span>↓ {TRANSPORT_MODES[leg.mode]} · {leg.minutes === null ? "durée à préciser" : `${durationLabel(leg.minutes)} ${leg.source === "manual" ? "renseignées" : "estimées"}`}</span>
    {leg.mapsUrl&&<a href={leg.mapsUrl} target="_blank" rel="noopener noreferrer">Vérifier dans Maps ↗</a>}
  </div>;
}

export function ActivityScheduleBadge({ stop, onEdit }) {
  if (!stop) return null;
  const problems=stop.warnings.filter(warning => warning.level === "warning");
  return <div className="day-planning-badge" onClick={event => event.stopPropagation()}>
    <button type="button" onClick={onEdit} aria-label={`Modifier les horaires de ${stop.place?.nom || "cette visite"}`}><Clock size={12} aria-hidden/> {stop.time}–{formatTime(stop.endMinutes)}{stop.reservation.status === "booked" ? " · réservation enregistrée" : ""}</button>
    {problems.length>0&&<span>{problems[0].message}</span>}
  </div>;
}

function Field({label,children}) { return <label className="day-planning__field"><span>{label}</span>{cloneElement(children,{"aria-label":label})}</label>; }
function ModeSelect({value,onChange,...props}) { return <select {...props} value={value} onChange={event => onChange(event.target.value)}>{Object.entries(TRANSPORT_MODES).map(([id,label]) => <option value={id} key={id}>{label}</option>)}</select>; }

export function DayPlanningScreen({ C, day, places, date, onSave, onBack, initialActivityId }) {
  const [draft,setDraft]=useState(() => createDayPlanningDraft(day,places,{date}));
  const [error,setError]=useState("");
  const setDay=(key,value) => {setError("");setDraft(previous => ({...previous,[key]:value}));};
  const setActivity=(id,key,value) => {setError("");setDraft(previous => ({...previous,activities:{...previous.activities,[id]:{...previous.activities[id],[key]:value}}}));};
  let previewDay=day;
  try { previewDay=applyDayPlanning(day,draft); } catch { /* Le formulaire conserve les champs en cours de saisie. */ }
  const schedule=tripDayMetrics(previewDay,places,{date});
  const save=event => {
    event.preventDefault();
    try { if (onSave(applyDayPlanning(day,draft)) === false) throw new Error("Enregistrement impossible. Tes réglages restent affichés ; libère de l’espace puis réessaie."); }
    catch (failure) {setError(failure.message);}
  };
  return <div className="day-planning-screen" style={productTheme(C)}>
    <header><button type="button" onClick={onBack}><ArrowLeft size={16} aria-hidden/> Ma journée</button><h1>Horaires et trajets</h1><p>Jour {day.num}{date ? ` · ${new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"long",timeZone:"UTC"}).format(new Date(`${date}T12:00:00Z`))}` : " · dates à définir"}</p></header>
    <form onSubmit={save}>
      <section className="day-planning__card"><h2>Le rythme de ma journée</h2>
        <div className="day-planning__grid">
          <Field label="Début de journée"><input type="time" required value={draft.startTime} onChange={event => setDay("startTime",event.target.value)}/></Field>
          <Field label="Fin souhaitée"><input type="time" required value={draft.endTime} onChange={event => setDay("endTime",event.target.value)}/></Field>
          <Field label="Marge entre les visites (min)"><input type="number" min="0" max="90" required value={draft.bufferMinutes} onChange={event => setDay("bufferMinutes",event.target.value)}/></Field>
          <Field label="Pause en journée (min)"><input type="number" min="0" max="180" required value={draft.breakMinutes} onChange={event => setDay("breakMinutes",event.target.value)}/></Field>
        </div>
        <Field label="Mode de déplacement habituel"><ModeSelect value={draft.transportMode} onChange={value => setDay("transportMode",value)}/></Field>
        <Field label="Trajet vers cette ville avant les visites (min)"><input type="number" min="0" max="720" required value={draft.arrivalMinutes} onChange={event => setDay("arrivalMinutes",event.target.value)}/></Field>
        <p className="day-planning__hint">La pause est placée entre les visites à l’approche du déjeuner. Les estimations de transport incluent l’accès et l’attente moyens ; la marge s’ajoute pour les imprévus.</p>
      </section>
      <section className="day-planning__card" aria-label="Aperçu de la journée"><h2>Fin estimée · {formatTime(schedule.endMinutes)}</h2><p>{durationLabel(schedule.visitMinutes)} de visites · {durationLabel(schedule.transferMinutes)} de trajets · {durationLabel(schedule.totalMinutes)} au total</p><Warnings warnings={schedule.warnings.filter(warning => warning.level === "warning")}/></section>
      {day.activites.map((activity,index) => {
        const input=draft.activities[activity.id] || createDayPlanningDraft(day,places,{date}).activities[activity.id], stop=schedule.stops[index], place=places[activity.lieuId];
        const url=officialPlaceUrl(place);
        return <details className="day-planning__card day-planning__stop" key={activity.id} open={initialActivityId === activity.id || undefined}>
          <summary><span><strong>{index+1}. {place?.nom || activity.nom || "Lieu à préciser"}</strong><small>{stop?.time}–{formatTime(stop?.endMinutes)}</small></span><Settings2 size={16} aria-hidden/></summary>
          {index>0&&<><h3>Trajet depuis {places[day.activites[index-1].lieuId]?.nom || "l’étape précédente"}</h3><TransferSummary leg={stop?.leg}/><div className="day-planning__grid">
            <Field label="Mode pour ce trajet"><ModeSelect value={input.transferMode} onChange={value => setActivity(activity.id,"transferMode",value)}/></Field>
            <Field label="Durée vérifiée du trajet (min)"><input type="number" min="0" max="720" value={input.transferMinutes} placeholder={stop?.leg?.minutes === null ? "À renseigner" : String(stop?.leg?.minutes ?? "")} onChange={event => setActivity(activity.id,"transferMinutes",event.target.value)}/></Field>
          </div><p className="day-planning__hint">Laisse la durée vide pour conserver l’estimation. Une durée vérifiée ne sera réutilisée que pour ce même trajet.</p></>}
          <h3>Ma visite</h3><div className="day-planning__grid">
            <Field label="Heure imposée (facultatif)"><input type="time" value={input.fixedTime} onChange={event => setActivity(activity.id,"fixedTime",event.target.value)}/></Field>
            <Field label="Durée de visite (min)"><input type="number" min="1" max="720" value={input.visitMinutes} placeholder={String(stop?.duration || 90)} onChange={event => setActivity(activity.id,"visitMinutes",event.target.value)}/></Field>
          </div>
          <p className="day-planning__hint">Sans heure imposée, la visite suit les étapes précédentes et les horaires d’ouverture connus.</p>
          <h3>Ouverture du lieu</h3><p>{place?.horaires || "Horaires non renseignés dans le catalogue."}</p>
          {url&&<a href={url} target="_blank" rel="noopener noreferrer">Vérifier sur le site du lieu ↗</a>}
          <label className="day-planning__check"><input type="checkbox" checked={input.overrideHours} onChange={event => setActivity(activity.id,"overrideHours",event.target.checked)}/> Utiliser mes horaires vérifiés pour ce jour</label>
          {input.overrideHours&&<><Field label="Date des horaires vérifiés"><input type="date" value={input.hoursDate} onChange={event => setActivity(activity.id,"hoursDate",event.target.value)}/></Field><label className="day-planning__check"><input type="checkbox" checked={input.closed} onChange={event => setActivity(activity.id,"closed",event.target.checked)}/> Fermé ce jour</label>{!input.closed&&<div className="day-planning__grid"><Field label="Ouverture"><input type="time" required value={input.open} onChange={event => setActivity(activity.id,"open",event.target.value)}/></Field><Field label="Fermeture"><input type="time" required value={input.close} onChange={event => setActivity(activity.id,"close",event.target.value)}/></Field></div>}</>}
          <h3>Réservation</h3><Field label="Statut de réservation"><select value={input.reservationStatus} onChange={event => setActivity(activity.id,"reservationStatus",event.target.value)}><option value="not_needed">Aucune nécessaire</option><option value="to_book">À réserver / à vérifier</option><option value="booked">Réservation enregistrée</option></select></Field>
          {input.reservationStatus === "booked"&&<><Field label="Date de réservation"><input type="date" value={input.reservationDate} onChange={event => setActivity(activity.id,"reservationDate",event.target.value)}/></Field><div className="day-planning__grid"><Field label="Créneau réservé (facultatif)"><input type="time" value={input.reservationTime} onChange={event => setActivity(activity.id,"reservationTime",event.target.value)}/></Field><Field label="Référence (facultative)"><input maxLength={200} value={input.reference} onChange={event => setActivity(activity.id,"reference",event.target.value)}/></Field></div></>}
          <p className="day-planning__hint">Ce suivi enregistre tes informations ; il ne réserve aucun billet.</p><Warnings warnings={stop?.warnings || []}/>
        </details>;
      })}
      <p className="day-planning__hint">Les horaires du catalogue sont indicatifs. Les estimations ne tiennent pas compte du trafic, des horaires de train ni des fermetures exceptionnelles.</p>
      {error&&<p role="alert" className="day-planning__error">{error}</p>}
      <div className="day-planning__footer"><button type="submit">Enregistrer les horaires</button><button type="button" onClick={onBack}>Annuler</button></div>
    </form>
  </div>;
}
