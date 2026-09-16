import { readFileSync, writeFileSync } from "node:fs";

const input=new URL("../src/japan-data.json",import.meta.url);
const output=new URL("../supabase/functions/carnet-render/journal-catalog.json",import.meta.url);
const db=JSON.parse(readFileSync(input,"utf8"));
const catalog={
  cities:(db.villes||[]).map(({id,nom,nom_jp,region,prefecture,prefectureId,image})=>({id,nom,nom_jp,region,prefecture,prefectureId,image})),
  places:(db.lieux||[]).map(({id,nom,nom_jp,villeId,quartier,categorie,description,conseil,image,photo})=>({id,nom,nom_jp,villeId,quartier,categorie,description,conseil,image:image||photo||null})),
};
writeFileSync(output,`${JSON.stringify(catalog)}\n`);
console.log(`Catalogue carnet: ${catalog.cities.length} villes, ${catalog.places.length} lieux.`);
