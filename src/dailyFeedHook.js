import { useEffect, useState } from "react";
import { fetchDailyFeed } from "./supabase";

export function useDailyFeed(limit) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchDailyFeed({ limit });
        if (alive) setItems(data);
      } catch {
        if (alive) { setItems([]); setError(true); }
      }
    })();
    return () => { alive = false; };
  }, [limit]);
  return { items, error };
}
