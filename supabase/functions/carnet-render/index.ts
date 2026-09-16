import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import catalog from "./journal-catalog.json" with { type:"json" };
import { buildTravelJournalViewModel, journalSourcePayload } from "./journal-view-model.js";
import { renderTravelJournal } from "./journal-template.js";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const REVENUECAT_SECRET_KEY=Deno.env.get("REVENUECAT_SECRET_KEY")??"";
const REVENUECAT_ENTITLEMENT_ID=Deno.env.get("REVENUECAT_ENTITLEMENT_ID")||"premium";
const CARNET_RENDER_URL=Deno.env.get("CARNET_RENDER_URL")??"";
const CARNET_RENDER_TOKEN=Deno.env.get("CARNET_RENDER_TOKEN")??"";
const MAX_PDF_BYTES=50*1024*1024;
const MAX_EMBEDDED_PHOTO_BYTES=48*1024*1024;
const MAX_PHOTOS=60;

function response(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});}
function safeTripId(value:unknown){const id=String(value||"");return /^[a-zA-Z0-9_-]{3,160}$/.test(id)?id:null;}
function stable(value:unknown):unknown{if(Array.isArray(value))return value.map(stable);if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value as Record<string,unknown>).sort().map(key=>[key,stable((value as Record<string,unknown>)[key])]));return value;}
async function sha256(value:unknown){const bytes=new TextEncoder().encode(JSON.stringify(stable(value)));const digest=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");}
function bytesToBase64(bytes:Uint8Array){let binary="";for(let index=0;index<bytes.length;index+=32768)binary+=String.fromCharCode(...bytes.subarray(index,index+32768));return btoa(binary);}
function journalFileName(title:string){const slug=title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,70)||"voyage-japon";return `carnet-${slug}.pdf`;}

async function isPremiumViaRevenueCat(userId:string){
  if(!REVENUECAT_SECRET_KEY)return false;
  try{
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
    const result=await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,{headers:{Authorization:`Bearer ${REVENUECAT_SECRET_KEY}`},signal:controller.signal});clearTimeout(timeout);
    if(!result.ok)return false;const payload=await result.json();const entitlement=payload?.subscriber?.entitlements?.[REVENUECAT_ENTITLEMENT_ID];
    return Boolean(entitlement&&(!entitlement.expires_date||new Date(entitlement.expires_date).getTime()>Date.now()));
  }catch{return false;}
}
async function isPremiumUser(client:ReturnType<typeof createClient>,userId:string){if(await isPremiumViaRevenueCat(userId))return true;const {data}=await client.from("premium_grants").select("user_id").eq("user_id",userId).maybeSingle();return Boolean(data);}

function storagePaths(trip:Record<string,unknown>,userId:string,tripId:string){
  const prefix=`${userId}/trips/${tripId}/places/`;
  const paths:string[]=[];
  for(const day of (trip.jours as Array<Record<string,unknown>>)||[])for(const activity of (day.activites as Array<Record<string,unknown>>)||[]){
    const raw=Array.isArray(activity.memoryPhotos)?activity.memoryPhotos:activity.memoryPhoto?[{storagePath:activity.memoryPhoto}]:[];
    for(const photo of raw){const path=String(photo?.storagePath||"");if(path.startsWith(prefix)&&!path.includes("..")&&!paths.includes(path))paths.push(path);}
  }
  return paths.slice(0,MAX_PHOTOS);
}

async function loadPrivatePhotos(client:ReturnType<typeof createClient>,trip:Record<string,unknown>,userId:string,tripId:string){
  const dataByPath:Record<string,string>={};let total=0;
  for(const path of storagePaths(trip,userId,tripId)){
    const {data,error}=await client.storage.from("memory-photos").download(path);
    if(error||!data)continue;
    const bytes=new Uint8Array(await data.arrayBuffer());
    if(total+bytes.length>MAX_EMBEDDED_PHOTO_BYTES)break;
    total+=bytes.length;dataByPath[path]=`data:${data.type||"image/jpeg"};base64,${bytesToBase64(bytes)}`;
  }
  return dataByPath;
}

Deno.serve(async(request:Request)=>{
  if(request.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(request.method!=="POST")return response({error:"method_not_allowed"},405);
  try{
    if(!CARNET_RENDER_URL||!CARNET_RENDER_TOKEN)return response({error:"server_misconfigured"},500);
    const authorization=request.headers.get("Authorization");
    if(!authorization)return response({error:"unauthorized"},401);
    const token=authorization.replace(/^Bearer\s+/i,"");
    const client=createClient(Deno.env.get("SUPABASE_URL")??"",Deno.env.get("SUPABASE_ANON_KEY")??"",{global:{headers:{Authorization:authorization}}});
    const {data:identity,error:identityError}=await client.auth.getUser(token);
    if(identityError||!identity.user)return response({error:"unauthorized"},401);
    const userId=identity.user.id;
    if(!await isPremiumUser(client,userId))return response({error:"premium_required"},402);
    const body=await request.json().catch(()=>null);
    const tripId=safeTripId(body?.tripId);
    if(!tripId)return response({error:"invalid_trip_id"},400);
    const {data:progress,error:progressError}=await client.from("progress").select("trips").eq("user_id",userId).single();
    if(progressError)return response({error:"trip_unavailable"},502);
    const matching=(progress?.trips||[]).filter((trip:Record<string,unknown>)=>trip?.id===tripId);
    if(matching.length!==1)return response({error:"trip_not_found"},404);
    const trip=matching[0];
    const ended=trip.status==="completed"||Boolean(trip.completedAt)||(trip.dateFin&&String(trip.dateFin)<new Date().toISOString().slice(0,10));
    if(!ended)return response({error:"trip_not_completed"},409);
    const sourceHash=await sha256(journalSourcePayload(trip));
    if(body?.force!==true){
      const {data:cached}=await client.from("trip_journal_exports").select("storage_path,page_count,file_size,generated_at").eq("user_id",userId).eq("trip_id",tripId).eq("source_hash",sourceHash).maybeSingle();
      if(cached){const {data:signed}=await client.storage.from("travel-journals").createSignedUrl(cached.storage_path,900);if(signed?.signedUrl)return response({ready:true,cached:true,url:signed.signedUrl,fileName:journalFileName(String(trip.titre||"voyage-japon")),pageCount:cached.page_count,fileSize:cached.file_size,generatedAt:cached.generated_at});}
    }
    const photoDataByPath=await loadPrivatePhotos(client,trip,userId,tripId);
    const viewModel=buildTravelJournalViewModel({trip,user:identity.user,catalog,photoDataByPath});
    const rendered=renderTravelJournal(viewModel);
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60000);
    let renderResponse:Response;
    try{renderResponse=await fetch(CARNET_RENDER_URL,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${CARNET_RENDER_TOKEN}`},body:JSON.stringify({html:rendered.html}),signal:controller.signal});}finally{clearTimeout(timeout);}
    if(!renderResponse.ok){console.error("[carnet-render] renderer status",renderResponse.status);return response({error:"render_failed"},502);}
    const pdf=new Uint8Array(await renderResponse.arrayBuffer());
    if(!pdf.length||pdf.length>MAX_PDF_BYTES)return response({error:"invalid_pdf_size"},502);
    const storagePath=`${userId}/trips/${tripId}/exports/${sourceHash}.pdf`;
    const {error:uploadError}=await client.storage.from("travel-journals").upload(storagePath,pdf,{contentType:"application/pdf",cacheControl:"3600",upsert:true});
    if(uploadError){console.error("[carnet-render] export upload failed",uploadError.message);return response({error:"export_storage_failed"},502);}
    const now=new Date().toISOString();
    const {error:metadataError}=await client.from("trip_journal_exports").upsert({user_id:userId,trip_id:tripId,source_hash:sourceHash,storage_path:storagePath,page_count:rendered.pageCount,file_size:pdf.length,generated_at:now,updated_at:now},{onConflict:"user_id,trip_id,source_hash"});
    if(metadataError){console.error("[carnet-render] metadata failed",metadataError.message);return response({error:"export_metadata_failed"},502);}
    const {data:oldExports}=await client.from("trip_journal_exports").select("id,storage_path").eq("user_id",userId).eq("trip_id",tripId).neq("source_hash",sourceHash);
    if(oldExports?.length){await client.storage.from("travel-journals").remove(oldExports.map(item=>item.storage_path));await client.from("trip_journal_exports").delete().in("id",oldExports.map(item=>item.id));}
    const {data:signed,error:signedError}=await client.storage.from("travel-journals").createSignedUrl(storagePath,900);
    if(signedError||!signed?.signedUrl)return response({error:"signed_url_failed"},502);
    return response({ready:true,cached:false,url:signed.signedUrl,fileName:journalFileName(String(trip.titre||"voyage-japon")),pageCount:rendered.pageCount,fileSize:pdf.length,generatedAt:now});
  }catch(error){console.error("[carnet-render] unexpected",error instanceof Error?error.message:"unknown");return response({error:"unexpected_error"},500);}
});
