// ─────────────────────────────────────────────────────────────────────────────
// tts.js — Synthèse vocale japonaise partagée (App.jsx + Tuteur conversationnel)
//
// 1) Préfère un MP3 pré-généré (AUDIO_MANIFEST) quand le texte est un contenu
//    statique connu (expressions, phrases éditoriales…).
// 2) Repli sur l'API Web Speech native (window.speechSynthesis, voix ja-JP) —
//    c'est le seul chemin possible pour du texte généré dynamiquement par le
//    tuteur, qui n'a jamais de MP3 pré-généré.
//
// Pas de TTS payant en v1. Piste pour plus tard : générer les MP3 du tuteur
// à la volée via un TTS cloud (ex. ElevenLabs/Google) derrière une Edge
// Function, avec cache par hash du texte — mais ça a un coût par requête,
// contrairement à Web Speech qui est gratuit et local à l'appareil.
// ─────────────────────────────────────────────────────────────────────────────
import AUDIO_MANIFEST from "./audio-manifest.json";
import { useState, useEffect } from "react";

let _currentAudio = null;
let _voiceWarningLogged = false;

// Vrai dès qu'une voix ja-JP (ou ja-*) est disponible. Peut renvoyer `false`
// juste parce que les voix ne sont pas encore chargées par le navigateur —
// voir useJapaneseVoiceAvailable() pour la version réactive.
export function hasJapaneseVoice(){
  try {
    if(!window.speechSynthesis) return false;
    const voices = window.speechSynthesis.getVoices();
    const found = voices.some(v=>v.lang==="ja-JP" || v.lang?.toLowerCase().startsWith("ja"));
    if(!found && voices.length && !_voiceWarningLogged){
      _voiceWarningLogged = true;
      console.warn("[tts] Aucune voix ja-JP disponible sur cet appareil — le bouton audio sera masqué là où c'est requis.");
    }
    return found;
  } catch(e){ return false; }
}

// onEnd (optionnel) : appelé une fois la lecture terminée (ou en erreur) — sert
// à enchaîner plusieurs phrases à la suite (voir ScenarioPlay, lecture de
// toutes les réponses). N'affecte aucun appelant existant qui l'omet.
export function speakJP(text, onEnd){
  if(!text){ onEnd?.(); return; }
  const file = AUDIO_MANIFEST[text.trim()];
  if(file){
    try {
      if(_currentAudio){ _currentAudio.pause(); _currentAudio = null; }
      const audio = new Audio("/" + file);
      _currentAudio = audio;
      audio.onended = ()=>{ if(_currentAudio===audio) _currentAudio=null; onEnd?.(); };
      audio.play().catch(()=> browserSpeak(text, onEnd)); // repli si la lecture échoue
      return;
    } catch(e){ /* on continue vers le repli */ }
  }
  browserSpeak(text, onEnd);
}

// Interrompt toute lecture en cours (MP3 pré-généré ou Web Speech) — utile
// pour arrêter une séquence enchaînée (lecture de toutes les réponses) avant
// qu'elle aille au bout, ex. quand l'utilisateur change d'étape ou répond.
export function stopSpeak(){
  try { if(_currentAudio){ _currentAudio.pause(); _currentAudio = null; } } catch(e){}
  try { if(window.speechSynthesis) window.speechSynthesis.cancel(); } catch(e){}
}

function browserSpeak(text, onEnd){
  try {
    if(!window.speechSynthesis || !text){ onEnd?.(); return; }
    const speak = ()=>{
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = 0.85;
      u.pitch = 1.0;
      u.onend = ()=> onEnd?.();
      u.onerror = ()=> onEnd?.();
      const voices = window.speechSynthesis.getVoices();
      const jp = voices.find(v=>v.lang==="ja-JP") || voices.find(v=>v.lang?.toLowerCase().startsWith("ja"));
      if(jp) u.voice = jp;
      window.speechSynthesis.speak(u);
    };
    const voices = window.speechSynthesis.getVoices();
    if(voices && voices.length){
      speak();
    } else {
      // Les voix se chargent de façon asynchrone sur certains navigateurs (iOS, Chrome)
      window.speechSynthesis.onvoiceschanged = ()=>{ speak(); window.speechSynthesis.onvoiceschanged = null; };
      // Filet de sécurité : tente quand même après un court délai
      setTimeout(speak, 250);
    }
  } catch(e){ onEnd?.(); }
}

// Hook réactif : certains navigateurs chargent les voix de façon asynchrone,
// donc la disponibilité peut passer de false à true après le montage.
export function useJapaneseVoiceAvailable(){
  const [available, setAvailable] = useState(()=> hasJapaneseVoice());
  useEffect(()=>{
    if(available) return;
    if(!window.speechSynthesis) return;
    const check = ()=> setAvailable(hasJapaneseVoice());
    window.speechSynthesis.onvoiceschanged = check;
    const t = setTimeout(check, 300);
    return ()=>{ clearTimeout(t); if(window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  },[available]);
  return available;
}

// hideIfNoVoice : masque le bouton proprement (renvoie null) au lieu d'un
// bouton mort quand aucune voix ja-JP n'est trouvée. Par défaut à false pour
// ne pas changer le comportement des usages existants dans App.jsx (ils
// s'appuient surtout sur AUDIO_MANIFEST, qui ne dépend pas de speechSynthesis).
export function SpeakButton({C, text, size=30, color, hideIfNoVoice=false}){
  const voiceAvailable = useJapaneseVoiceAvailable();
  const [playing,setPlaying] = useState(false);
  if(!text) return null;
  if(hideIfNoVoice && !AUDIO_MANIFEST[text.trim()] && !voiceAvailable) return null;
  const col = color || C.red;
  const onClick = (e)=>{
    e.stopPropagation();
    speakJP(text);
    setPlaying(true);
    setTimeout(()=>setPlaying(false), 900);
  };
  const s = size; // total button size
  return(
    <button onClick={onClick} aria-label="Écouter la prononciation" style={{
      width:s, height:s, borderRadius:"50%", flexShrink:0, cursor:"pointer",
      background: playing ? `rgba(201,70,61,0.18)` : `rgba(201,70,61,0.08)`,
      border:`1px solid ${playing ? "rgba(201,70,61,0.5)" : "rgba(201,70,61,0.22)"}`,
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      padding:0, transition:"all .2s", transform: playing ? "scale(1.12)" : "scale(1)",
    }}>
      <svg width={s*0.58} height={s*0.58} viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="7.5" width="5" height="7" rx="1.2" fill={col} opacity={playing?1:0.85}/>
        <path d="M7 7L13 3V19L7 15" fill={col} opacity={playing?1:0.85}/>
        <path d="M15.5 8.5 Q18.5 11 15.5 13.5" stroke={col} strokeWidth="1.7" strokeLinecap="round"
          opacity={playing ? 1 : 0.7}
          style={{transition:"opacity .2s"}}
        />
        <path d="M17.5 6 Q22.5 11 17.5 16" stroke={col} strokeWidth="1.5" strokeLinecap="round"
          opacity={playing ? 0.75 : 0.4}
          style={{transition:"opacity .2s"}}
        />
      </svg>
    </button>
  );
}
