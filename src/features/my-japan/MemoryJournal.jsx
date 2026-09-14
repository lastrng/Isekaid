import { useEffect, useMemo, useState } from "react";
import { Camera, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ImagePlus, Star, Trash2 } from "lucide-react";

import { filterMemories } from "./memoryJournal.js";
import { MAX_MEMORY_PHOTOS_PER_PLACE } from "./memoryPhotos.js";
import { nativePhotoPickerAvailable, pickNativeMemoryPhotos } from "./memoryPhotoPicker.js";

function errorMessage(error) {
  const code=error?.message;
  if(code==="unsupported_heic")return "Cette photo HEIC ne peut pas être décodée sur cet appareil. Exporte-la en JPEG puis réessaie.";
  if(code==="photo_limit_reached")return `Maximum ${MAX_MEMORY_PHOTOS_PER_PLACE} photos par lieu.`;
  if(code==="offline_delete_requires_connection")return "Reconnecte-toi pour supprimer définitivement cette photo du cloud.";
  if(code==="image_too_large")return "La photo reste trop volumineuse après optimisation.";
  if(code==="android_photo_unreadable")return "Android n’a pas permis de lire cette photo. Essaie depuis la galerie locale.";
  return "Impossible d’enregistrer cette modification. Réessaie.";
}

function PhotoTile({ C, memory, photo, index, total, getPhotoUrl, onRemove, onUpdate, onReorder }) {
  const [url,setUrl]=useState(null);
  const [caption,setCaption]=useState(photo.caption||"");
  const [editing,setEditing]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    let live=true;
    let createdUrl=null;
    setUrl(null);
    Promise.resolve(getPhotoUrl(photo)).then(value=>{
      if(!live)return;
      createdUrl=value;
      setUrl(value);
    }).catch(()=>live&&setError("Photo indisponible pour le moment."));
    return()=>{live=false;if(createdUrl?.startsWith?.("blob:"))URL.revokeObjectURL(createdUrl);};
  },[photo.storagePath,photo.localKey,getPhotoUrl]);
  const run=async action=>{setBusy(true);setError("");try{await action();}catch(cause){setError(errorMessage(cause));}finally{setBusy(false);}};
  const small={border:`1px solid ${C.border}`,background:C.s1,color:C.text,borderRadius:8,minWidth:36,minHeight:36,display:"grid",placeItems:"center",cursor:"pointer"};
  return <div className="memory-photo-tile" style={{background:C.s1,borderColor:C.border}}>
    <div className="memory-photo-frame" style={{background:C.s3}}>
      {url?<img src={url} alt={photo.caption||memory.placeName} loading="lazy"/>:<span aria-label="Chargement de la photo">…</span>}
      {photo.isCover&&<span className="memory-photo-cover" style={{background:C.red}}>Photo principale</span>}
      {photo.status==="pending"&&<span className="memory-photo-pending">En attente de connexion</span>}
    </div>
    {editing?<form onSubmit={event=>{event.preventDefault();run(async()=>{await onUpdate(memory,photo.id,{caption:caption.trim().slice(0,500)});setEditing(false);});}} className="memory-photo-caption-form">
      <label style={{color:C.t2}}>Légende<input autoFocus value={caption} maxLength={500} onChange={event=>setCaption(event.target.value)} placeholder="Shibuya sous la pluie…" style={{background:C.s2,borderColor:C.border,color:C.text}}/></label>
      <div><button disabled={busy} style={small}>Enregistrer</button><button type="button" disabled={busy} style={small} onClick={()=>{setCaption(photo.caption||"");setEditing(false);}}>Annuler</button></div>
    </form>:<button type="button" className="memory-photo-caption" style={{color:photo.caption?C.text:C.t3}} onClick={()=>setEditing(true)}>{photo.caption||"Ajouter une légende"}</button>}
    <div className="memory-photo-actions">
      <button type="button" style={small} disabled={busy||index===0} onClick={()=>run(()=>onReorder(memory,photo.id,-1))} aria-label="Déplacer la photo vers la gauche"><ChevronLeft size={15}/></button>
      <button type="button" style={small} disabled={busy||index===total-1} onClick={()=>run(()=>onReorder(memory,photo.id,1))} aria-label="Déplacer la photo vers la droite"><ChevronRight size={15}/></button>
      <button type="button" style={{...small,color:photo.isCover?C.red:C.text}} disabled={busy||photo.isCover} onClick={()=>run(()=>onUpdate(memory,photo.id,{isCover:true}))} aria-label="Choisir comme photo principale"><Star size={15} fill={photo.isCover?"currentColor":"none"}/></button>
      <button type="button" style={{...small,color:C.red}} disabled={busy} onClick={()=>{if(confirm("Supprimer définitivement cette photo ?"))run(()=>onRemove(memory,photo));}} aria-label="Supprimer la photo"><Trash2 size={15}/></button>
    </div>
    {error&&<p role="alert" className="memory-photo-error" style={{color:C.red}}>{error}</p>}
  </div>;
}

function MemoryEntry({ C, memory, getPhotoUrl, onAddPhotos, onRemovePhoto, onUpdatePhoto, onReorderPhoto, onNote }) {
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(memory.note||"");
  const [busy,setBusy]=useState(false);
  const [phase,setPhase]=useState("");
  const [error,setError]=useState("");
  const photos=memory.photos||[];
  const remaining=Math.max(0,MAX_MEMORY_PHOTOS_PER_PLACE-photos.length);
  const run=async action=>{setBusy(true);setError("");try{return await action();}catch(cause){setError(errorMessage(cause));throw cause;}finally{setBusy(false);}};
  const add=async files=>{
    if(!files?.length)return;
    try{
      const result=await run(()=>onAddPhotos(memory,Array.from(files).slice(0,remaining),{onProgress:value=>setPhase(value)}));
      setPhase(result.pending?"pending":"done");
    }catch{/* message déjà exposé */}
  };
  const nativePick=async source=>{
    try{await add(await pickNativeMemoryPhotos({source,limit:source==="camera"?1:remaining}));}
    catch(cause){if(!String(cause?.message||"").toLowerCase().includes("cancel"))setError(errorMessage(cause));}
  };
  const button={padding:"10px 12px",minHeight:42,borderRadius:10,border:`1px solid ${C.border}`,color:C.text,background:C.s1,fontSize:11,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6};
  const phaseLabel={compressing:"Optimisation de la photo…",uploading:"Téléversement…",done:"Photo ajoutée.",pending:"Photo conservée sur cet appareil · synchronisation à la reconnexion."}[phase];
  return <article className="memory-entry" style={{background:C.s2,borderColor:C.border}}>
    <div className="memory-entry-heading"><div><strong style={{color:C.text}}>{memory.placeEmoji} {memory.placeName}</strong><small style={{color:C.t3}}>{memory.tripTitle} · Jour {memory.dayNumber}</small></div></div>
    <section aria-label={`Souvenirs photographiques de ${memory.placeName}`}>
      <div className="memory-subheading"><strong style={{color:C.text}}>Mes souvenirs de ce lieu</strong><span style={{color:C.t3}}>{photos.length}/{MAX_MEMORY_PHOTOS_PER_PLACE} photos</span></div>
      {photos.length>0&&<div className="memory-photo-grid">{photos.map((photo,index)=><PhotoTile key={photo.id} C={C} memory={memory} photo={photo} index={index} total={photos.length} getPhotoUrl={getPhotoUrl} onRemove={onRemovePhoto} onUpdate={onUpdatePhoto} onReorder={onReorderPhoto}/>)}</div>}
      {remaining>0&&<div className="memory-add-actions">
        {nativePhotoPickerAvailable()?<><button type="button" disabled={busy} style={button} onClick={()=>nativePick("gallery")}><ImagePlus size={16}/> Ajouter depuis la galerie</button><button type="button" disabled={busy} style={button} onClick={()=>nativePick("camera")}><Camera size={16}/> Prendre une photo</button></>:<label style={button}><ImagePlus size={16}/> Ajouter des photos<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple hidden disabled={busy} onChange={event=>{const files=event.target.files;event.target.value="";add(files);}}/></label>}
      </div>}
      {phaseLabel&&<p role="status" className="memory-photo-status" style={{color:phase==="pending"?C.gold:C.t2}}>{phaseLabel}</p>}
    </section>
    <section className="memory-note-section">
      <strong style={{color:C.text}}>Notes</strong>
      {editing?<form onSubmit={event=>{event.preventDefault();run(async()=>{await onNote(memory,draft);setEditing(false);}).catch(()=>{});}}>
        <label style={{color:C.t2}}>Ce que je veux retenir de cet endroit…<textarea autoFocus value={draft} maxLength={3000} onChange={event=>setDraft(event.target.value)} rows={5} style={{background:C.s1,color:C.text,borderColor:C.border}}/></label>
        <div className="memory-note-controls"><small style={{color:C.t3}}>{draft.length}/3 000</small><button disabled={busy} style={button}>Enregistrer</button><button type="button" disabled={busy} onClick={()=>setEditing(false)} style={button}>Annuler</button></div>
      </form>:<><p style={{color:memory.note?C.text:C.t3}}>{memory.note||"Ce que je veux retenir de cet endroit…"}</p><button type="button" disabled={busy||!memory.activityId} onClick={()=>{setDraft(memory.note||"");setEditing(true);}} style={button}>{memory.note?"Modifier ma note":"Ajouter une note"}</button></>}
    </section>
    {error&&<p role="alert" className="memory-photo-error" style={{color:C.red}}>{error}</p>}
  </article>;
}

export function MemoryJournal({ C, memories, getPhotoUrl, onAddPhotos, onRemovePhoto, onUpdatePhoto, onReorderPhoto, onNote }) {
  const [query,setQuery]=useState("");
  const [tripId,setTripId]=useState("");
  const [photosOnly,setPhotosOnly]=useState(false);
  const [limit,setLimit]=useState(12);
  const trips=useMemo(()=>[...new Map(memories.map(memory=>[memory.tripId,memory.tripTitle]))],[memories]);
  const filtered=useMemo(()=>filterMemories(memories,{query,tripId,photosOnly}),[memories,query,tripId,photosOnly]);
  const control={boxSizing:"border-box",width:"100%",padding:11,fontSize:12,color:C.text,background:C.s1,border:`1px solid ${C.border}`,borderRadius:10};
  return <section aria-label="Carnet personnel" style={{marginTop:20}}>
    <h3 style={{fontSize:14,color:C.text}}>Carnet personnel</h3>
    <input type="search" aria-label="Rechercher dans mes souvenirs" placeholder="Rechercher un lieu, un voyage, un souvenir…" value={query} onChange={event=>{setQuery(event.target.value);setLimit(12);}} style={control}/>
    {trips.length>1&&<select aria-label="Filtrer les souvenirs par voyage" value={tripId} onChange={event=>{setTripId(event.target.value);setLimit(12);}} style={{...control,marginTop:8}}><option value="">Tous mes voyages</option>{trips.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select>}
    <label className="memory-filter" style={{color:C.t2}}><input type="checkbox" checked={photosOnly} onChange={event=>{setPhotosOnly(event.target.checked);setLimit(12);}}/>Avec photo uniquement</label>
    <p role="status" style={{fontSize:10,color:C.t3}}>{filtered.length} moment{filtered.length>1?"s":""}</p>
    <div className="memory-entry-list">{filtered.slice(0,limit).map(memory=><MemoryEntry key={memory.id} C={C} memory={memory} getPhotoUrl={getPhotoUrl} onAddPhotos={onAddPhotos} onRemovePhoto={onRemovePhoto} onUpdatePhoto={onUpdatePhoto} onReorderPhoto={onReorderPhoto} onNote={onNote}/>)}</div>
    {!filtered.length&&<p style={{fontSize:12,color:C.t3}}>{memories.length?"Aucun souvenir ne correspond à ces filtres.":"Tes lieux marqués comme faits apparaîtront ici une fois le voyage terminé."}</p>}
    {filtered.length>limit&&<button onClick={()=>setLimit(value=>value+12)} style={{...control,marginTop:12,cursor:"pointer"}}>Afficher plus de souvenirs</button>}
  </section>;
}
