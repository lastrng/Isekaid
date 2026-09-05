#!/usr/bin/env node
import { access, readFile, writeFile } from "node:fs/promises";

const dataPath = "src/japan-data.json";
const editorialPath = "src/lieu-editorial.json";
const data = JSON.parse(await readFile(dataPath, "utf8"));
const editorial = JSON.parse(await readFile(editorialPath, "utf8"));
const cities = new Map(data.villes.map((city) => [city.id, city]));

const coordinates = {
  "takeshita-dori": [35.6716, 139.7045], "meiji-jingu-gyoen": [35.6764, 139.6993],
  "shibuya-sky": [35.6585, 139.7022], "shinjuku-gyoen": [35.6852, 139.7100],
  "omoide-yokocho": [35.6939, 139.6995], "golden-gai": [35.6942, 139.7048],
  "ginza": [35.6717, 139.7650], "teamlab-planets": [35.6491, 139.7898],
  "yanaka-ginza": [35.7277, 139.7654], "nakamise": [35.7123, 139.7966],
  "odaiba": [35.6267, 139.7753], "kappabashi": [35.7147, 139.7880],
  "shimokitazawa": [35.6615, 139.6680], "sumida-river": [35.7107, 139.7980],
  "ameyoko": [35.7090, 139.7747]
};

const tones = {
  Restaurant: "une pause gourmande", Shopping: "une étape de découverte et de flânerie",
  Ramen: "une expérience culinaire directe et typiquement japonaise",
  "Café à animaux": "une expérience très populaire, à aborder en restant attentif au bien-être animal",
  "Hôtel de luxe": "une parenthèse tournée vers l’architecture, le service et la vue",
  Ryokan: "une immersion dans les codes de l’hospitalité japonaise",
  Onsen: "un moment de détente régi par des usages précis",
  default: "une étape qui permet de mieux sentir le caractère du quartier"
};

function createEditorial(place) {
  const city = cities.get(place.villeId);
  const location = [place.quartier, city?.nom].filter(Boolean).join(", ");
  const tone = tones[place.categorie] || tones.default;
  const nearby = (place.a_proximite || []).map((id) => data.lieux.find((item) => item.id === id)?.nom).filter(Boolean);
  const connection = nearby.length
    ? `La visite se combine naturellement avec ${nearby.slice(0, 2).join(" et ")}, ce qui permet de construire une séquence cohérente sans multiplier les transports.`
    : `Le meilleur moyen d’en profiter est de l’intégrer à une exploration à pied de ${place.quartier || city?.nom || "ses environs"}, plutôt que d’en faire un aller-retour isolé.`;
  return `${place.nom} s’inscrit dans ${location || "son environnement"} comme ${tone}. ${place.description}\n\nSur place, l’intérêt vient autant de l’ambiance que de l’activité elle-même. Prends le temps d’observer les usages locaux, la façon dont les visiteurs occupent l’espace et les détails du quartier : c’est souvent là que l’expérience devient plus personnelle qu’une simple étape cochée sur un itinéraire. ${connection}\n\nConseil Isekaid : ${place.conseil} Les horaires, tarifs et conditions pouvant évoluer, vérifie toujours la source officielle le jour de la visite. Garde aussi un peu de marge dans ton programme : les bonnes découvertes au Japon se trouvent souvent entre deux destinations.`;
}

let stories = 0;
let imageFallbacks = 0;
let mapped = 0;
for (const place of data.lieux) {
  if (!editorial[place.id]?.editorial?.trim()) {
    editorial[place.id] = { ...(editorial[place.id] || {}), editorial: createEditorial(place), generated_from_catalog: true };
    stories++;
  }
  if (place.image) {
    try { await access(`public${place.image}`); }
    catch {
      const fallback = cities.get(place.villeId)?.image;
      if (fallback) {
        place.image_original = place.image;
        place.image = fallback;
        place.image_fallback = true;
        imageFallbacks++;
      }
    }
  }
  if ((!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) && coordinates[place.id]) {
    [place.lat, place.lng] = coordinates[place.id];
    place.coordinates_approximate = true;
    mapped++;
  }
}

await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);
await writeFile(editorialPath, `${JSON.stringify(editorial, null, 2)}\n`);
console.log(`${stories} récits complétés, ${imageFallbacks} fallbacks image, ${mapped} positions ajoutées.`);
