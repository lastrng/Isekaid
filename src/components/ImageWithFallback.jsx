import { useState } from "react";

/** Keep the illustration visible while loading, offline, or without an image. */
export function ImageWithFallback({ src, ...props }) {
  const source = typeof src === "string" ? src.trim() : "";
  return <ImageContent key={source} src={source} {...props}/>;
}

function ImageContent({ src, emoji, alt = "", style, imageStyle, ...props }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const fallback = typeof emoji === "string" && emoji.trim() ? emoji : "🎋";
  return <span {...props} data-content-visual style={{display:"grid",placeItems:"center",position:"relative",overflow:"hidden",flexShrink:0,fontSize:32,...style}}>
    <span data-image-fallback aria-hidden="true" style={{visibility:loaded && !failed ? "hidden" : "visible",lineHeight:1}}>{fallback}</span>
    {src && !failed && <img src={src} alt={alt} loading="lazy" onLoad={()=>setLoaded(true)} onError={()=>setFailed(true)} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",...imageStyle,visibility:loaded ? "visible" : "hidden"}}/>}
  </span>;
}
