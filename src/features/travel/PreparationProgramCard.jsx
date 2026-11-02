import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, Clock } from "lucide-react";
import { buildPreparationProgram } from "./preparationProgram.js";
import { ProductCard } from "../shared/ProductUI.jsx";
import "./preparationProgram.css";

const dateLabel = value => new Intl.DateTimeFormat("fr-FR", { day:"numeric", month:"short", timeZone:"UTC" }).format(new Date(`${value}T00:00:00Z`));

export function PreparationProgramCard({ C, trip, db, scenarioProgress, readingProgress, onAction }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setCurrentDate(new Date());
    const timer = setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const model = buildPreparationProgram({ trip, db, scenarioProgress, readingProgress, currentDate });
  if (!model) return null;
  if (model.state === "undated") return <ProductCard C={C} as="section" variant="quiet" className="preparation-program" aria-label="Mon programme avant le départ">
    <div className="preparation-program__eyebrow"><CalendarDays size={15} aria-hidden/> MON PROGRAMME AVANT LE DÉPART</div>
    <h3>Une petite action à la fois</h3>
    <p>Ajoute tes dates pour recevoir un programme adapté à ton départ et aux lieux de ton voyage.</p>
    <button type="button" className="preparation-program__action" onClick={() => onAction?.(model.action)}>{model.action.label}<ArrowRight size={15} aria-hidden/></button>
  </ProductCard>;
  const phases = [...new Set(model.tasks.map(task => task.phase))];
  return <ProductCard C={C} as="section" variant="quiet" className="preparation-program" aria-label="Mon programme avant le départ">
    <div className="preparation-program__eyebrow"><CalendarDays size={15} aria-hidden/> MON PROGRAMME AVANT LE DÉPART</div>
    <div className="preparation-program__heading"><h3>Un pas de plus vers le Japon</h3><span>J-{model.daysUntil}</span></div>
    <p className="preparation-program__trip">{model.tripTitle} · départ le {dateLabel(model.departure)}</p>
    <div className="preparation-program__progress-label" role="status" aria-live="polite">{model.completed} sur {model.total} actions accomplies</div>
    <div className="preparation-program__progress" role="progressbar" aria-label="Progression du programme avant départ" aria-valuemin={0} aria-valuemax={100} aria-valuenow={model.percent}><span style={{width:`${model.percent}%`}}/></div>
    {model.next ? <div className="preparation-program__next">
      <div className="preparation-program__next-label">{model.nextLabel}</div>
      <h4>{model.next.title}</h4>
      <p>{model.next.reason}</p>
      <p>{model.next.description}</p>
      <span className="preparation-program__duration"><Clock size={12} aria-hidden/> Environ {model.next.minutes} min{!model.next.due ? ` · conseillé dès le ${dateLabel(model.next.date)}` : ""}</span>
      <button type="button" className="preparation-program__action" onClick={() => onAction?.(model.next.action)}>{model.next.action.label}<ArrowRight size={15} aria-hidden/></button>
    </div> : <div className="preparation-program__complete" role="status"><Check size={20} aria-hidden/><div><strong>Tes actions de préparation sont terminées</strong><p>Tu peux revoir les conseils ou continuer à enrichir ton itinéraire.</p></div></div>}
    <details className="preparation-program__calendar">
      <summary>Voir mon programme<ChevronDown size={15} aria-hidden/></summary>
      <p>Avance à ton rythme. Les dates sont des repères : tu peux commencer une action plus tôt. Tes scénarios terminés, lectures marquées comme lues et préparatifs cochés sont pris en compte automatiquement.</p>
      {phases.map(phase => <div className="preparation-program__phase" key={phase}>
        <h4>{phase}</h4>
        <ol>{model.tasks.filter(task => task.phase === phase).map(task => <li key={task.id}>
          <button type="button" className={`preparation-program__task${task.done ? " preparation-program__task--done" : ""}`} onClick={() => onAction?.(task.action)}>
            <span className="preparation-program__task-status" aria-hidden>{task.done ? <Check size={14}/> : <span/>}</span>
            <span className="preparation-program__task-copy"><strong>{task.title}</strong><small>{task.done ? "Accompli" : `${dateLabel(task.date)} · J-${task.daysBefore}${task.due ? " · à faire" : ""}`}</small></span>
            <ArrowRight size={14} aria-hidden/>
          </button>
        </li>)}</ol>
      </div>)}
    </details>
  </ProductCard>;
}
