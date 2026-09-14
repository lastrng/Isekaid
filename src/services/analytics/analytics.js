const ALLOWED_EVENTS = new Set([
  "onboarding_started","onboarding_step_viewed","onboarding_skipped","onboarding_completed",
  "guide_today_completed","guide_travel_completed","guide_learn_completed","guide_discover_completed","guide_myJapan_completed",
  "trip_created","trip_started","trip_completed","place_added","place_completed",
  "scenario_completed","kana_session_completed","sos_opened","tutor_started","favorite_added","readiness_score_changed",
]);

let adapter = null;

export function configureAnalytics(nextAdapter) {
  adapter = typeof nextAdapter?.track === "function" ? nextAdapter : null;
}

function safeProperties(properties = {}) {
  return Object.fromEntries(Object.entries(properties).filter(([key,value])=>
    !/name|email|message|note|content|token|user/i.test(key) && ["string","number","boolean"].includes(typeof value)
  ));
}

export function trackProductEvent(name, properties) {
  if (!ALLOWED_EVENTS.has(name)) return false;
  if (!adapter) return true; // instrumentation valide, fournisseur volontairement absent
  try { adapter.track(name, safeProperties(properties)); return true; }
  catch { return false; }
}

export { ALLOWED_EVENTS };
