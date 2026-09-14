export function ReadingProgressButton({ C, read, onMarkRead, compact = false }) {
  if (!onMarkRead && !read) return null;
  return <button onClick={onMarkRead} disabled={read} aria-label={read?"Contenu marqué comme lu":"Marquer comme lu"} style={{padding:compact?"7px 10px":"11px 14px",borderRadius:999,border:`1px solid ${read?C.green:C.border}`,background:read?`${C.green}18`:C.s1,color:read?C.green:C.text,fontSize:compact?10:12,fontWeight:650,cursor:read?"default":"pointer"}}>{read?"✓ Lu":"Marquer comme lu"}</button>;
}
