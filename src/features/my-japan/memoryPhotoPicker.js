import { Camera, EncodingType, MediaTypeSelection } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

function base64ToBlob(base64, type = "image/jpeg") {
  const binary = atob(base64.includes(",") ? base64.split(",")[1] : base64);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new Blob([bytes], { type });
}

async function mediaResultToFile(result, index) {
  let blob;
  if (result.webPath) {
    const response = await fetch(result.webPath);
    if (!response.ok) throw new Error("android_photo_unreadable");
    blob = await response.blob();
  } else if (result.uri) {
    const response = await fetch(Capacitor.convertFileSrc(result.uri));
    if (!response.ok) throw new Error("android_photo_unreadable");
    blob = await response.blob();
  } else if (result.thumbnail) {
    blob = base64ToBlob(result.thumbnail);
  } else {
    throw new Error("android_photo_unreadable");
  }
  const format = String(result.metadata?.format || blob.type.split("/")[1] || "jpeg").toLowerCase();
  const type = format === "png" ? "image/png" : format === "heic" || format === "heif" ? `image/${format}` : "image/jpeg";
  const takenAt = Date.parse(result.metadata?.creationDate || "") || Date.now();
  return new File([blob], `souvenir-${takenAt}-${index}.${type === "image/png" ? "png" : format}`, { type:blob.type || type, lastModified:takenAt });
}

export function nativePhotoPickerAvailable() {
  return Capacitor.isNativePlatform();
}

export async function pickNativeMemoryPhotos({ source = "gallery", limit = 10 } = {}) {
  if (!nativePhotoPickerAvailable()) throw new Error("native_picker_unavailable");
  const safeLimit = Math.max(1, Math.min(10, Number(limit) || 1));
  let results;
  if (source === "camera") {
    const photo = await Camera.takePhoto({ quality:92,targetWidth:2400,targetHeight:2400,correctOrientation:true,encodingType:EncodingType.JPEG,includeMetadata:true,saveToGallery:false });
    results = [photo];
  } else {
    const selection = await Camera.chooseFromGallery({ mediaType:MediaTypeSelection.Photo,allowMultipleSelection:safeLimit>1,limit:safeLimit,quality:92,targetWidth:2400,targetHeight:2400,correctOrientation:true,includeMetadata:true });
    results = selection.results || [];
  }
  return Promise.all(results.slice(0, safeLimit).map(mediaResultToFile));
}
