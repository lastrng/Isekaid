import { useEffect, useState } from "react";

const STROKE_SECONDS = 1.15;
const STROKE_PAUSE_SECONDS = 0.22;

function isKatakana(character) {
  const codePoint = character.codePointAt(0);
  return codePoint >= 0x30a0 && codePoint <= 0x30ff;
}

async function loadKanaData(character) {
  const module = isKatakana(character)
    ? await import("kana-svg-data/dist/allKatakana.json")
    : await import("kana-svg-data/dist/allHiragana.json");
  return module.default.find(entry => entry.charCode === character.codePointAt(0)) || null;
}

function medianPath(points) {
  if (!points?.length) return "";
  return points.map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`).join(" ");
}

export function KanaStrokeAnimation({ kana, color }) {
  const [characters, setCharacters] = useState([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    Promise.all(Array.from(kana).map(async character => ({ character, data:await loadKanaData(character) })))
      .then(result => { if (active) setCharacters(result); })
      .catch(() => { if (active) { setCharacters([]); setFailed(true); } });
    return () => { active = false; };
  }, [kana]);

  if (!characters.length || characters.some(item => !item.data)) {
    return failed ? <span className="kana-stroke-fallback" style={{ color }}>{kana}</span> : null;
  }

  let strokeOffset = 0;
  return (
    <span className="kana-stroke-animation" role="img" aria-label={`Ordre des traits pour ${kana}`}>
      {characters.map(({ character, data }, characterIndex) => {
        const startOffset = strokeOffset;
        strokeOffset += data.medians.length;
        return (
          <svg key={`${character}-${characterIndex}`} viewBox="0 0 1024 1024" aria-hidden="true">
            <defs>
              {data.strokes.map((stroke, strokeIndex) => (
                <clipPath id={`kana-clip-${character.codePointAt(0)}-${characterIndex}-${strokeIndex}`} key={stroke.id}>
                  <path d={stroke.value}/>
                </clipPath>
              ))}
            </defs>
            {data.medians.map((median, strokeIndex) => {
              const delay = (startOffset + strokeIndex) * (STROKE_SECONDS + STROKE_PAUSE_SECONDS);
              return (
                <path
                  className="kana-brush-stroke"
                  clipPath={`url(#kana-clip-${character.codePointAt(0)}-${characterIndex}-${strokeIndex})`}
                  d={medianPath(median.value)}
                  key={median.id}
                  pathLength="1"
                  style={{ stroke:color, animationDelay:`${delay}s`, animationDuration:`${STROKE_SECONDS}s` }}
                />
              );
            })}
          </svg>
        );
      })}
    </span>
  );
}
