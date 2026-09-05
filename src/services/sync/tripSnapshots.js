function timestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

// Fusion par voyage : un appareil ne doit pas effacer silencieusement les
// voyages créés sur un autre. updatedAt départage les éditions concurrentes.
export function mergeTripSnapshots(localTrips = [], cloudTrips = []) {
  const merged = new Map();
  for (const trip of cloudTrips || []) if (trip?.id) merged.set(trip.id, trip);
  for (const local of localTrips || []) {
    if (!local?.id) continue;
    const cloud = merged.get(local.id);
    if (!cloud || timestamp(local.updatedAt) > timestamp(cloud.updatedAt)) merged.set(local.id, local);
  }
  return [...merged.values()];
}
