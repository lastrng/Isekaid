export function filterMemories(memories, { query = "", tripId = "", photosOnly = false } = {}) {
  const normalize = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return memories.filter(memory => (!tripId || memory.tripId === tripId)
    && (!photosOnly || Boolean(memory.photo))
    && words.every(word => normalize(`${memory.placeName} ${memory.tripTitle} ${memory.note}`).includes(word)));
}

export function setMemoryNote(trips, memory, note) {
  if (!memory.activityId) throw new Error("memory_not_found");
  let found = false;
  const next = trips.map(trip => trip.id !== memory.tripId ? trip : {
    ...trip,
    updatedAt: new Date().toISOString(),
    jours: (trip.jours || []).map(day => day.num !== memory.dayNumber ? day : {
      ...day,
      activites: (day.activites || []).map(activity => {
        if (activity.id !== memory.activityId) return activity;
        found = true;
        return { ...activity, note: String(note).trim().slice(0, 3000) };
      }),
    }),
  });
  if (!found) throw new Error("memory_not_found");
  return next;
}
