export const PROGRESS_FIELDS = ["profile","favorites","kana_progress","scenarios","path","mission","streak","unlocks","settings"];
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
function canonical(value) {
  if(Array.isArray(value))return value.map(canonical);
  if(object(value))return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
  return value;
}
export const sameValue = (a,b) => JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const identity = value => object(value)&&value.id ? `id:${value.id}` : JSON.stringify(canonical(value));

function merge(base,local,remote,path,conflicts) {
  if(sameValue(local,remote)||sameValue(remote,base))return local;
  if(sameValue(local,base))return remote;
  // Une activité Daily cochée est un fait monotone : si un appareil l'a
  // terminée, la fusion la conserve terminée sans créer de conflit artificiel.
  if(/^settings\.daily\.activities\.[^.]+\.done$/.test(path)) return local === true || remote === true;
  if(path === "settings.daily.completedAt") return local || remote || null;
  if(path==="mission" && local?.day!==remote?.day) return String(local?.day||"")>String(remote?.day||"")?local:remote;
  // Les champs d'une révision SRS et d'un streak forment une observation
  // indivisible : ne pas fabriquer un score en mélangeant leurs compteurs.
  if(path==="streak" || /^kana_progress\.[^.]+$/.test(path)) {
    conflicts.push({path,local,remote});
    return path==="streak" ? local : (Number(remote?.last)||0)>(Number(local?.last)||0)?remote:local;
  }
  if(Array.isArray(local)&&Array.isArray(remote)) {
    const b=new Map((Array.isArray(base)?base:[]).map(item=>[identity(item),item]));
    const l=new Map(local.map(item=>[identity(item),item]));
    const r=new Map(remote.map(item=>[identity(item),item]));
    return [...new Set([...l.keys(),...r.keys()])].flatMap(key=>{
      // Une suppression relative à la base prime sur une copie conservée.
      if(b.has(key)&&(!l.has(key)||!r.has(key))){
        const kept=l.has(key)?l.get(key):r.get(key);
        if(!sameValue(kept,b.get(key)))conflicts.push({path:`${path}.${key}`,local:l.get(key),remote:r.get(key)});
        return [];
      }
      if(!l.has(key))return [r.get(key)];
      if(!r.has(key))return [l.get(key)];
      return [merge(b.get(key),l.get(key),r.get(key),`${path}.${key}`,conflicts)];
    });
  }
  if(object(local)&&object(remote)) {
    return Object.fromEntries([...new Set([...Object.keys(local),...Object.keys(remote)])].flatMap(key=>{
      const value=merge(base?.[key],local[key],remote[key],`${path}.${key}`,conflicts);
      return value===undefined?[]:[[key,value]];
    }));
  }
  conflicts.push({path,local,remote});
  return local;
}

export function mergeProgress(base={},local={},remote={}) {
  const conflicts=[];
  const snapshot=Object.fromEntries(PROGRESS_FIELDS.filter(field=>Object.hasOwn(local,field)).map(field=>[field,merge(base[field],local[field],remote[field],field,conflicts)]));
  return {snapshot,conflicts};
}
