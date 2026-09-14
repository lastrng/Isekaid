import { useEffect, useState } from "react";
import { CloudOff, Wifi } from "lucide-react";
import { hasCriticalOfflineData, hasTravelOfflineData } from "../services/sync/offlineStrategy.js";

export function OfflineStatus({ C, scope = "app" }) {
  const [online, setOnline] = useState(() => globalThis.navigator?.onLine !== false);
  const readiness = () => scope === "travel" ? hasTravelOfflineData() : hasCriticalOfflineData();
  const [ready, setReady] = useState(readiness);
  useEffect(() => {
    const refresh = () => { setOnline(globalThis.navigator?.onLine !== false); setReady(readiness()); };
    window.addEventListener("online", refresh); window.addEventListener("offline", refresh); window.addEventListener("isekaid:offline-cache-updated", refresh); refresh();
    return () => { window.removeEventListener("online", refresh); window.removeEventListener("offline", refresh); window.removeEventListener("isekaid:offline-cache-updated", refresh); };
  }, [scope]);
  const color = online ? C.t3 : C.gold;
  return <div aria-live="polite" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 999, background: online ? "rgba(253,251,247,.12)" : `${C.gold}22`, color, fontSize: 10 }}>
    {online ? <Wifi size={12}/> : <CloudOff size={12}/>} {ready ? "Disponible hors ligne" : online ? "Préparation hors ligne…" : "Hors ligne · données incomplètes"}
  </div>;
}
