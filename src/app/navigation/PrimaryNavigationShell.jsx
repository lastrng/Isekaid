import { useEffect, useState } from "react";
import { BottomNav } from "./BottomNav.jsx";
import { PRIMARY_NAV_ITEMS, primaryDestination, retainVisitedRoutes } from "./destinations.js";
import { productTheme } from "../../features/shared/ProductUI.jsx";

const LABELS = Object.freeze(Object.fromEntries(PRIMARY_NAV_ITEMS.map(item=>[item.id,item.label])));

/**
 * Coquille des cinq espaces produit.
 *
 * Une route n'est chargée qu'à sa première ouverture. Elle reste ensuite
 * montée et simplement masquée : état React, formulaires, sous-écran et
 * position de défilement survivent donc aux changements d'onglet.
 */
export function PrimaryNavigationShell({
  C,
  activeRoute,
  onNavigate,
  routes,
  pulseTab,
  onPulseEnd,
}) {
  const [visitedRoutes,setVisitedRoutes] = useState(()=>retainVisitedRoutes([],activeRoute));

  useEffect(()=>{
    setVisitedRoutes(previous=>retainVisitedRoutes(previous,activeRoute));
  },[activeRoute]);

  return <>
    <main className="isekaid-route-stack" style={productTheme(C,{position:"absolute",inset:"0 0 var(--isekaid-route-height) 0",overflow:"hidden"})}>
      {routes.map(route=>{
        const active = route.id === activeRoute;
        const mounted = active || visitedRoutes.includes(route.id);
        if(!mounted) return null;
        const parent = primaryDestination(route.id);
        return <section
          id={`isekaid-route-${route.id}`}
          key={route.id}
          aria-label={route.label || LABELS[parent] || route.id}
          aria-hidden={!active}
          hidden={!active}
          className={active && route.animate ? "isekaid-route-enter" : undefined}
          style={{height:"100%"}}
        >
          {route.element}
        </section>;
      })}
    </main>
    <BottomNav C={C} active={activeRoute} onChange={onNavigate} pulseTab={pulseTab} onPulseEnd={onPulseEnd}/>
  </>;
}
