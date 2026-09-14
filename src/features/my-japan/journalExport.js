import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

function safeFileName(value) {
  const clean=String(value||"carnet-de-voyage.pdf").replace(/[\\/:*?"<>|]+/g,"-").replace(/\s+/g," ").trim();
  return clean.toLowerCase().endsWith(".pdf")?clean:`${clean}.pdf`;
}

async function fetchPdf(url) {
  if(!url)throw new Error("journal_url_missing");
  const response=await fetch(url);
  if(!response.ok)throw new Error("journal_download_failed");
  const blob=await response.blob();
  if(!blob.size||blob.type&&!blob.type.includes("pdf"))throw new Error("journal_invalid_pdf");
  return blob;
}

function blobToBase64(blob) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error("journal_read_failed"));
    reader.onload=()=>resolve(String(reader.result||"").split(",")[1]||"");
    reader.readAsDataURL(blob);
  });
}

function browserDownload(blob,fileName) {
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");
  anchor.href=url;
  anchor.download=fileName;
  anchor.rel="noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function writeNativePdf(blob,fileName,directory) {
  const data=await blobToBase64(blob);
  const target=await Filesystem.writeFile({path:fileName,data,directory,recursive:true});
  return target.uri;
}

export async function saveTravelJournalPdf({url,fileName}) {
  const name=safeFileName(fileName);
  const blob=await fetchPdf(url);
  if(!Capacitor.isNativePlatform()){
    browserDownload(blob,name);
    return {saved:true,fileName:name};
  }
  const uri=await writeNativePdf(blob,name,Directory.Documents);
  return {saved:true,fileName:name,uri};
}

export async function shareTravelJournalPdf({url,fileName,title}) {
  const name=safeFileName(fileName);
  const blob=await fetchPdf(url);
  if(Capacitor.isNativePlatform()){
    const uri=await writeNativePdf(blob,`isekaid/${name}`,Directory.Cache);
    await Share.share({title:title||"Mon carnet de voyage Isekaid",text:"Mon carnet de voyage créé avec Isekaid",files:[uri],dialogTitle:"Partager mon carnet"});
    return {shared:true};
  }
  const file=new File([blob],name,{type:"application/pdf"});
  if(navigator.share&&navigator.canShare?.({files:[file]})){
    await navigator.share({title:title||"Mon carnet de voyage Isekaid",files:[file]});
    return {shared:true};
  }
  browserDownload(blob,name);
  return {shared:false,downloaded:true};
}
