const NIVEAU_ORDER = ["débutant", "faux-débutant", "intermédiaire"];
const SELF_REPORT_FLOOR = { beginner: "débutant", intermediate: "faux-débutant", advanced: "intermédiaire" };

export function estimateNiveau(kanaProgress, scenProgress, streak, selfReportedLevel) {
  const mastered = Object.values(kanaProgress || {}).filter(value => (value.box || 0) >= 5).length;
  const scenDone = (scenProgress?.done || []).length;
  const best = streak?.best || 0;
  let behavioral = "débutant";
  if (mastered >= 60 || scenDone >= 5) behavioral = "intermédiaire";
  else if (mastered >= 20 || scenDone >= 2 || best >= 14) behavioral = "faux-débutant";
  const floor = SELF_REPORT_FLOOR[selfReportedLevel];
  if (!floor) return behavioral;
  return NIVEAU_ORDER[Math.max(NIVEAU_ORDER.indexOf(behavioral), NIVEAU_ORDER.indexOf(floor))];
}
