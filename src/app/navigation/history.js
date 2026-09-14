export function pushHistory(history, current, next) {
  const entries = Array.isArray(history) ? history : [];
  if (!current || current === next) return entries;
  return [...entries, current];
}

export function popHistory(history, fallback) {
  const entries = Array.isArray(history) ? history : [];
  if (!entries.length) return { history: [], destination: fallback };
  return { history: entries.slice(0, -1), destination: entries.at(-1) };
}
