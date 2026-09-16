import { spawnSync } from "node:child_process";

export const ALLOWED_TARGET_EMAIL = "test1@gmail.com";
export const SIMULATION_TRIP_ID = "isekaid-test-completed-tokyo-kyoto-2026";

function cliCommand() {
  const executable = process.env.SUPABASE_CLI || "npx";
  return executable === "npx"
    ? { executable, prefix: ["--yes", "supabase"] }
    : { executable, prefix: [] };
}

export function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function runLinkedQuery(sql) {
  const { executable, prefix } = cliCommand();
  const result = spawnSync(executable, [...prefix, "db", "query", "--linked", "--output-format", "json", sql], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(result.stderr?.trim() || result.stdout?.trim() || "Supabase query failed");
  const start = result.stdout.indexOf("{");
  if (start < 0) throw new Error(`Réponse Supabase illisible: ${result.stdout.slice(0, 300)}`);
  const payload = JSON.parse(result.stdout.slice(start));
  if (!Array.isArray(payload.rows)) throw new Error("Réponse Supabase sans tableau rows");
  return payload.rows;
}

export function requireAllowedEmail() {
  const email = process.env.TARGET_EMAIL;
  if (!email) throw new Error("TARGET_EMAIL est obligatoire.");
  if (email !== ALLOWED_TARGET_EMAIL) throw new Error(`Refus de sécurité : seul ${ALLOWED_TARGET_EMAIL} est autorisé par ce script.`);
  return email;
}

export function resolveTargetUser(email) {
  const rows = runLinkedQuery(`select id,email,created_at,updated_at from auth.users where email=${sqlLiteral(email)} order by id;`);
  if (rows.length !== 1) throw new Error(`Refus de sécurité : ${rows.length} compte(s) Auth correspondent exactement à ${email}.`);
  const user = rows[0];
  if (user.email !== ALLOWED_TARGET_EMAIL || !/^[0-9a-f-]{36}$/i.test(user.id)) throw new Error("Refus de sécurité : identité Auth incohérente.");
  return user;
}

export function loadTargetSnapshot(targetUserId) {
  const id = sqlLiteral(targetUserId);
  const rows = runLinkedQuery(`
    select jsonb_build_object(
      'progress',(select to_jsonb(p) from public.progress p where p.user_id=${id}::uuid),
      'user_backups',(select coalesce(jsonb_agg(to_jsonb(b)),'[]'::jsonb) from public.user_backups b where b.user_id=${id}::uuid),
      'premium_grants',(select coalesce(jsonb_agg(to_jsonb(g)),'[]'::jsonb) from public.premium_grants g where g.user_id=${id}::uuid),
      'tutor_conversations',(select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) from public.tutor_conversations c where c.user_id=${id}::uuid),
      'tutor_messages',(select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) from public.tutor_messages m where m.user_id=${id}::uuid),
      'ai_usage',(select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from public.ai_usage a where a.user_id=${id}::uuid),
      'memory_photos',(select coalesce(jsonb_agg(jsonb_build_object('name',o.name,'bucket_id',o.bucket_id,'created_at',o.created_at,'updated_at',o.updated_at,'metadata',o.metadata)),'[]'::jsonb) from storage.objects o where o.bucket_id='memory-photos' and (storage.foldername(o.name))[1]=${id})
    ) as snapshot;
  `);
  const snapshot = rows[0]?.snapshot;
  if (!snapshot?.progress || snapshot.progress.user_id !== targetUserId) throw new Error("La ligne public.progress cible est absente ou incohérente.");
  return snapshot;
}

export function otherUsersFingerprint(targetUserId) {
  const rows = runLinkedQuery(`
    select count(*)::int as row_count,
      md5(coalesce(string_agg(user_id::text||':'||coalesce(updated_at::text,'')||':'||md5(coalesce(trips,'[]'::jsonb)::text),',' order by user_id),'')) as fingerprint
    from public.progress where user_id<>${sqlLiteral(targetUserId)}::uuid;
  `);
  return rows[0];
}

export function buildSimulationTrip() {
  const days = [
    { num:1, date:"2026-08-15", villeId:"tokyo", title:"Asakusa, premières lumières", places:[["senso-ji","09:00","Première journée à Tokyo, découverte d’Asakusa et Sensō-ji."],["nakamise","11:00",""]] },
    { num:2, date:"2026-08-16", villeId:"tokyo", title:"Du sanctuaire à Shibuya", places:[["meiji-jingu","09:00",""],["takeshita-dori","11:30",""],["shibuya-crossing","17:30",""]] },
    { num:3, date:"2026-08-17", villeId:"tokyo", title:"Marché et baie de Tokyo", places:[["tsukiji","08:30",""],["odaiba","15:00",""]] },
    { num:4, date:"2026-08-18", villeId:"tokyo", title:"Tokyo côté quartiers", places:[["shimokitazawa","10:30","Shimokitazawa a été l’un des quartiers les plus agréables du séjour."],["shinjuku-gyoen","15:00",""]] },
    { num:5, date:"2026-08-19", villeId:"kyoto", title:"Premiers pas à Kyoto", places:[["fushimi-inari","08:00",""]] },
    { num:6, date:"2026-08-20", villeId:"kyoto", title:"Higashiyama et Gion", places:[["kiyomizu-dera","09:00",""],["gion","17:00","Gion en fin de journée était complètement différent du Tokyo des premiers jours."]] },
    { num:7, date:"2026-08-21", villeId:"kyoto", title:"Arashiyama au matin", places:[["arashiyama","08:00",""]] },
    { num:8, date:"2026-08-22", villeId:"kyoto", title:"Saveurs et dernier regard", places:[["nishiki","09:30",""],["kyoto-ramen-koji","13:00","Dernier déjeuner autour d’un ramen avant de quitter Kyoto."]] },
  ];
  return {
    id: SIMULATION_TRIP_ID,
    titre: "Tokyo & Kyoto — été 2026",
    source: "completed-trip-test-user",
    modelVersion: 2,
    mode_dates: "dates",
    dateDebut: "2026-08-15",
    dateFin: "2026-08-22",
    status: "completed",
    completedAt: "2026-08-22T23:59:59.000Z",
    updatedAt: "2026-09-11T12:30:00.000Z",
    villes: ["tokyo", "kyoto"],
    plannedPrefectures: [
      { prefectureId:"tokyo", prefectureName:"Tokyo", cityIds:["tokyo"], addedAt:"2026-07-01T10:00:00.000Z" },
      { prefectureId:"kyoto", prefectureName:"Kyoto", cityIds:["kyoto"], addedAt:"2026-07-01T10:01:00.000Z" },
    ],
    etapes: [
      { id:"seed-stage-tokyo", villeId:"tokyo", nuits:4, nonPlanifie:[] },
      { id:"seed-stage-kyoto", villeId:"kyoto", nuits:4, nonPlanifie:[] },
    ],
    checklist: [
      { id:"seed-check-passport", texte:"Passeport valide", fait:true },
      { id:"seed-check-flights", texte:"Billets d’avion", fait:true },
      { id:"seed-check-hotels", texte:"Hébergements réservés", fait:true },
      { id:"seed-check-esim", texte:"eSIM installée", fait:true },
      { id:"seed-check-insurance", texte:"Assurance voyage", fait:true },
    ],
    jours: days.map(day => ({
      num: day.num,
      date: day.date,
      villeId: day.villeId,
      etapeId: day.villeId === "tokyo" ? "seed-stage-tokyo" : "seed-stage-kyoto",
      titre: day.title,
      recit: day.num === 1
        ? "Huit jours entre l’énergie de Tokyo et les quartiers historiques de Kyoto. Cette première journée à Asakusa installe le rythme du séjour, entre ruelles vivantes, temple et premiers repères dans la ville."
        : `Jour ${day.num} du voyage Tokyo & Kyoto. La journée garde un rythme volontairement souple afin de profiter des quartiers, des trajets et des découvertes imprévues sans transformer le séjour en course.`,
      conseilDuJour: "Prévoir une marge pour les transports, vérifier les horaires le matin et garder assez de temps pour observer le quartier entre deux visites.",
      activites: day.places.map(([lieuId, heure, note], index) => ({
        id: `seed-day-${day.num}-activity-${index + 1}`,
        lieuId,
        heure,
        fait: true,
        note,
      })),
    })),
  };
}

export function seedSql({ targetEmail, targetUserId, trip }) {
  const tripJson = sqlLiteral(JSON.stringify(trip));
  return `
    do $$
    declare
      target_email constant text := ${sqlLiteral(targetEmail)};
      expected_user_id constant uuid := ${sqlLiteral(targetUserId)}::uuid;
      resolved_user_id uuid;
      auth_matches integer;
      changed_rows integer;
    begin
      if target_email <> ${sqlLiteral(ALLOWED_TARGET_EMAIL)} then raise exception 'target_email_not_allowed'; end if;
      select count(*),(array_agg(id))[1] into auth_matches,resolved_user_id from auth.users where email=target_email;
      if auth_matches <> 1 or resolved_user_id <> expected_user_id then raise exception 'target_auth_mismatch'; end if;
      if not exists(select 1 from public.progress where user_id=resolved_user_id) then raise exception 'target_progress_missing'; end if;
      if exists(select 1 from public.progress p cross join lateral jsonb_array_elements(coalesce(p.trips,'[]'::jsonb)) trip where p.user_id=resolved_user_id and trip->>'id'=${sqlLiteral(SIMULATION_TRIP_ID)}) then raise exception 'simulation_trip_already_exists'; end if;
      update public.progress
      set trips=coalesce(trips,'[]'::jsonb)||jsonb_build_array(${tripJson}::jsonb),updated_at=now()
      where user_id=resolved_user_id and exists(select 1 from auth.users u where u.id=resolved_user_id and u.email=target_email);
      get diagnostics changed_rows=row_count;
      if changed_rows <> 1 then raise exception 'unsafe_update_count_%',changed_rows; end if;
      raise notice 'Target account: %, UUID: %',target_email,resolved_user_id;
    end $$;
  `;
}

export function restoreSql({ targetEmail, targetUserId, originalTrips, originalUpdatedAt, originalUserBackup }) {
  return `
    do $$
    declare
      target_email constant text := ${sqlLiteral(targetEmail)};
      expected_user_id constant uuid := ${sqlLiteral(targetUserId)}::uuid;
      resolved_user_id uuid;
      auth_matches integer;
      changed_rows integer;
    begin
      if target_email <> ${sqlLiteral(ALLOWED_TARGET_EMAIL)} then raise exception 'target_email_not_allowed'; end if;
      select count(*),(array_agg(id))[1] into auth_matches,resolved_user_id from auth.users where email=target_email;
      if auth_matches <> 1 or resolved_user_id <> expected_user_id then raise exception 'target_auth_mismatch'; end if;
      update public.progress set trips=${sqlLiteral(JSON.stringify(originalTrips))}::jsonb,updated_at=${sqlLiteral(originalUpdatedAt)}::timestamptz
      where user_id=resolved_user_id and exists(select 1 from auth.users u where u.id=resolved_user_id and u.email=target_email);
      get diagnostics changed_rows=row_count;
      if changed_rows <> 1 then raise exception 'unsafe_update_count_%',changed_rows; end if;

      update public.user_backups
      set payload=${sqlLiteral(JSON.stringify(originalUserBackup.payload))}::jsonb,
          updated_at=${sqlLiteral(originalUserBackup.updated_at)}::timestamptz
      where user_id=resolved_user_id
        and exists(select 1 from auth.users u where u.id=resolved_user_id and u.email=target_email);
      get diagnostics changed_rows=row_count;
      if changed_rows <> 1 then raise exception 'unsafe_backup_restore_count_%',changed_rows; end if;
    end $$;
  `;
}

export function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
