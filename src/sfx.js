/**
 * sfx.js — jingles sonores d'Isekai'd, synthétisés en direct (Web Audio API).
 *
 * Pas de fichiers audio à embarquer : zéro poids ajouté à l'AAB, fonctionne
 * hors-ligne, aucune question de licence. Fonctionne dans la WebView
 * Capacitor Android comme dans un navigateur desktop.
 */

const MUTE_KEY = "isekaid_sound_v1";

let ctx = null;
function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function isSoundOn() {
  try { return localStorage.getItem(MUTE_KEY) !== "off"; } catch { return true; }
}

export function setSoundOn(on) {
  try { localStorage.setItem(MUTE_KEY, on ? "on" : "off"); } catch {}
}

// Une note = un oscillateur avec enveloppe (attaque rapide, relâchement exponentiel).
function note(ac, master, { freq, start, dur, type = "sine", gain = 0.22, glideTo = null }) {
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  if (glideTo) {
    osc.frequency.exponentialRampToValueAtTime(glideTo, ac.currentTime + start + dur);
  }
  amp.gain.setValueAtTime(0, ac.currentTime + start);
  amp.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(amp);
  amp.connect(master);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
}

function play(builder) {
  if (!isSoundOn()) return;
  const ac = getCtx();
  if (!ac) return;
  const master = ac.createGain();
  master.gain.value = 1;
  master.connect(ac.destination);
  builder(ac, master);
}

/** Petit tap UI (navigation, sélection). */
export function playTap() {
  play((ac, m) => note(ac, m, { freq: 720, start: 0, dur: 0.06, type: "sine", gain: 0.1 }));
}

/** Bonne réponse — ding-ding ascendant, clair et bref. */
export function playCorrect() {
  play((ac, m) => {
    note(ac, m, { freq: 880, start: 0, dur: 0.14, type: "triangle", gain: 0.2 });
    note(ac, m, { freq: 1318.5, start: 0.09, dur: 0.22, type: "triangle", gain: 0.18 });
  });
}

/** Mauvaise réponse — buzz court, descendant, jamais agressif. */
export function playWrong() {
  play((ac, m) => {
    note(ac, m, { freq: 220, start: 0, dur: 0.16, type: "sine", gain: 0.16, glideTo: 150 });
  });
}

/** Streak (série de jours) — petit arpège scintillant. */
export function playStreak() {
  play((ac, m) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      note(ac, m, { freq: f, start: i * 0.07, dur: 0.28, type: "triangle", gain: 0.15 })
    );
  });
}

/** Fin de leçon / scénario réussi — accord chaleureux. */
export function playComplete() {
  play((ac, m) => {
    note(ac, m, { freq: 523.25, start: 0, dur: 0.5, type: "sine", gain: 0.16 });
    note(ac, m, { freq: 659.25, start: 0.02, dur: 0.5, type: "sine", gain: 0.14 });
    note(ac, m, { freq: 783.99, start: 0.04, dur: 0.6, type: "sine", gain: 0.14 });
  });
}

/** Montée de niveau / titre débloqué — petite fanfare. */
export function playLevelUp() {
  play((ac, m) => {
    [392, 523.25, 659.25, 987.77].forEach((f, i) =>
      note(ac, m, { freq: f, start: i * 0.1, dur: 0.32, type: "square", gain: 0.09 })
    );
    note(ac, m, { freq: 1975.5, start: 0.42, dur: 0.35, type: "sine", gain: 0.12, glideTo: 2637 });
  });
}

/** Gain de points/XP — petit blip type "pièce". */
export function playCoin() {
  play((ac, m) => {
    note(ac, m, { freq: 988, start: 0, dur: 0.09, type: "square", gain: 0.1 });
    note(ac, m, { freq: 1568, start: 0.05, dur: 0.12, type: "square", gain: 0.1 });
  });
}
