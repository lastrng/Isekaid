import { useEffect, useState } from "react";
import { CloudOff, Wifi } from "lucide-react";
import { hasCriticalOfflineData } from "../services/sync/offlineStrategy.js";

export function OfflineStatus({ C }) {
  const [online, setOnline] = useState(() => globalThis.navigator?.onLine !== false);
  const [ready, setReady] = useState(() => hasCriticalOfflineData());
  useEffect(() => {
    const refresh = () => { setOnline(globalThis.navigator?.onLine !== false); setReady(hasCriticalOfflineData()); };
    window.addEventListener("online", refresh); window.addEventListener("offline", refresh); window.addEventListener("isekaid:offline-cache-updated", refresh); refresh();
    return () => { window.removeEventListener("online", refresh); window.removeEventListener("offline", refresh); window.removeEventListener("isekaid:offline-cache-updated", refresh); };
  }, []);
  const color = online ? C.t3 : C.gold;
  return <div aria-live="polite" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 999, background: online ? "rgba(253,251,247,.12)" : `${C.gold}22`, color, fontSize: 10 }}>
    {online ? <Wifi size={12}/> : <CloudOff size={12}/>} {online ? (ready ? "Prêt hors ligne" : "En ligne") : (ready ? "Hors ligne · prêt" : "Hors ligne")}
  </div>;
}
