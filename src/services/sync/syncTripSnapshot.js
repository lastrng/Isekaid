import { mergeTripSnapshots } from "./tripSnapshots.js";

// Le pilote compare updated_at au moment de l'écriture ; un autre écrivain
// oblige à relire la version distante, au lieu d'écraser son travail.
export async function syncTripSnapshot({local,base,read,compareAndSet,onConflict}) {
  for(let attempt=0;attempt<3;attempt+=1) {
    const remote=await read();
    if(!remote) return null;
    const merged=mergeTripSnapshots(local,remote.trips || [],{includeDeleted:true,base,onConflict});
    if(await compareAndSet(remote.updated_at,merged)) return merged;
  }
  return null;
}
