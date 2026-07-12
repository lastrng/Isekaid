import fs from "fs";
import { parse } from "csv-parse/sync";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ── Config à remplir ──
const PEXELS_API_KEY = "5wvHbjy0pPljB0LkmKOCIc21OLw68jAnYvzxzNbrxpWQRua1Vbi9jwtR";
const R2_ACCOUNT_ID = "4a060089e1616724878d9089cd7a64dd";
const R2_ACCESS_KEY = "1abf8482e808cd0ab6cf65d1cd04dd6d";
const R2_SECRET_KEY = "344332e6e6c20cc665abcd589ba084a8738483afb43b6912a07bfef348eecc6d";
const R2_BUCKET = "isekaid-videos";
const R2_PUBLIC_URL = "https://pub-a6a6b70f40c3408ca668cee0ae325db8.r2.dev";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
});

async function searchPexels(query) {
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3&orientation=portrait`,
    { headers: { Authorization: PEXELS_API_KEY } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const vid = data.videos?.[0];
  if (!vid) return null;
  // Choisit la meilleure qualité SD/HD raisonnable (évite le 4K trop lourd)
  const file = vid.video_files.find(f => f.quality === "sd" && f.width >= 640)
            || vid.video_files.find(f => f.quality === "hd")
            || vid.video_files[0];
  return { url: file.link, duration: vid.duration };
}

async function uploadToR2(buffer, key) {
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: key, Body: buffer, ContentType: "video/mp4",
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function run() {
  const csv = fs.readFileSync("video-mapping.csv", "utf8");
  const rows = parse(csv, { columns: true });
  const map = {};
  let found = 0, missing = 0;

  for (const row of rows) {
    const hit = await searchPexels(row.requete_pexels_suggeree);
    if (!hit) {
      console.log(`✗ ${row.nom}`);
      missing++;
      continue;
    }
    try {
      const res = await fetch(hit.url);
      const buf = Buffer.from(await res.arrayBuffer());
      const key = `lieux/${row.id_lieu}.mp4`;
      const publicUrl = await uploadToR2(buf, key);
      map[row.id_lieu] = { video: publicUrl, duration: hit.duration };
      console.log(`✓ ${row.nom} → ${publicUrl}`);
      found++;
    } catch (e) {
      console.log(`✗ ${row.nom} (erreur upload: ${e.message})`);
      missing++;
    }
    await new Promise(r => setTimeout(r, 300)); // politesse API
  }

  fs.writeFileSync("src/video-map.json", JSON.stringify(map, null, 2));
  console.log(`\n✅ Trouvées: ${found} | ⚠️ Manquantes: ${missing}`);
}

run();