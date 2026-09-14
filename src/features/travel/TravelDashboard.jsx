import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, CheckSquare, ChevronRight, FileText, Map, MapPin, NotebookPen, Plus, Route, ShieldAlert, WifiOff } from "lucide-react";
import { TRAVEL_DASHBOARD_STATE } from "./travelDashboardModel.js";

const ACTION_ICONS = { calendar:CalendarDays, route:Route, pin:MapPin, day:CalendarDays, check:CheckSquare, book:BookOpen, info:FileText };

function SectionHeading({eyebrow,title,action}) {
  return <div className="travel-dashboard__section-heading"><div><div className="isekaid-eyebrow">{eyebrow}</div>{title&&<h2>{title}</h2>}</div>{action}</div>;
}

function TripHeader({model,onOpenAll,guideRef}) {
  const canChange=model.otherTrips.length>0;
  return <header ref={guideRef} className="travel-dashboard__header"><div><h1>Voyage</h1><p>{model.state===TRAVEL_DASHBOARD_STATE.ACTIVE_TRIP?"Isekaid t’accompagne au Japon":"Prépare ton voyage au Japon"}</p></div>{canChange&&<button type="button" className="travel-dashboard__quiet-action" onClick={onOpenAll}>Changer</button>}</header>;
}

function PrimaryButton({children,onClick,secondary=false,buttonRef}) {
  return <button ref={buttonRef} type="button" className={`travel-dashboard__primary${secondary?" travel-dashboard__primary--secondary":""}`} onClick={onClick}>{children}<ChevronRight size={16} aria-hidden/></button>;
}

function SosCard({onOpen,buttonRef}) {
  return <button ref={buttonRef} type="button" className="travel-dashboard__sos isekaid-interactive" onClick={onOpen}><span className="travel-dashboard__sos-icon"><ShieldAlert size={21} aria-hidden/></span><span><strong>SOS Japon</strong><small>Phrases essentielles · disponible hors ligne</small></span><ChevronRight size={18} aria-hidden/></button>;
}

function OtherTrips({count,onCreate,onOpenAll,createRef}) {
  return <section className="travel-dashboard__other" aria-label="Autres voyages"><SectionHeading eyebrow="AUTRES VOYAGES" action={<button ref={createRef} type="button" className="travel-dashboard__new" onClick={onCreate}><Plus size={15} aria-hidden/> Nouveau</button>}/>{count>0&&<button type="button" className="travel-dashboard__other-link" onClick={onOpenAll}>Voir mes {count} autre{count>1?"s":""} voyage{count>1?"s":""}<ChevronRight size={16} aria-hidden/></button>}</section>;
}

function EmptyDashboard({templates,keptPlacesCount,onCreate,onBrowse,onPreviewTemplate,onOpenKept,createRef,templateRef}) {
  return <>
    <section className="travel-dashboard__empty isekaid-card isekaid-card--passport"><div className="isekaid-eyebrow">TON JAPON COMMENCE ICI</div><h2>Prépare ton voyage à ton rythme.</h2><p>Quelques villes, quelques jours, puis ton itinéraire prendra forme.</p><PrimaryButton buttonRef={createRef} onClick={onCreate}>Créer mon voyage</PrimaryButton></section>
    {templates.length>0&&<section ref={templateRef}><SectionHeading eyebrow="ITINÉRAIRES PRÉCONÇUS" action={<button type="button" className="travel-dashboard__text-action" onClick={onBrowse}>Tout voir</button>}/><div className="travel-dashboard__templates">{templates.slice(0,3).map(template=><button type="button" key={template.id} className="travel-dashboard__template" onClick={()=>onPreviewTemplate(template)}><span aria-hidden>{template.emoji||"🧳"}</span><strong>{template.titre}</strong><small>{template.duree} jours</small></button>)}</div></section>}
    {keptPlacesCount>0&&<button type="button" className="travel-dashboard__saved" onClick={onOpenKept}><MapPin size={18} aria-hidden/><span><strong>Mes lieux sauvegardés</strong><small>{keptPlacesCount} point{keptPlacesCount>1?"s":""} de départ pour construire un séjour</small></span><ChevronRight size={17} aria-hidden/></button>}
  </>;
}

function PreTripCard({model,onOpenTrip}) {
  const {trip,stats,timing,progress}=model;
  const dateLine=timing?.status==="upcoming" ? (timing.daysUntil===0?"Départ aujourd’hui":`Départ dans ${timing.daysUntil} jour${timing.daysUntil>1?"s":""}`) : "Dates à définir";
  return <section className="travel-dashboard__trip-card isekaid-card isekaid-card--passport"><div className="isekaid-eyebrow">AVANT LE VOYAGE</div><h2>{trip.titre||"Mon voyage au Japon"}</h2><p className="travel-dashboard__summary">{stats.days} jour{stats.days>1?"s":""} · {stats.places} lieu{stats.places>1?"x":""}{stats.cities?` · ${stats.cities} ville${stats.cities>1?"s":""}`:""}</p><p className="travel-dashboard__timing">{dateLine}</p><div className="travel-dashboard__progress-label"><span>Préparation</span><strong>{progress} %</strong></div><div className="travel-dashboard__progress" role="progressbar" aria-label="Progression de la préparation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{width:`${progress}%`}}/></div><PrimaryButton onClick={()=>onOpenTrip(trip.id,"summary")}>Continuer la préparation</PrimaryButton></section>;
}

function NextAction({action,onAction}) {
  if(!action)return null;
  const Icon=ACTION_ICONS[action.icon]||Route;
  return <section><SectionHeading eyebrow="À FAIRE MAINTENANT"/><button type="button" className="travel-dashboard__next isekaid-card isekaid-card--paper isekaid-interactive" onClick={()=>onAction(action)}><span className="travel-dashboard__next-icon"><Icon size={20} aria-hidden/></span><span><strong>{action.title}</strong><small>{action.description}</small><em>{action.label} <span aria-hidden>→</span></em></span></button></section>;
}

const TOOLS=[
  {id:"summary",label:"Itinéraire",Icon:Route},
  {id:"day",label:"Journées",Icon:CalendarDays},
  {id:"checklist",label:"Checklist",Icon:CheckSquare},
  {id:"practical",label:"Infos pratiques",Icon:FileText},
];
function EssentialTools({tripId,onOpenTrip}) {
  return <section><SectionHeading eyebrow="MON VOYAGE"/><div className="travel-dashboard__tools">{TOOLS.map(({id,label,Icon})=><button type="button" key={id} onClick={()=>onOpenTrip(tripId,id)}><Icon size={18} aria-hidden/><span>{label}</span></button>)}</div></section>;
}

function PreTripDashboard(props) {
  const {model,onOpenTrip,onAction,onCreate,onOpenAll,createRef}=props;
  return <><PreTripCard model={model} onOpenTrip={onOpenTrip}/><NextAction action={model.nextAction} onAction={onAction}/><EssentialTools tripId={model.trip.id} onOpenTrip={onOpenTrip}/><OtherTrips createRef={createRef} count={model.otherTrips.length} onCreate={onCreate} onOpenAll={onOpenAll}/></>;
}

function ActiveDashboard({model,onOpenTrip,onOpenPhrases}) {
  const {trip,active,offlineReady}=model;
  const next=active.next;
  return <>
    <section className="travel-dashboard__active-hero isekaid-card isekaid-card--passport"><div className="isekaid-eyebrow">AUJOURD’HUI À {(active.city?.nom||"JAPON").toUpperCase()}</div><h2>{active.dateLabel}</h2><p>Jour {model.timing?.dayNumber||active.day?.num||1} sur {trip.jours?.length||1} · {trip.titre}</p>{offlineReady&&<span className="travel-dashboard__offline"><WifiOff size={13} aria-hidden/> Prêt hors ligne</span>}</section>
    <section><SectionHeading eyebrow="PROCHAINE ÉTAPE"/><div className="travel-dashboard__next-stop isekaid-card isekaid-card--paper">{next?<><div className="travel-dashboard__next-time">{next.time||"À suivre"}</div><h2>{next.title}</h2>{active.minutesUntil!==null&&<p>Dans {active.minutesUntil} min</p>}<PrimaryButton onClick={()=>onOpenTrip(trip.id,"day")}>Voir ma journée</PrimaryButton></>:<><h2>{active.progress.isComplete?"Ta journée est terminée":"Ta journée est libre"}</h2><p>{active.progress.isComplete?"Toutes les étapes prévues sont cochées.":"Ajoute une envie à ton programme quand tu le souhaites."}</p><PrimaryButton onClick={()=>onOpenTrip(trip.id,"day")}>Ouvrir ma journée</PrimaryButton></>}</div></section>
    {active.following.length>0&&<section><SectionHeading eyebrow="ENSUITE"/><div className="travel-dashboard__following">{active.following.map((activity,index)=><div key={activity.id||index}><span>{activity.time||`${index+2}.`}</span><strong>{activity.title}</strong></div>)}</div></section>}
    <section><SectionHeading eyebrow="ACCÈS RAPIDES"/><div className="travel-dashboard__active-tools"><button type="button" onClick={()=>onOpenTrip(trip.id,"summary")}><Map size={18} aria-hidden/><span>Carte</span></button><button type="button" onClick={()=>onOpenTrip(trip.id,"day")}><CalendarDays size={18} aria-hidden/><span>Ma journée</span></button><button type="button" onClick={onOpenPhrases}><BookOpen size={18} aria-hidden/><span>Japonais</span></button><button type="button" onClick={()=>onOpenTrip(trip.id,"practical")}><FileText size={18} aria-hidden/><span>Infos</span></button></div></section>
  </>;
}

function PostDashboard({model,onOpenTrip,onOpenMyJapan,onResolveTrip,onCreate,onOpenAll,createRef}) {
  const awaiting=model.lifecycle==="awaiting_confirmation";
  return <>
    <section className="travel-dashboard__post isekaid-card isekaid-card--passport"><div className="isekaid-eyebrow">APRÈS LE VOYAGE</div><h2>{model.trip.titre||"Mon voyage au Japon"}</h2><p>Voyage terminé</p><div className="travel-dashboard__post-stats"><span><strong>{model.stats.days}</strong> jours</span><span><strong>{model.stats.visitedPlaces}</strong> lieux visités</span><span><strong>{model.stats.visitedPrefectures}</strong> préfectures</span></div>{awaiting&&<div className="travel-dashboard__confirm"><strong>Ce voyage a-t-il bien eu lieu ?</strong><div><button type="button" onClick={()=>onResolveTrip(model.trip.id,true)}>Oui, effectué</button><button type="button" onClick={()=>onResolveTrip(model.trip.id,false)}>Non</button></div></div>}<PrimaryButton onClick={()=>onOpenTrip(model.trip.id,"carnet")}><NotebookPen size={16} aria-hidden/> Compléter mon carnet</PrimaryButton><PrimaryButton secondary onClick={onOpenMyJapan}>Voir mes souvenirs</PrimaryButton></section>
    <OtherTrips createRef={createRef} count={model.otherTrips.length} onCreate={onCreate} onOpenAll={onOpenAll}/>
  </>;
}

export function TravelDashboard(props) {
  const {model}=props;
  const [online,setOnline]=useState(()=>globalThis.navigator?.onLine!==false);
  useEffect(()=>{const update=()=>setOnline(navigator.onLine!==false);window.addEventListener("online",update);window.addEventListener("offline",update);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update);};},[]);
  return <div className="travel-dashboard"><TripHeader model={model} onOpenAll={props.onOpenAll}/><main className="travel-dashboard__content isekaid-screen-enter">{!online&&<div className="travel-dashboard__network" role="status"><WifiOff size={14} aria-hidden/> Hors connexion · tes données locales restent disponibles</div>}<SosCard buttonRef={props.sosRef} onOpen={props.onOpenSos}/>{model.state===TRAVEL_DASHBOARD_STATE.NO_TRIP&&<EmptyDashboard {...props}/>} {model.state===TRAVEL_DASHBOARD_STATE.PRE_TRIP&&<PreTripDashboard {...props}/>} {model.state===TRAVEL_DASHBOARD_STATE.ACTIVE_TRIP&&<ActiveDashboard {...props}/>} {model.state===TRAVEL_DASHBOARD_STATE.POST_TRIP&&<PostDashboard {...props}/>}</main></div>;
}
