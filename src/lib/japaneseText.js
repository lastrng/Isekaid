/** Sélectionne la graphie principale selon la préférence utilisateur. */
export function jpMain(entry, script, jpField = "jp") {
  if (!entry) return "";
  const japanese = entry[jpField] || entry.jp || "";
  if (script === "romaji") return entry.romaji || japanese;
  if (script === "kana") return entry.kana || japanese;
  return japanese;
}

/** Sélectionne la graphie complémentaire affichée sous le texte principal. */
export function jpSub(entry, script, jpField = "jp") {
  if (!entry) return "";
  const japanese = entry[jpField] || entry.jp || "";
  if (script === "romaji") return japanese;
  return entry.romaji || "";
}

/** Extrait une réplique japonaise citée entre guillemets français. */
export function extractSituationJP(situation) {
  const match = situation && situation.match(/«\s*([^»]+?)\s*»/);
  return match ? match[1] : null;
}

/**
 * Aligne les segments japonais annotés sur leur traduction française.
 * Retourne null quand le contenu ne fournit pas assez d'informations.
 */
export function alignWords(words, frenchText) {
  if (!words?.length || !frenchText) return null;

  const claims = [];
  words.forEach((word, index) => {
    if (!word.fr) return;
    let searchFrom = 0;
    let position = -1;
    while (true) {
      position = frenchText.indexOf(word.fr, searchFrom);
      if (position === -1) break;
      const overlaps = claims.some(
        (claim) => position < claim.end && position + word.fr.length > claim.start,
      );
      if (!overlaps) break;
      searchFrom = position + 1;
    }
    if (position !== -1) {
      claims.push({ start: position, end: position + word.fr.length, index });
    }
  });

  if (!claims.length) return null;
  claims.sort((a, b) => a.start - b.start);

  const frenchSegments = [];
  let cursor = 0;
  claims.forEach((claim) => {
    if (claim.start > cursor) {
      frenchSegments.push({ text: frenchText.slice(cursor, claim.start), wordIndex: null });
    }
    frenchSegments.push({
      text: frenchText.slice(claim.start, claim.end),
      wordIndex: claim.index,
    });
    cursor = claim.end;
  });
  if (cursor < frenchText.length) {
    frenchSegments.push({ text: frenchText.slice(cursor), wordIndex: null });
  }

  return {
    jpSegs: words.map((word, index) => ({ text: word.jp, wordIndex: index })),
    frSegs: frenchSegments,
  };
}
