function timestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

// Fusion par voyage : un appareil ne doit pas effacer silencieusement les
// voyages créés sur un autre. updatedAt départage les éditions concurrentes.
export function mergeTripSnapshots(localTrips = [], cloudTrips = [], { includeDeleted = false, base = [], onConflict } = {}) {
  const baseline = new Map(base.map(trip=>[trip.id,trip]));
  const merged = new Map();
  for (const trip of cloudTrips || []) if (trip?.id) merged.set(trip.id, trip);
  for (const local of localTrips || []) {
    if (!local?.id) continue;
    const cloud = merged.get(local.id);
    if (!cloud) { merged.set(local.id,local); continue; }
    if (JSON.stringify(local) === JSON.stringify(cloud)) continue;
    const previous = baseline.get(local.id);
    const localChanged = JSON.stringify(local)!==JSON.stringify(previous);
    const cloudChanged = JSON.stringify(cloud)!==JSON.stringify(previous);
    let winner;
    // Une suppression explicite ne doit jamais être annulée par un ancien appareil.
    if(local.deletedAt || cloud.deletedAt) winner=local.deletedAt?local:cloud;
    else if(!localChanged) winner=cloud;
    else if(!cloudChanged) winner=local;
    else winner=timestamp(local.updatedAt)>timestamp(cloud.updatedAt)?local:cloud;
    if(localChanged && cloudChanged) {
      const loser=winner===local?cloud:local;
      if(!loser.deletedAt) onConflict?.(loser);
    }
    merged.set(local.id,winner);
  }
  return [...merged.values()].filter(trip=>includeDeleted || !trip.deletedAt);
}
