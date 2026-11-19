// Bips (Web Audio) et écran maintenu allumé (Wake Lock + vidéo muette pour iOS).
let ctx = null;

/** À appeler dans un geste utilisateur (iOS exige un déverrouillage audio). */
export function audioPret() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    // son silencieux pour déverrouiller l'audio sur iOS
    const o = ctx.createOscillator(), g = ctx.createGain();
    g.gain.value = 0; o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.01);
  } catch (e) { console.warn('audio', e); }
}

function tone(freq, start, dur, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(start); o.stop(start + dur + 0.05);
}

/** Bip doux de fin d'exercice. */
export function bip(volume = 0.5) {
  try {
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + 0.02;
    tone(528, t, 0.7, 0.28 * volume);
    tone(1056, t, 0.35, 0.05 * volume);
  } catch (e) { console.warn(e); }
}
/** Double bip de fin de séance. */
export function doubleBip(volume = 0.5) {
  try {
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    tone(528, t, 0.6, 0.28 * volume);
    tone(660, t + 0.45, 0.9, 0.28 * volume);
  } catch (e) { console.warn(e); }
}

// ---------- Écran allumé ----------
let sentinel = null, video = null, actif = false;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

async function demanderWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => { sentinel = null; });
      return true;
    }
  } catch (e) { console.warn('wakeLock', e); }
  return false;
}

function demarrerVideo() {
  try {
    if (!video) {
      video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.muted = true;
      video.loop = true;
      video.src = new URL('../../assets/keepawake.mp4', import.meta.url).href;
      Object.assign(video.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0.01', pointerEvents: 'none', left: '0', bottom: '0' });
      document.body.append(video);
    }
    const p = video.play();
    if (p && p.catch) p.catch((e) => console.warn('vidéo', e));
  } catch (e) { console.warn('vidéo', e); }
}

/** À appeler dans un geste utilisateur. */
export async function garderEcranAllume() {
  actif = true;
  const ok = await demanderWakeLock();
  // Safari iOS (surtout en mode écran d'accueil) : la vidéo muette en secours.
  if (!ok || isIOS) demarrerVideo();
}
export function libererEcran() {
  actif = false;
  try { if (sentinel) sentinel.release(); } catch { /* ignore */ }
  sentinel = null;
  try { if (video) video.pause(); } catch { /* ignore */ }
}
document.addEventListener('visibilitychange', () => {
  if (actif && document.visibilityState === 'visible') {
    if (!sentinel) demanderWakeLock();
    if (video && isIOS) demarrerVideo();
  }
});
