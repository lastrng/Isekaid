#!/usr/bin/env node
/**
 * add-secondary-cities-content.mjs — one-shot script (not meant to be re-run)
 * ----------------------------------------------------------------------------
 * Enrichit src/japan-data.json avec des lieux populaires pour les villes très
 * sous-représentées face à Tokyo (116 lieux) : Kyoto (9), Osaka (7), Nara (4),
 * Hiroshima (4), Hakone (4), Kanazawa (3, dont 1 mal rattaché), Takayama (2),
 * Uji (2). Cause directe des voyages générés par l'IA avec des journées trop
 * clairsemées hors Tokyo (l'IA ne peut jamais inventer un lieu hors du
 * catalogue reçu). Ajoute aussi les paragraphes éditoriaux correspondants
 * dans src/lieu-editorial.json (jusqu'ici branché uniquement sur la fiche
 * "Lieu du jour" de l'accueil, maintenant aussi utilisé dans la fiche détail
 * d'une activité de voyage — voir VoyageTrip dans src/App.jsx).
 *
 * Corrige au passage une erreur de données préexistante : "himeji-castle"
 * était rattaché à villeId "kanazawa" alors que ses coordonnées (34.84,134.69)
 * sont à ~230km de Kanazawa (36.56,136.66) — c'est en réalité Himeji, une
 * ville absente du catalogue. Ajoute cette ville et y déplace le château.
 *
 * USAGE : node scripts/add-secondary-cities-content.mjs
 */
import fs from "node:fs";

const DATA_PATH = "src/japan-data.json";
const EDITORIAL_PATH = "src/lieu-editorial.json";

const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const editorial = JSON.parse(fs.readFileSync(EDITORIAL_PATH, "utf8"));

// ── Correction : Himeji n'est pas Kanazawa ──────────────────────────────────
const himejiCastle = data.lieux.find((l) => l.id === "himeji-castle");
if (!himejiCastle) throw new Error("himeji-castle introuvable — le script a peut-être déjà tourné");
himejiCastle.villeId = "himeji";
himejiCastle.quartier = "Himeji";

if (!data.villes.some((v) => v.id === "himeji")) {
  data.villes.push({
    id: "himeji",
    nom: "Himeji",
    nom_jp: "姫路",
    region: "Kansai",
    emoji: "🏯",
    tagline: "Le plus beau château du Japon",
    description: "Petite ville portée par un seul monument, mais quel monument : le château de Himeji, jamais détruit, blanc et intact depuis le XVIIe siècle. Une excursion facile depuis Osaka, Kyoto ou Kobe.",
    lat: 34.8394,
    lng: 134.6939,
    jours_conseilles: "1/2 journée",
    image: "/images/villes/himeji.jpg",
  });
}

// ── Nouveaux lieux ───────────────────────────────────────────────────────────
// Chaque entrée : champs du catalogue (schema identique aux lieux existants)
// + `editorial` (fusionné à part dans lieu-editorial.json, pas dans le lieu
// lui-même — même séparation que pour les lieux existants).
const NEW_LIEUX = [
  // ═══════════════════════ KYOTO ═══════════════════════
  {
    id: "tenryu-ji", villeId: "kyoto", nom: "Tenryu-ji", nom_jp: "天龍寺", type: "voir",
    categorie: "Temple", emoji: "⛩️", interets: ["culture", "nature"], quartier: "Arashiyama",
    description: "Temple zen classé UNESCO à l'entrée d'Arashiyama, célèbre pour son jardin Sogen-chi qui utilise les montagnes environnantes comme décor naturel.",
    conseil: "Combine avec la bambouseraie juste derrière (sortie nord du jardin) — évite de refaire le trajet en sens inverse.",
    duree: "1h", budget: "¥", lat: 35.0159, lng: 135.6742, saison_ideale: "automne",
    horaires: "8h30–17h00", acces: "Station Saga-Arashiyama (JR) ou Arashiyama (Randen), 5 min à pied",
    prix_detail: "500¥ (jardin), +300¥ pour les bâtiments", site_web: "tenryuji.com",
    a_proximite: ["arashiyama"], image: "/images/lieux-photos/tenryu-ji.jpg",
    editorial: "Tenryu-ji ouvre Arashiyama sur son versant le plus posé. Passé l'entrée, le jardin Sogen-chi se déploie autour d'un étang central : conçu au XIVe siècle par le moine-paysagiste Muso Soseki, il emprunte le mont Arashiyama en arrière-plan comme s'il faisait partie du jardin lui-même — un des rares exemples de \"paysage emprunté\" (shakkei) encore intact au Japon.\n\nLa promenade autour de l'étang change de visage à chaque saison : érables flamboyants en automne, azalées et iris au printemps. Les salles du hondo, reconstruites après plusieurs incendies (la dernière fois au XIXe siècle), abritent un dragon peint au plafond qui semble suivre le visiteur des yeux depuis n'importe quel angle de la pièce.\n\nLa sortie nord du jardin débouche directement sur la bambouseraie d'Arashiyama, sans qu'il soit nécessaire de repasser par l'entrée principale — un enchaînement que beaucoup de visiteurs pressés ratent en repartant par où ils sont arrivés.",
  },
  {
    id: "sanjusangendo", villeId: "kyoto", nom: "Sanjusangendo", nom_jp: "三十三間堂", type: "voir",
    categorie: "Temple", emoji: "🙏", interets: ["culture"], quartier: "Higashiyama",
    description: "Le plus long bâtiment en bois du Japon, abritant 1001 statues dorées de Kannon alignées dans une pénombre saisissante.",
    conseil: "Photos interdites à l'intérieur — profites-en pour vraiment regarder plutôt que de shooter en passant.",
    duree: "45min", budget: "¥", lat: 34.9877, lng: 135.7717, saison_ideale: "",
    horaires: "8h00–17h00 (16h30 nov-mars)", acces: "Station Keihan Shichijo, 7 min à pied",
    prix_detail: "600¥", site_web: "sanjusangendo.jp",
    a_proximite: ["kiyomizu-dera"], image: "/images/lieux-photos/sanjusangendo.jpg",
    editorial: "Rien ne prépare vraiment à l'alignement de Sanjusangendo. Sur plus de 120 mètres de long — le bâtiment en bois le plus étendu du Japon —, 1001 statues de Kannon à mille bras se tiennent en rangs serrés, dorées, chacune légèrement différente de sa voisine malgré une pose quasi identique. La légende veut que l'on puisse toujours retrouver, parmi elles, un visage qui ressemble à quelqu'un qu'on a connu.\n\nAu centre de la rangée trône une Kannon assise bien plus grande, sculptée au XIIIe siècle par le maître Tankei alors âgé de 82 ans. Devant les statues, une rangée de vingt-huit gardiens (les Nijuhachi Bushu) veille, chacun représentant une figure protectrice différente du bouddhisme.\n\nLe nom du temple — \"salle aux trente-trois espaces\" — vient du nombre de travées entre les piliers, un chiffre bouddhique associé aux trente-trois formes que peut prendre Kannon pour venir en aide aux êtres. Le silence et la pénombre du lieu, photographies interdites, en font une expérience à vivre pleinement plutôt qu'à documenter.",
  },
  {
    id: "philosophers-path", villeId: "kyoto", nom: "Chemin du Philosophe", nom_jp: "哲学の道", type: "faire",
    categorie: "Promenade", emoji: "🌸", interets: ["culture", "nature"], quartier: "Higashiyama",
    description: "Sentier bordé de cerisiers longeant un canal entre Ginkaku-ji et Nanzen-ji, nommé d'après un philosophe qui s'y promenait chaque jour.",
    conseil: "Marche-le dans le sens Ginkaku-ji → Nanzen-ji pour enchaîner naturellement sur les autres temples de Higashiyama.",
    duree: "1h", budget: "Gratuit", lat: 35.0212, lng: 135.7955, saison_ideale: "printemps",
    horaires: "24h/24", acces: "Bus 5 ou 32 arrêt Ginkakuji-michi, puis à pied",
    prix_detail: "Gratuit", site_web: "",
    a_proximite: ["ginkaku-ji-kyoto", "nanzen-ji"], image: "/images/lieux-photos/philosophers-path.jpg",
    editorial: "Le philosophe Nishida Kitaro empruntait ce chemin longeant le canal de Biwako chaque jour pour se rendre à l'université de Kyoto, plongé dans ses pensées — d'où le nom qui lui est resté. Deux kilomètres à peine séparent Ginkaku-ji de Nanzen-ji, mais le rythme qu'impose ce canal bordé de centaines de cerisiers invite à ralentir bien plus que la distance ne le suggère.\n\nAu printemps, la floraison transforme le chemin en tunnel rose ; le reste de l'année, ce sont les petites boutiques de thé, galeries d'artisanat et cafés nichés le long du parcours qui rythment la balade. De petits temples secondaires, souvent déserts, ponctuent le trajet pour qui prend le temps de s'écarter du canal principal.\n\nContrairement aux grands sites de Higashiyama, le chemin lui-même ne se visite pas — il se traverse, d'un bout à l'autre, en profitant des arrêts qu'on choisit d'y faire. C'est l'un des rares endroits de Kyoto où la marche est la destination autant que les temples qu'elle relie.",
  },
  {
    id: "nanzen-ji", villeId: "kyoto", nom: "Nanzen-ji", nom_jp: "南禅寺", type: "voir",
    categorie: "Temple", emoji: "⛩️", interets: ["culture"], quartier: "Higashiyama",
    description: "Grand temple zen surmonté d'un imposant aqueduc de brique datant de l'ère Meiji, qui traverse encore le site aujourd'hui.",
    conseil: "Grimpe sur l'aqueduc (accessible librement) pour la photo la plus insolite de Kyoto — brique occidentale sur fond de temple japonais.",
    duree: "1h", budget: "¥", lat: 35.0117, lng: 135.7936, saison_ideale: "automne",
    horaires: "8h40–17h00 (16h30 déc-fév)", acces: "Station Keage (Tozai Line), 10 min à pied",
    prix_detail: "600¥ (Hojo), 500¥ (jardin Sanmon)", site_web: "nanzenji.or.jp",
    a_proximite: ["philosophers-path"], image: "/images/lieux-photos/nanzen-ji.jpg",
    editorial: "Nanzen-ji occupe un rang particulier dans la hiérarchie des temples zen japonais : il fut désigné au XIVe siècle temple le plus élevé de tout le pays, au-dessus même du système des \"cinq montagnes\" qui organisait les autres grands temples zen. Cette prééminence historique se lit encore dans l'ampleur du site, l'un des plus vastes de Kyoto.\n\nCe qui surprend le plus les visiteurs, pourtant, n'a rien de traditionnel : un aqueduc de brique rouge, construit à l'époque Meiji pour acheminer l'eau du lac Biwa jusqu'à Kyoto, traverse littéralement l'enceinte du temple. Le contraste entre cette architecture occidentale du XIXe siècle et les bâtiments zen environnants est devenu, avec le temps, l'une des images les plus photographiées de la ville.\n\nLe jardin sec du Hojo (résidence de l'abbé), attribué à Kobori Enshu, mérite le détour pour son motif dit \"du tigre traversant l'eau\", composé de rochers et de gravier ratissé. Les salles intérieures conservent des paravents peints du XVIe siècle, dans une lumière tamisée qui change avec les heures de la journée.",
  },
  {
    id: "higashi-honganji", villeId: "kyoto", nom: "Higashi Honganji", nom_jp: "東本願寺", type: "voir",
    categorie: "Temple", emoji: "⛩️", interets: ["culture"], quartier: "Shimogyo",
    description: "Immense temple en bois près de la gare de Kyoto, siège de l'école bouddhiste Jodo Shinshu, reconstruit à la fin du XIXe siècle après un incendie.",
    conseil: "Facile à intercaler entre la gare et le reste de la ville — 10 min à pied, gratuit, aucune réservation.",
    duree: "30min", budget: "Gratuit", lat: 34.9917, lng: 135.7585, saison_ideale: "",
    horaires: "5h50–17h30 (mars-oct), 6h20–16h30 (nov-fév)", acces: "Station JR Kyoto, 7 min à pied",
    prix_detail: "Entrée gratuite", site_web: "higashihonganji.or.jp",
    a_proximite: ["kyoto-ramen-koji"], image: "/images/lieux-photos/higashi-honganji.jpg",
    editorial: "À dix minutes à peine de la gare de Kyoto, Higashi Honganji surprend par sa masse : le Goeido, la salle principale, compte parmi les plus grandes structures en bois du monde, capable d'accueillir plusieurs milliers de fidèles. Le bâtiment actuel date de 1895, reconstruit après un énième incendie dans l'histoire mouvementée du temple — les précédents remontent au XVIIe siècle.\n\nUne anecdote frappe les visiteurs qui s'y attardent : lors de la reconstruction, le bois traditionnel ne suffisait pas à assurer la solidité de charpentes de cette taille. Les fidèles ont alors tressé des cordes géantes à partir de leurs propres cheveux, donnés en offrande, pour hisser les poutres massives — plusieurs de ces cordes sont exposées dans le hall d'accueil.\n\nContrairement aux temples payants de Higashiyama, l'entrée ici est libre et le site nettement moins fréquenté par les groupes de touristes, ce qui permet d'apprécier l'ampleur du bâtiment dans un calme relatif, même en haute saison.",
  },
  {
    id: "pontocho", villeId: "kyoto", nom: "Ruelle de Pontocho", nom_jp: "先斗町", type: "manger",
    categorie: "Ruelle gastronomique", emoji: "🏮", interets: ["gastro", "lifestyle"], quartier: "Pontocho",
    description: "Ruelle pavée et lanternée le long de la rivière Kamo, bordée de restaurants traditionnels allant du yakitori abordable au kaiseki raffiné.",
    conseil: "En été, cherche les terrasses \"kawadoko\" suspendues au-dessus de la rivière — réservation conseillée, très demandées.",
    duree: "1-2h", budget: "¥¥", lat: 35.0069, lng: 135.7706, saison_ideale: "été",
    horaires: "Restaurants généralement 17h00–23h00", acces: "Station Kawaramachi (Hankyu) ou Gion-Shijo (Keihan), 3 min à pied",
    prix_detail: "Variable selon l'établissement", site_web: "",
    a_proximite: ["gion", "kamogawa"], image: "/images/lieux-photos/pontocho.jpg",
    editorial: "Pontocho est une des cinq zones de geiko (le nom que prennent les geishas à Kyoto) et de maiko de la ville, et ça se sent : la ruelle, à peine large de deux mètres, s'étire sur presque un kilomètre entre lanternes rouges et façades en bois noirci, parallèle à la rivière Kamo mais invisible depuis les grandes avenues qui l'encadrent.\n\nLa diversité des adresses surprend pour un espace aussi étroit — izakayas bruyants et abordables côtoient des maisons de kaiseki où l'on ne sert que sur réservation, parfois sans même de carte visible depuis la rue. Une règle tacite veut qu'on ne s'attarde pas à photographier les façades sans enseigne : ce sont souvent des ochaya, maisons de thé privées, où l'anonymat fait partie du service.\n\nDe mai à septembre, les restaurants côté rivière installent des terrasses sur pilotis au-dessus de l'eau, les kawadoko — une tradition qui remonte à l'époque Edo pour échapper à la chaleur de Kyoto. Les meilleures tables partent des semaines à l'avance.",
  },
  {
    id: "kyoto-imperial-palace", villeId: "kyoto", nom: "Parc du Palais impérial de Kyoto", nom_jp: "京都御苑", type: "voir",
    categorie: "Parc / Palais", emoji: "🏯", interets: ["culture", "nature"], quartier: "Kamigyo",
    description: "Vaste parc public entourant l'ancien palais impérial, résidence des empereurs jusqu'au transfert de la capitale à Tokyo en 1869.",
    conseil: "Le parc se visite librement en continu — c'est le Sento Gosho (résidence retraitée) juste à côté qui demande une réservation.",
    duree: "1-2h", budget: "Gratuit", lat: 35.0254, lng: 135.7622, saison_ideale: "printemps",
    horaires: "Parc : 24h/24, Palais : 9h00–17h00", acces: "Station Marutamachi (Karasuma Line) ou Imadegawa, 5 min à pied",
    prix_detail: "Gratuit", site_web: "sankan.kunaicho.go.jp",
    a_proximite: [], image: "/images/lieux-photos/kyoto-imperial-palace.jpg",
    editorial: "Le vaste parc verdoyant qui entoure le palais impérial de Kyoto occupe l'emplacement de l'ancienne aristocratie de cour, rasée après le déclin des résidences nobles au XIXe siècle pour laisser place à un immense espace public planté de pins et de pruniers. C'est ici que résidait l'empereur du Japon jusqu'en 1869, date à laquelle la cour a déménagé à Tokyo — Kyoto reste, sur le papier, une capitale que l'empereur n'a jamais officiellement quittée.\n\nLe palais lui-même, avec ses bâtiments aux toits de cyprès et sa salle du trône Shishinden, se visite gratuitement sans réservation depuis une réforme récente des règles d'accès (auparavant soumises à autorisation). L'architecture, reconstruite au XIXe siècle dans le style de l'époque Heian, donne un aperçu de ce à quoi ressemblait le pouvoir impérial avant l'ère moderne.\n\nAutour, le parc lui-même vaut le détour indépendamment du palais : allées de graviers, étendues de pelouse rares à Kyoto, et pruniers puis cerisiers qui fleurissent en cascade dès la fin de l'hiver, bien avant la floraison du reste de la ville.",
  },
  {
    id: "yasaka-shrine", villeId: "kyoto", nom: "Sanctuaire Yasaka", nom_jp: "八坂神社", type: "voir",
    categorie: "Sanctuaire", emoji: "⛩️", interets: ["culture"], quartier: "Gion",
    description: "Sanctuaire shinto emblématique à l'entrée de Gion, illuminé de lanternes le soir, hôte du grand festival Gion Matsuri en juillet.",
    conseil: "Passe-y en fin de journée : les lanternes s'allument à la tombée de la nuit et le site se vide des groupes de touristes du jour.",
    duree: "30min", budget: "Gratuit", lat: 35.0037, lng: 135.7786, saison_ideale: "été",
    horaires: "24h/24", acces: "Arrêt de bus Gion, ou 5 min à pied depuis Kiyomizu-dera",
    prix_detail: "Gratuit", site_web: "yasaka-jinja.or.jp",
    a_proximite: ["gion", "kiyomizu-dera"], image: "/images/lieux-photos/yasaka-shrine.jpg",
    editorial: "Yasaka marque la frontière entre Higashiyama et Gion depuis plus de 1350 ans, fondé pour apaiser les épidémies qui frappaient l'ancienne capitale. C'est de ce sanctuaire que part chaque juillet le Gion Matsuri, l'un des trois plus grands festivals du Japon, avec ses chars de bois géants tirés à travers le centre-ville — une tradition ininterrompue depuis le IXe siècle, sauf exceptions historiques majeures.\n\nLe reste de l'année, le sanctuaire fonctionne comme un point de passage naturel entre les temples de Higashiyama et les ruelles de Gion : sa scène principale, entourée de lanternes de pierre et de bois, s'illumine chaque soir à la nuit tombée, offrant une image bien différente de l'affluence diurne. Des rangées de tonneaux de saké, offerts par des brasseries en offrande, bordent l'une des allées latérales.\n\nÀ l'arrière du sanctuaire, un escalier discret mène directement au parc de Maruyama, le plus ancien parc public de Kyoto — un enchaînement que peu de visiteurs pressés empruntent, préférant rebrousser chemin vers Gion.",
  },
  {
    id: "kyoto-manga-museum", villeId: "kyoto", nom: "Musée international du manga de Kyoto", nom_jp: "京都国際マンガミュージアム", type: "faire",
    categorie: "Musée", emoji: "📚", interets: ["anime", "culture"], quartier: "Nakagyō",
    description: "Ancienne école reconvertie en musée du manga, avec près de 300 000 volumes en libre accès sur des étagères longues de 200 mètres.",
    conseil: "Amène de quoi t'installer sur la pelouse extérieure — beaucoup de visiteurs y lisent des heures, allongés au soleil.",
    duree: "2h", budget: "¥", lat: 35.0140, lng: 135.7583, saison_ideale: "",
    horaires: "10h00–18h00 (fermé le mercredi)", acces: "Station Karasuma-Oike (Karasuma/Tozai Line), 2 min à pied",
    prix_detail: "1200¥", site_web: "kyotomm.jp",
    a_proximite: [], image: "/images/lieux-photos/kyoto-manga-museum.jpg",
    editorial: "Installé dans une ancienne école primaire des années 1920, le musée du manga de Kyoto conserve son architecture d'origine — couloirs carrelés, salle de classe, cour de récréation — tout en alignant contre chaque mur près de 300 000 volumes de manga en libre accès, sur environ 200 mètres d'étagères appelées le \"mur des mangas\".\n\nLa collection couvre l'histoire du médium depuis les années 1970 jusqu'aux séries actuelles, très majoritairement en japonais mais avec une section croissante de traductions. Contrairement à un musée classique, l'endroit se vit avant tout comme une immense bibliothèque de lecture libre : on s'installe où l'on veut, dans les anciennes salles de classe, dans les couloirs, ou dehors sur la pelouse quand le temps le permet.\n\nDes expositions temporaires occupent régulièrement une partie du bâtiment, consacrées à un auteur ou un univers particulier, et un atelier permet parfois d'observer des dessinateurs en résidence travailler en direct. Une étape presque incontournable pour qui s'intéresse à la pop-culture japonaise au-delà de Tokyo.",
  },
  {
    id: "kamogawa", villeId: "kyoto", nom: "Rives de la Kamogawa", nom_jp: "鴨川", type: "faire",
    categorie: "Balade urbaine", emoji: "🌊", interets: ["lifestyle", "nature"], quartier: "Centre",
    description: "Rivière traversant Kyoto du nord au sud, dont les berges herbeuses servent de lieu de promenade, de pique-nique et de rendez-vous du soir.",
    conseil: "Observe l'espacement quasi mathématique entre les couples assis sur la berge — une convention tacite kyotoïte que personne ne transgresse.",
    duree: "1h", budget: "Gratuit", lat: 35.0092, lng: 135.7717, saison_ideale: "été",
    horaires: "24h/24", acces: "Stations Sanjo, Shijo ou Gion-Shijo, accès direct",
    prix_detail: "Gratuit", site_web: "",
    a_proximite: ["pontocho", "gion"], image: "/images/lieux-photos/kamogawa.jpg",
    editorial: "La Kamogawa traverse Kyoto du nord au sud sur une quinzaine de kilomètres, mais c'est le tronçon central, entre Sanjo et Shijo, qui concentre la vie de la ville. Dès les beaux jours, ses berges de galets et de pelouse se couvrent d'habitants venus pique-niquer, jouer de la musique, ou simplement s'asseoir face à l'eau à la sortie du travail.\n\nUn détail amuse systématiquement les visiteurs qui prêtent attention aux couples assis en soirée le long de la rive : l'espacement entre chaque groupe reste remarquablement constant, ni trop proche ni trop loin des autres, une convention sociale informelle propre à Kyoto que personne ne semble avoir besoin de négocier.\n\nÀ intervalles réguliers, la rivière est traversée par des pas japonais en forme de tortues ou d'oiseaux, permettant de la franchir à pied sans pont — une manière ludique de rejoindre Pontocho depuis l'autre rive. En amont, vers le nord, les rives se font plus sauvages et longent le Chemin du Philosophe à quelques rues de distance.",
  },
  {
    id: "kodai-ji", villeId: "kyoto", nom: "Kodai-ji", nom_jp: "高台寺", type: "voir",
    categorie: "Temple", emoji: "🎋", interets: ["culture"], quartier: "Higashiyama",
    description: "Temple fondé par la veuve d'un grand seigneur du XVIe siècle en sa mémoire, connu pour ses jardins zen et ses illuminations nocturnes saisonnières.",
    conseil: "Vérifie les dates d'illumination nocturne (printemps et automne) — l'expérience change radicalement du site visité de jour.",
    duree: "1h", budget: "¥", lat: 35.0011, lng: 135.7822, saison_ideale: "automne",
    horaires: "9h00–17h30 (illuminations jusqu'à 22h en saison)", acces: "5 min à pied depuis Yasaka Shrine",
    prix_detail: "600¥", site_web: "kodaiji.com",
    a_proximite: ["yasaka-shrine", "kiyomizu-dera"], image: "/images/lieux-photos/kodai-ji.jpg",
    editorial: "Kodai-ji fut fondé en 1606 par Nene, veuve du seigneur Toyotomi Hideyoshi — l'un des trois grands unificateurs du Japon féodal —, pour prier pour son âme après sa mort. Ce lien intime avec un couple historique majeur se retrouve dans le raffinement du site, financé à l'époque par le shogunat Tokugawa lui-même malgré sa rivalité avec le clan Toyotomi.\n\nLe jardin sec, attribué à Kobayakawa Enshu, orchestre rochers et gravier ratissé autour de deux étangs reliés par une passerelle couverte, le Kangetsudai, conçue à l'origine pour contempler le reflet de la lune. Un bosquet de bambous, moins connu que celui d'Arashiyama mais tout aussi dense, borde l'un des sentiers du temple.\n\nAu printemps et en automne, Kodai-ji prolonge ses horaires pour des illuminations nocturnes où les érables ou les cerisiers sont mis en lumière et projetés sur l'eau des étangs — une mise en scène spectaculaire qui attire les Kyotoïtes eux-mêmes, pas seulement les touristes.",
  },
  {
    id: "kyoto-ramen-koji", villeId: "kyoto", nom: "Kyoto Ramen Koji", nom_jp: "京都拉麺小路", type: "manger",
    categorie: "Food court", emoji: "🍜", interets: ["gastro"], quartier: "Kyoto Station",
    description: "Étage entier de la gare de Kyoto réunissant une dizaine d'échoppes de ramen venues de tout le Japon, pour comparer les styles régionaux en une soirée.",
    conseil: "Distributeurs de tickets à l'entrée de chaque échoppe (souvent en japonais seul) — pointe le plat sur la photo si besoin, personne ne s'en formalise.",
    duree: "1h", budget: "¥", lat: 34.9858, lng: 135.7588, saison_ideale: "",
    horaires: "11h00–22h00", acces: "10e étage de la gare de Kyoto, accès direct",
    prix_detail: "800-1200¥ le bol", site_web: "",
    a_proximite: ["higashi-honganji"], image: "/images/lieux-photos/kyoto-ramen-koji.jpg",
    editorial: "Au dixième étage de la gare de Kyoto, un couloir discret réunit une dizaine d'échoppes de ramen sélectionnées parmi les meilleures adresses régionales du Japon — de Sapporo à Hakata en passant par Kyoto elle-même —, chacune ne servant généralement qu'un seul style de bouillon, perfectionné sur des décennies.\n\nLe principe est simple et redoutablement efficace pour les voyageurs pressés : plutôt que de chercher LA meilleure adresse de ramen dans une ville qu'on ne connaît pas, on peut comparer en une soirée un tonkotsu crémeux de Kyushu, un miso épais de Hokkaido et un shoyu plus clair typique du Kansai, sans quitter la gare.\n\nLes files d'attente se forment surtout aux heures de repas devant les échoppes les plus réputées — un tableau d'affichage à l'entrée du couloir indique généralement le temps d'attente de chacune. Les distributeurs à tickets, souvent uniquement en japonais, restent le seul obstacle : la plupart affichent des photos suffisamment claires pour commander sans un mot de japonais.",
  },
  {
    id: "kurama-kibune", villeId: "kyoto", nom: "Kurama et Kibune", nom_jp: "鞍馬・貴船", type: "faire",
    categorie: "Randonnée & village de montagne", emoji: "🏔️", interets: ["nature", "culture"], quartier: "Kurama",
    description: "Excursion d'une demi-journée au nord de Kyoto : randonnée entre le temple de montagne Kurama-dera et le village fluvial de Kibune, réputé pour ses restaurants sur pilotis.",
    conseil: "Prends le train jusqu'à Kurama, marche jusqu'à Kibune (2h environ), puis redescends en train depuis Kibuneguchi — sens unique, plus agréable que l'aller-retour.",
    duree: "Demi-journée", budget: "¥¥", lat: 35.1136, lng: 135.7717, saison_ideale: "été",
    horaires: "Temple : 9h00–16h15", acces: "Ligne Eizan depuis Demachiyanagi (30 min)",
    prix_detail: "300¥ (don d'entrée Kurama-dera)", site_web: "",
    a_proximite: [], image: "/images/lieux-photos/kurama-kibune.jpg",
    editorial: "À une trentaine de minutes en train du centre de Kyoto, Kurama et Kibune offrent une bouffée de montagne que peu de voyageurs prennent le temps d'explorer. Le sentier qui relie les deux villages traverse la forêt sacrée où, selon la légende, le guerrier légendaire Minamoto no Yoshitsune aurait été entraîné aux arts martiaux par un roi-démon des Tengu.\n\nKurama-dera, temple perché à flanc de montagne, se rejoint par un chemin pentu bordé de cèdres centenaires ; certains visiteurs préfèrent le téléphérique qui évite la première moitié de la montée. De l'autre côté de la crête, la descente vers Kibune traverse une forêt plus dense avant de déboucher sur un village construit littéralement sur la rivière.\n\nEn été, Kibune est surtout connu pour ses restaurants kawadoko, terrasses suspendues directement au-dessus du cours d'eau, où l'on mange dans la fraîcheur du courant — une échappatoire recherchée par les Kyotoïtes eux-mêmes quand la chaleur devient étouffante en ville. Compter environ deux heures de marche entre les deux villages, sentier de montagne modéré.",
  },

  // ═══════════════════════ OSAKA ═══════════════════════
  {
    id: "usj", villeId: "osaka", nom: "Universal Studios Japan", nom_jp: "ユニバーサル・スタジオ・ジャパン", type: "faire",
    categorie: "Parc à thème", emoji: "🎢", interets: ["anime", "lifestyle"], quartier: "Konohana",
    description: "Parc à thème avec le Super Nintendo World grandeur nature et une zone Harry Potter parmi les plus abouties au monde.",
    conseil: "Achète l'Express Pass à l'avance en ligne — les files pour Nintendo World dépassent facilement 2h sans lui, surtout le week-end.",
    duree: "Journée complète", budget: "¥¥¥", lat: 34.6654, lng: 135.4323, saison_ideale: "",
    horaires: "9h00–19h00 (variable selon saison)", acces: "Station Universal City (JR Yumesaki Line depuis Nishikujo)",
    prix_detail: "Env. 8600¥ le billet 1 jour", site_web: "usj.co.jp",
    a_proximite: [], image: "/images/lieux-photos/usj.jpg",
    editorial: "Universal Studios Japan s'est imposé ces dernières années comme l'un des parcs à thème les plus courus d'Asie, porté surtout par le Super Nintendo World ouvert en 2021 : un monde grandeur nature où l'on frappe de vrais blocs \"?\" en levant le poing, grâce à un bracelet connecté qui compte les pièces virtuelles récoltées à travers la zone entière.\n\nLe Mont Chocho, cœur de la zone, dissimule les montagnes russes Mario Kart et Yoshi's Adventure, tandis que le château Bowser sert de décor à des animations régulières. Ailleurs dans le parc, le Wizarding World of Harry Potter reconstitue Poudlard et le village de Pré-au-Lard avec un souci du détail qui rivalise avec les parcs américains.\n\nLa gestion des files d'attente est le vrai enjeu d'une visite ici : les zones les plus populaires demandent souvent un \"timed entry\" (créneau réservé) en plus du billet, distribué via l'appli officielle dès l'ouverture — les places pour Nintendo World partent en quelques minutes les jours de forte affluence. Réserver l'Express Pass à l'avance, ou viser un jour de semaine hors vacances scolaires, change radicalement l'expérience.",
  },
  {
    id: "umeda-sky-building", villeId: "osaka", nom: "Umeda Sky Building", nom_jp: "梅田スカイビル", type: "voir",
    categorie: "Observatoire", emoji: "🏙️", interets: ["lifestyle"], quartier: "Umeda",
    description: "Deux tours reliées par un observatoire circulaire suspendu à 173 mètres de haut, avec vue à 360° sur Osaka et ses environs.",
    conseil: "Vas-y au coucher du soleil — tu profites de la vue de jour puis de la ville illuminée, sans repayer l'entrée.",
    duree: "1h", budget: "¥¥", lat: 34.7054, lng: 135.4900, saison_ideale: "",
    horaires: "9h30–22h30", acces: "Station Osaka/Umeda, 7 min à pied",
    prix_detail: "1500¥", site_web: "kuchu-teien.com",
    a_proximite: [], image: "/images/lieux-photos/umeda-sky-building.jpg",
    editorial: "L'Umeda Sky Building tranche radicalement avec le reste du skyline d'Osaka : deux tours jumelles de 40 étages, reliées à leur sommet par un observatoire circulaire suspendu dans le vide, sans aucun pilier visible pour le soutenir — un exploit architectural achevé en 1993 qui figure depuis dans plusieurs classements des constructions les plus originales au monde.\n\nL'accès au sommet se fait par des escalators transparents traversant le vide entre les deux tours, une expérience à elle seule pour qui n'aime pas trop le vertige. Une fois en haut, la plateforme à ciel ouvert (Kuchu Teien, \"jardin flottant\") offre une vue à 360° sur Osaka, jusqu'au mont Rokko par temps clair côté Kobe.\n\nAu sous-sol du bâtiment, le Takimi Koji reconstitue une rue commerçante des années 1920, avec ses échoppes de nourriture populaire et son ambiance rétro délibérément kitsch — un contraste amusant avec l'architecture ultra-moderne des tours au-dessus. Beaucoup de visiteurs enchaînent la vue du soir directement avec un dîner dans cette rue reconstituée.",
  },
  {
    id: "kaiyukan", villeId: "osaka", nom: "Aquarium Kaiyukan", nom_jp: "海遊館", type: "faire",
    categorie: "Aquarium", emoji: "🐋", interets: ["lifestyle"], quartier: "Tempozan",
    description: "L'un des plus grands aquariums du monde, organisé autour d'un immense bassin central reproduisant l'écosystème du Pacifique, avec requins-baleines.",
    conseil: "La visite descend en spirale du sommet vers le bassin profond — prends l'escalator jusqu'en haut sans t'arrêter, puis redescends tranquillement.",
    duree: "2h", budget: "¥¥", lat: 34.6547, lng: 135.4290, saison_ideale: "",
    horaires: "10h00–20h00 (variable)", acces: "Station Osakako (Chuo Line), 5 min à pied",
    prix_detail: "2400¥", site_web: "kaiyukan.com",
    a_proximite: [], image: "/images/lieux-photos/kaiyukan.jpg",
    editorial: "Le Kaiyukan a longtemps revendiqué le titre d'aquarium le plus grand du monde, une place qu'il a cédée depuis à des concurrents plus récents mais sans rien perdre de son ambition architecturale : l'ensemble s'organise autour d'un bassin central de 9 mètres de profondeur, le \"Pacifique\", où nagent librement des requins-baleines parmi les plus gros poissons visibles en captivité.\n\nLe parcours de visite est pensé comme une descente : on prend d'abord l'ascenseur jusqu'au sommet du bâtiment, puis on redescend en spirale à travers quatorze bassins thématiques représentant différentes régions du pourtour Pacifique — de la forêt de kelp californienne aux récifs de l'archipel japonais — en longeant à chaque étage une portion différente du bassin central.\n\nLes loutres de mer et les manchots, installés dans des bassins à hauteur d'yeux près de la sortie, comptent parmi les attractions les plus photographiées, tout comme les méduses lunaires baignées de lumière bleutée dans une salle à part entièrement dédiée. Compter environ deux heures pour une visite complète sans se presser.",
  },
  {
    id: "den-den-town", villeId: "osaka", nom: "Den Den Town", nom_jp: "日本橋（でんでんタウン）", type: "acheter",
    categorie: "Quartier otaku", emoji: "🎮", interets: ["anime", "lifestyle"], quartier: "Nipponbashi",
    description: "Équivalent osakan d'Akihabara : rue dense en boutiques de manga, figurines, jeux vidéo rétro et électronique, plus détendue et moins touristique.",
    conseil: "Moins bondé qu'Akihabara à Tokyo — bon plan pour du matériel d'occasion à prix plus doux, surtout en jeux vidéo rétro.",
    duree: "1-2h", budget: "¥¥", lat: 34.6626, lng: 135.5062, saison_ideale: "",
    horaires: "Boutiques généralement 11h00–20h00", acces: "Station Nippombashi (Sennichimae/Sakaisuji Line), sortie 5",
    prix_detail: "Variable", site_web: "",
    a_proximite: ["kuromon", "shinsaibashi"], image: "/images/lieux-photos/den-den-town.jpg",
    editorial: "Den Den Town est à Osaka ce qu'Akihabara est à Tokyo, mais en version plus compacte et nettement moins saturée de touristes — un avantage réel pour qui veut fouiller tranquillement dans des bacs de figurines d'occasion ou de cartes à collectionner sans jouer des coudes.\n\nLe quartier s'est développé à l'origine autour de l'électronique dans l'après-guerre, avant de basculer progressivement vers le manga, l'anime et les jeux vidéo à partir des années 1990, suivant la même trajectoire qu'Akihabara à quelques décennies d'écart. Les boutiques de jeux rétro y sont particulièrement réputées, certaines conservant des consoles et cartouches introuvables ailleurs au Japon.\n\nContrairement à Akihabara, Den Den Town reste avant tout un quartier de résidents et de collectionneurs locaux plus que de spectacle touristique — pas de maid cafés à touts les coins de rue, moins de néons agressifs, une ambiance globalement plus posée. Un bon complément à Osaka pour les amateurs de pop-culture qui ont déjà fait Akihabara à Tokyo et cherchent une variation moins écrasante.",
  },
  {
    id: "namba-yasaka", villeId: "osaka", nom: "Sanctuaire Namba Yasaka", nom_jp: "難波八阪神社", type: "voir",
    categorie: "Sanctuaire", emoji: "🦁", interets: ["culture"], quartier: "Namba",
    description: "Petit sanctuaire connu pour son immense scène en forme de tête de lion géante, sensée avaler les mauvais esprits.",
    conseil: "Passage rapide (15-20 min) à combiner avec Dotonbori et Shinsaibashi tout proches — ne mérite pas un détour dédié seul.",
    duree: "30min", budget: "Gratuit", lat: 34.6614, lng: 135.4998, saison_ideale: "",
    horaires: "24h/24 (bureau du sanctuaire 9h-17h)", acces: "Station Namba, 10 min à pied",
    prix_detail: "Gratuit", site_web: "",
    a_proximite: ["dotonbori", "shinsaibashi"], image: "/images/lieux-photos/namba-yasaka.jpg",
    editorial: "Ce sanctuaire discret, coincé entre des immeubles résidentiels à quelques rues de l'agitation de Namba, doit toute sa notoriété à un seul élément : une scène de performance géante sculptée en forme de tête de lion, gueule grande ouverte, haute de plus de douze mètres. Selon la croyance locale, cette gueule \"avale\" le mauvais sort et les esprits malveillants qui s'approchent du sanctuaire.\n\nLa structure, reconstruite dans les années 1970 après la destruction du sanctuaire d'origine pendant la Seconde Guerre mondiale, sert encore de scène pour des performances rituelles lors des festivals annuels, notamment autour du Nouvel An où la foule se presse pour la première prière de l'année (hatsumode).\n\nLe reste du sanctuaire — modeste, entouré d'immeubles — ne retient l'attention que quelques minutes, mais le contraste entre cette architecture spectaculaire et l'environnement urbain banal qui l'entoure en fait une curiosité facile à intercaler dans une journée à Namba, à dix minutes à pied de Dotonbori.",
  },
  {
    id: "tsutenkaku", villeId: "osaka", nom: "Tour Tsutenkaku", nom_jp: "通天閣", type: "voir",
    categorie: "Tour panoramique", emoji: "🗼", interets: ["lifestyle", "culture"], quartier: "Shinsekai",
    description: "Tour emblématique du quartier rétro de Shinsekai, dont la statue dorée de Billiken au sommet est réputée porter chance si on lui frotte les pieds.",
    conseil: "Combine avec une virée okonomiyaki/kushikatsu à Shinsekai juste en dessous — la tour seule ne justifie pas le déplacement.",
    duree: "1h", budget: "¥¥", lat: 34.6523, lng: 135.5062, saison_ideale: "",
    horaires: "9h00–21h00 (dernière entrée 20h30)", acces: "Station Ebisucho, 5 min à pied",
    prix_detail: "1000¥ environ", site_web: "tsutenkaku.co.jp",
    a_proximite: ["shinsekai"], image: "/images/lieux-photos/tsutenkaku.jpg",
    editorial: "La tour Tsutenkaku actuelle, reconstruite en 1956 après que sa première version des années 1910 a été démolie pour récupérer le métal pendant la guerre, reste le symbole indéboulonnable de Shinsekai — un quartier qui a volontairement cultivé, jusqu'à aujourd'hui, l'esthétique rétro et un peu bringuebalante d'un Osaka populaire des années 1950.\n\nAu sommet, une statue dorée de Billiken — une figurine porte-bonheur d'origine américaine du début du XXe siècle, largement oubliée ailleurs dans le monde mais devenue une mascotte locale — attend les visiteurs qui lui frottent la plante des pieds pour s'attirer la chance, une tradition qui s'est maintenue sans discontinuer depuis près d'un siècle.\n\nDe la plateforme d'observation, la vue embrasse tout Shinsekai en contrebas, avec ses enseignes criardes et ses restaurants de kushikatsu (brochettes panées), jusqu'aux gratte-ciels plus modernes d'Abeno Harukas à l'horizon — un contraste saisissant entre l'Osaka rétro et l'Osaka contemporaine visibles depuis le même point.",
  },
  {
    id: "abeno-harukas", villeId: "osaka", nom: "Abeno Harukas", nom_jp: "あべのハルカス", type: "voir",
    categorie: "Observatoire", emoji: "🏙️", interets: ["lifestyle"], quartier: "Abeno",
    description: "Plus haute tour du Japon (300m), avec un observatoire à ciel ouvert au 60e étage offrant une vue dégagée sur tout le Kansai.",
    conseil: "Par temps très clair, on distingue le mont Fuji à l'horizon depuis le pont extérieur du 60e étage — vérifie la météo avant d'y monter.",
    duree: "1-2h", budget: "¥¥", lat: 34.6459, lng: 135.5133, saison_ideale: "",
    horaires: "9h00–22h00", acces: "Station Tennoji, accès direct depuis la gare",
    prix_detail: "2000¥ environ", site_web: "abenoharukas-300.jp",
    a_proximite: [], image: "/images/lieux-photos/abeno-harukas.jpg",
    editorial: "Abeno Harukas a détrôné la Tokyo Skytree du titre de plus haute tour du Japon lors de son ouverture en 2014, culminant à 300 mètres — un chiffre pensé pour être symbolique, exactement le double de la tour Tsutenkaku voisine construite soixante ans plus tôt. Le bâtiment abrite en réalité un grand magasin, des bureaux et un hôtel sur ses premiers étages, l'observatoire n'occupant que le sommet.\n\nL'accès au \"Harukas 300\" se fait par trois escalators consécutifs qui traversent un puits de lumière vertigineux avant d'atteindre le 58e étage, puis un dernier ascenseur jusqu'au 60e. Contrairement à la plupart des tours d'observation japonaises entièrement vitrées, une section du 60e étage s'ouvre à l'air libre sur une passerelle extérieure, une sensation rare pour une tour de cette hauteur.\n\nLa vue couvre l'ensemble de la plaine d'Osaka jusqu'aux montagnes qui l'encadrent, et par temps exceptionnellement dégagé — surtout en hiver — le mont Fuji devient visible à l'horizon malgré la distance de plus de 150 kilomètres qui sépare Osaka de la montagne.",
  },
  {
    id: "tenjinbashisuji", villeId: "osaka", nom: "Rue commerçante Tenjinbashisuji", nom_jp: "天神橋筋商店街", type: "acheter",
    categorie: "Rue commerçante", emoji: "🛍️", interets: ["lifestyle", "gastro"], quartier: "Kita",
    description: "Rue commerçante couverte la plus longue du Japon (2,6 km), mélange de petites échoppes traditionnelles et de commerces du quotidien.",
    conseil: "Descends-la progressivement du nord au sud plutôt que d'essayer de la parcourir en entier — elle change nettement de caractère section par section.",
    duree: "1-2h", budget: "¥", lat: 34.7024, lng: 135.5153, saison_ideale: "",
    horaires: "Variable selon boutiques, généralement 10h00–20h00", acces: "Station Minami-Morimachi ou Ogimachi, accès direct",
    prix_detail: "Variable", site_web: "",
    a_proximite: ["osaka-tenmangu"], image: "/images/lieux-photos/tenjinbashisuji.jpg",
    editorial: "Avec 2,6 kilomètres de galerie couverte ininterrompue, Tenjinbashisuji détient le titre de plus longue rue commerçante du Japon — une distance qui prend une bonne heure à parcourir d'un bout à l'autre sans s'arrêter, ce que presque personne ne fait réellement tant la rue invite à ralentir tous les cinquante mètres.\n\nContrairement aux artères touristiques de Namba ou Umeda, Tenjinbashisuji reste avant tout une rue de quartier, fréquentée par les habitants pour leurs courses quotidiennes : poissonneries, boutiques de tofu artisanal, merceries tenues par la même famille depuis des générations, aux côtés de restaurants bon marché et de quelques boutiques plus modernes vers ses extrémités.\n\nLa rue tire son nom du sanctuaire Osaka Tenmangu, qu'elle longe à son extrémité nord et dont elle constituait historiquement l'allée d'accès marchande — un schéma classique au Japon où les rues commerçantes se sont développées le long des chemins menant aux grands sanctuaires. Le Musée d'histoire de la vie quotidienne d'Osaka, à proximité, prolonge bien la visite pour qui veut resituer ce type de commerce dans son contexte historique.",
  },
  {
    id: "osaka-tenmangu", villeId: "osaka", nom: "Sanctuaire Osaka Tenmangu", nom_jp: "大阪天満宮", type: "voir",
    categorie: "Sanctuaire", emoji: "⛩️", interets: ["culture"], quartier: "Kita",
    description: "Sanctuaire dédié à Sugawara no Michizane, divinité des études, où les élèves viennent prier avant les examens ; hôte du grand festival Tenjin Matsuri.",
    conseil: "Si tu passes en juillet, vérifie les dates du Tenjin Matsuri (24-25) — l'un des trois plus grands festivals du Japon, avec bateaux illuminés sur la rivière.",
    duree: "30min", budget: "Gratuit", lat: 34.6996, lng: 135.5147, saison_ideale: "",
    horaires: "9h00–17h00", acces: "Station Minami-Morimachi ou Ogimachi, 3 min à pied",
    prix_detail: "Gratuit", site_web: "tenjinsan.com",
    a_proximite: ["tenjinbashisuji"], image: "/images/lieux-photos/osaka-tenmangu.jpg",
    editorial: "Fondé au Xe siècle en l'honneur de Sugawara no Michizane, lettré et homme d'État déifié après sa mort comme divinité des études et de la caligraphie, Osaka Tenmangu attire toute l'année des lycéens venus acheter une amulette avant un examen important — une pratique aussi répandue au Japon que discrète pour un visiteur étranger qui n'y prêterait pas attention.\n\nLe sanctuaire connaît son heure de gloire chaque 24 et 25 juillet avec le Tenjin Matsuri, l'un des trois plus grands festivals du pays aux côtés du Gion Matsuri de Kyoto et du Kanda Matsuri de Tokyo. La procession, vieille de plus de mille ans, culmine par une flottille de bateaux illuminés descendant la rivière Okawa à la tombée de la nuit, accompagnée d'un feu d'artifice.\n\nLe reste de l'année, le sanctuaire reste un point de passage tranquille en tête de la rue commerçante Tenjinbashisuji, dont il constitue historiquement l'origine — les marchands s'étant installés le long du chemin menant aux pèlerins venus prier ici.",
  },

  // ═══════════════════════ NARA ═══════════════════════
  {
    id: "kofuku-ji", villeId: "nara", nom: "Kofuku-ji", nom_jp: "興福寺", type: "voir",
    categorie: "Temple", emoji: "🏯", interets: ["culture"], quartier: "Centre",
    description: "Temple fondé au VIIe siècle, dont la pagode à cinq étages est devenue le symbole visuel de Nara, visible depuis presque tout le parc.",
    conseil: "Le musée du trésor (Kokuhokan) abrite la fameuse statue d'Ashura à trois visages — l'une des sculptures bouddhiques les plus célèbres du Japon.",
    duree: "1h", budget: "¥", lat: 34.6851, lng: 135.8300, saison_ideale: "",
    horaires: "9h00–17h00", acces: "Station Kintetsu-Nara, 5 min à pied",
    prix_detail: "500¥ (Kokuhokan), pagode extérieure gratuite", site_web: "kohfukuji.com",
    a_proximite: ["nara-park"], image: "/images/lieux-photos/kofuku-ji.jpg",
    editorial: "La pagode à cinq étages de Kofuku-ji, reconstruite au XV siècle après plusieurs incendies, s'est imposée avec le temps comme l'image la plus reproduite de Nara — sa silhouette élancée surgissant au-dessus des arbres du parc, visible depuis une grande partie de la ville. Le temple lui-même remonte au VIIe siècle, fondé par le puissant clan Fujiwara qui domina la cour impériale pendant des siècles.\n\nÀ son apogée, Kofuku-ji comptait plus de 150 bâtiments répartis sur un vaste domaine ; les guerres, incendies et la politique de séparation du bouddhisme et du shintoïsme de l'ère Meiji en ont réduit le nombre, mais les pièces conservées au musée du trésor (Kokuhokan) comptent parmi les plus importantes du Japon bouddhique.\n\nLa statue d'Ashura, sculptée en laque sèche au VIIIe siècle, en est la pièce maîtresse : une divinité guerrière à trois visages et six bras, au regard étrangement mélancolique pour une figure censée incarner la colère, qui attire à elle seule une part importante des visiteurs du musée.",
  },
  {
    id: "isuien", villeId: "nara", nom: "Jardin Isuien", nom_jp: "依水園", type: "voir",
    categorie: "Jardin", emoji: "🌸", interets: ["culture", "nature"], quartier: "Centre",
    description: "Jardin japonais en deux parties datant des époques Edo et Meiji, utilisant la pagode voisine de Todai-ji comme arrière-plan emprunté (shakkei).",
    conseil: "Le café Sanshuen à l'intérieur du jardin sert un déjeuner simple avec vue directe sur l'étang — bon moment pour souffler après Todai-ji.",
    duree: "1h", budget: "¥", lat: 34.6900, lng: 135.8377, saison_ideale: "automne",
    horaires: "9h30–16h30 (fermé mardi)", acces: "5 min à pied depuis Todai-ji", prix_detail: "1200¥",
    site_web: "", a_proximite: ["todai-ji", "nara-national-museum"], image: "/images/lieux-photos/isuien.jpg",
    editorial: "Isuien se compose de deux jardins distincts, construits à deux siècles d'intervalle et reliés par un même point de vue : la partie ancienne, aménagée à l'époque Edo autour d'un étang, et la partie moderne ajoutée à l'ère Meiji par un riche marchand de moustiquaires devenu mécène des arts.\n\nCe qui distingue Isuien des autres jardins de la région tient à son usage du shakkei, la technique du \"paysage emprunté\" : la porte du Nandaimon de Todai-ji et les collines de Wakakusa, visibles au loin, sont intégrées à la composition du jardin comme si elles en faisaient partie, brouillant la limite entre l'espace clos et le paysage environnant.\n\nÀ l'entrée, le musée Neiraku voisin (inclus dans le même billet) présente une petite collection d'art chinois et coréen ancien, moins connue que les grands sites de Nara mais souvent quasi déserte, contrastant avec l'affluence du parc aux daims à quelques minutes de marche.",
  },
  {
    id: "naramachi", villeId: "nara", nom: "Naramachi", nom_jp: "ならまち", type: "faire",
    categorie: "Quartier historique", emoji: "🏮", interets: ["culture", "lifestyle"], quartier: "Naramachi",
    description: "Ancien quartier marchand aux maisons de bois traditionnelles (machiya), aujourd'hui rempli de cafés, boutiques d'artisanat et petits musées.",
    conseil: "Cherche les poupées rouges suspendues (migawari-zaru) aux avant-toits — un porte-bonheur protecteur propre au quartier, chaque maison en a au moins une.",
    duree: "1-2h", budget: "¥", lat: 34.6779, lng: 135.8280, saison_ideale: "", horaires: "Libre accès, boutiques 10h-18h",
    acces: "15 min à pied depuis la gare JR Nara", prix_detail: "Gratuit (accès au quartier)", site_web: "",
    a_proximite: ["kofuku-ji"], image: "/images/lieux-photos/naramachi.jpg",
    editorial: "Naramachi occupe l'emplacement de l'ancien quartier marchand de Gango-ji, l'un des plus anciens temples du Japon dont le domaine s'est progressivement urbanisé à partir de l'époque Edo. Le résultat est un labyrinthe de ruelles étroites bordées de machiya — maisons de marchands en bois, façade étroite et profondeur importante, typiques de l'architecture urbaine japonaise ancienne.\n\nContrairement aux grands sites touristiques de Nara concentrés autour du parc aux daims, Naramachi se découvre en flânant sans itinéraire précis : ateliers de teinture indigo, boutiques de thé, cafés installés dans d'anciennes résidences, et quelques petits musées gratuits consacrés à l'artisanat local ou à l'histoire du quartier.\n\nUn détail distingue immédiatement les maisons du quartier : de petites poupées rouges en tissu, les migawari-zaru, suspendues sous les avant-toits. Selon la croyance locale, elles absorbent le malheur à la place des habitants — une tradition encore largement respectée qui donne au quartier une identité visuelle immédiatement reconnaissable.",
  },
  {
    id: "wakakusa-yama", villeId: "nara", nom: "Mont Wakakusa", nom_jp: "若草山", type: "faire",
    categorie: "Randonnée", emoji: "⛰️", interets: ["nature"], quartier: "Est",
    description: "Colline herbeuse dominant Nara, accessible en 30-40 min de marche, offrant une vue d'ensemble sur le parc aux daims et la ville.",
    conseil: "Ouverte seulement de mi-mars à début décembre — vérifie le calendrier avant de t'y rendre, elle ferme en dehors de cette période.",
    duree: "1-2h", budget: "¥", lat: 34.6875, lng: 135.8497, saison_ideale: "automne",
    horaires: "9h00–17h00 (mi-mars à début déc. uniquement)", acces: "20 min à pied depuis Todai-ji",
    prix_detail: "150¥", site_web: "", a_proximite: ["todai-ji", "kasuga"], image: "/images/lieux-photos/wakakusa-yama.jpg",
    editorial: "Le mont Wakakusa doit sa forme si particulière — une colline entièrement dénudée d'arbres, tapissée d'herbe rase du sommet à la base — à une tradition de brûlis annuel dont l'origine reste débattue : dispute de frontière entre temples voisins selon une légende, ou simple pratique agricole de gestion des broussailles selon une autre. Chaque année fin janvier, le \"Yamayaki\" embrase symboliquement toute la colline en une cérémonie spectaculaire visible de loin.\n\nLa montée elle-même, en trois paliers successifs sur environ 30 à 40 minutes, reste accessible sans équipement particulier et récompense l'effort par une vue dégagée sur l'ensemble du parc de Nara, la pagode de Kofuku-ji et, par temps clair, jusqu'aux montagnes qui encadrent la plaine.\n\nDes daims sauvages, moins habitués aux visiteurs que ceux du parc en contrebas, broutent régulièrement sur les pentes — une rencontre plus paisible que la cohue des nourrissages de crackers en bas. La colline ferme en dehors de la saison touristique principale (mi-mars à début décembre environ), une contrainte à vérifier avant de prévoir la visite.",
  },
  {
    id: "nara-national-museum", villeId: "nara", nom: "Musée national de Nara", nom_jp: "奈良国立博物館", type: "faire",
    categorie: "Musée", emoji: "🖼️", interets: ["culture"], quartier: "Centre",
    description: "Musée consacré à l'art bouddhique japonais, avec une riche collection de statues, peintures et objets rituels du VIIe au XIVe siècle.",
    conseil: "Va-y début octobre si tu peux : l'exposition annuelle Shoso-in présente des trésors impériaux du VIIIe siècle normalement gardés hors de vue toute l'année.",
    duree: "1-2h", budget: "¥", lat: 34.6837, lng: 135.8383, saison_ideale: "",
    horaires: "9h30–17h00 (fermé lundi)", acces: "5 min à pied depuis le parc de Nara",
    prix_detail: "700¥", site_web: "narahaku.go.jp", a_proximite: ["nara-park", "isuien"], image: "/images/lieux-photos/nara-national-museum.jpg",
    editorial: "Fondé en 1889 alors que le Japon, en pleine modernisation Meiji, cherchait à cataloguer et préserver son patrimoine bouddhique menacé par des décennies de politiques anti-religieuses, le Musée national de Nara concentre aujourd'hui l'une des plus importantes collections d'art bouddhique du pays — statues, mandalas peints, objets rituels du VIIe au XIVe siècle.\n\nLa galerie souterraine, ajoutée dans les années 1990, présente en continu des dizaines de statues de Bouddha et de divinités protectrices dans une mise en scène volontairement sobre, laissant la sculpture parler d'elle-même sans surcharge explicative — une approche qui contraste avec la densité habituelle des musées occidentaux.\n\nChaque année, généralement fin octobre-début novembre, le musée organise l'exposition Shoso-in, qui présente une sélection tournante des trésors impériaux du VIIIe siècle normalement conservés dans l'entrepôt du même nom à Todai-ji, inaccessible au public le reste de l'année. Cette fenêtre annuelle attire des foules considérables de connaisseurs venus de tout le Japon.",
  },

  // ═══════════════════════ HIROSHIMA ═══════════════════════
  {
    id: "itsukushima-shrine", villeId: "hiroshima", nom: "Sanctuaire Itsukushima", nom_jp: "厳島神社", type: "voir",
    categorie: "Sanctuaire", emoji: "⛩️", interets: ["culture"], quartier: "Miyajima",
    description: "Sanctuaire shinto bâti sur pilotis au-dessus de la mer, dont le célèbre torii orange semble flotter à marée haute.",
    conseil: "Vérifie les horaires de marée avant d'y aller : à marée basse, tu peux marcher jusqu'au pied du torii ; à marée haute, il flotte — deux expériences très différentes.",
    duree: "1-2h", budget: "¥", lat: 34.2960, lng: 132.3199, saison_ideale: "",
    horaires: "6h30–18h00 (variable selon saison)", acces: "Ferry depuis Miyajimaguchi (10 min), puis 5 min à pied",
    prix_detail: "300¥ (sanctuaire)", site_web: "itsukushimajinja.jp",
    a_proximite: ["miyajima"], image: "/images/lieux-photos/itsukushima-shrine.jpg",
    editorial: "Le torii vermillon d'Itsukushima, planté à même la mer sans fondation enfoncée dans le sol — sa stabilité repose sur son seul poids —, compte parmi les images les plus reconnaissables du Japon à l'international, classé au patrimoine mondial de l'UNESCO avec l'ensemble du sanctuaire depuis 1996. Sa forme actuelle date de 1875, mais un torii se dresse à cet emplacement depuis le XIIe siècle.\n\nLe sanctuaire lui-même, construit entièrement sur pilotis au-dessus de l'estran, fut conçu de cette manière pour une raison précise : l'île de Miyajima étant considérée elle-même comme sacrée, il était interdit d'y fouler le sol avec les pieds d'un bâtiment religieux profane, d'où cette architecture flottante unique qui semble léviter à marée haute.\n\nLa marée transforme radicalement l'expérience : à marée haute, le torii et le sanctuaire flottent, reflétés dans l'eau ; à marée basse, on peut marcher jusqu'au pied du torii sur le sable exposé et en apprécier l'échelle réelle de près — presque 17 mètres de hauteur. Les deux visites valent le déplacement, pour des raisons opposées.",
  },
  {
    id: "hiroshima-castle", villeId: "hiroshima", nom: "Château de Hiroshima", nom_jp: "広島城", type: "voir",
    categorie: "Château", emoji: "🏯", interets: ["culture"], quartier: "Naka",
    description: "Château reconstruit en béton en 1958 après sa destruction lors du bombardement atomique de 1945, avec un musée du samouraï à l'intérieur.",
    conseil: "Le dernier étage offre une vue sur le parc de la Paix depuis l'autre côté — utile pour visualiser la distance depuis l'épicentre de la bombe.",
    duree: "1h", budget: "¥", lat: 34.4028, lng: 132.4594, saison_ideale: "",
    horaires: "9h00–18h00 (17h nov-mars)", acces: "15 min à pied depuis la gare de Hiroshima",
    prix_detail: "370¥", site_web: "rijo-castle.jp", a_proximite: ["peace-park"], image: "/images/lieux-photos/hiroshima-castle.jpg",
    editorial: "Le château de Hiroshima, surnommé le \"château de la carpe\" (Rijo) en référence à un ancien nom du site, fut construit à la fin du XVIe siècle par le seigneur Mori Terumoto. Sa structure originale, classée trésor national, ne survécut pas au bombardement atomique du 6 août 1945 : situé à seulement 900 mètres de l'épicentre, il s'effondra presque instantanément.\n\nLa reconstruction, achevée en 1958 en béton armé pour reproduire fidèlement l'apparence extérieure d'origine, abrite aujourd'hui un musée consacré à l'histoire samouraï de la région et à l'architecture castrale japonaise, avec des expositions permettant d'essayer une armure ou de manier une réplique de sabre.\n\nLe dernier étage offre un panorama sur le centre-ville reconstruit et, au loin, sur le dôme de Genbaku et le parc du Mémorial de la Paix — une vue qui aide à se représenter concrètement l'échelle de la destruction de 1945 et la vitesse à laquelle la ville s'est reconstruite tout autour.",
  },
  {
    id: "mazda-museum", villeId: "hiroshima", nom: "Musée Mazda", nom_jp: "マツダミュージアム", type: "faire",
    categorie: "Visite d'usine", emoji: "🚗", interets: ["culture", "lifestyle"], quartier: "Fuchu",
    description: "Visite guidée gratuite de l'usine et du musée du constructeur automobile, né à Hiroshima et intimement lié à sa reconstruction d'après-guerre.",
    conseil: "Réservation obligatoire à l'avance en ligne (places limitées) — les visites en anglais/japonais alternent selon les jours, vérifie le créneau.",
    duree: "1-2h", budget: "Gratuit", lat: 34.3703, lng: 132.5188, saison_ideale: "",
    horaires: "Visites sur réservation, généralement 9h et 13h30 en semaine", acces: "Station Mukainada (JR), navette gratuite depuis la gare",
    prix_detail: "Gratuit (réservation obligatoire)", site_web: "mazda.com/museum",
    a_proximite: [], image: "/images/lieux-photos/mazda-museum.jpg",
    editorial: "Mazda est né à Hiroshima en 1920 et n'a jamais quitté la ville, un ancrage local qui a pris une dimension particulière après 1945 : l'entreprise, dont une partie des installations avait été détruite par la bombe atomique, participa activement à la reconstruction industrielle et économique de la région dans les décennies suivantes, devenant l'un des plus gros employeurs de la préfecture.\n\nLa visite guidée gratuite, sur réservation, combine un parcours dans le musée retraçant l'histoire de la marque — moteurs rotatifs Wankel, voitures de course, concepts historiques — avec un passage sur une véritable ligne de production, où l'on peut observer l'assemblage des véhicules en temps réel depuis une passerelle surélevée.\n\nLes places sont limitées et la réservation en ligne, à effectuer plusieurs jours à l'avance, reste indispensable : contrairement à un musée classique, il s'agit d'un site industriel actif dont l'accès est encadré par groupe et par horaire fixe. Une expérience différente du reste de l'offre touristique de Hiroshima, pour qui s'intéresse à l'histoire industrielle autant qu'à la mémoire de la guerre.",
  },
  {
    id: "hondori", villeId: "hiroshima", nom: "Galerie marchande Hondori", nom_jp: "本通り", type: "acheter",
    categorie: "Rue commerçante", emoji: "🛍️", interets: ["lifestyle", "gastro"], quartier: "Naka",
    description: "Artère commerçante couverte au centre de Hiroshima, mélange de boutiques, restaurants et cafés, animée du matin au soir.",
    conseil: "Cherche les petites échoppes d'okonomiyaki à emporter le long de la rue — moins connues que Okonomimura mais tout aussi bonnes, sans la file d'attente.",
    duree: "1h", budget: "¥", lat: 34.3939, lng: 132.4576, saison_ideale: "",
    horaires: "Boutiques 10h00–20h00 environ", acces: "10 min à pied depuis le château de Hiroshima",
    prix_detail: "Variable", site_web: "", a_proximite: ["hiroshima-castle", "peace-park"], image: "/images/lieux-photos/hondori.jpg",
    editorial: "Hondori s'étire sur près de 600 mètres au cœur de Hiroshima, entièrement couverte, et constitue depuis l'après-guerre l'artère commerçante centrale de la ville reconstruite. Sa position, à mi-chemin entre le château et le parc du Mémorial de la Paix, en fait une étape presque inévitable pour qui explore le centre-ville à pied.\n\nLa rue mélange enseignes nationales et commerces plus anciens, tenus par la même famille depuis des générations, ainsi qu'une offre de restauration dense qui va du fast-food aux petites échoppes spécialisées dans l'okonomiyaki façon Hiroshima — une variante empilée en couches (nouilles, chou, œuf) bien différente de la version osakane mélangée.\n\nLe soir, une fois les grandes enseignes fermées, une partie de la rue et de ses abords se transforme en zone de petits izakayas et bars, prolongeant l'animation bien après l'heure de fermeture des boutiques — un basculement d'ambiance qui surprend souvent les visiteurs venus l'après-midi.",
  },
  {
    id: "mitaki-dera", villeId: "hiroshima", nom: "Mitaki-dera", nom_jp: "三瀧寺", type: "voir",
    categorie: "Temple de montagne", emoji: "🍁", interets: ["culture", "nature"], quartier: "Nishi",
    description: "Temple bouddhiste niché dans une forêt de montagne à l'ouest de Hiroshima, autour de trois cascades qui lui donnent son nom, particulièrement recherché en automne.",
    conseil: "Peu fréquenté malgré sa proximité avec le centre — bonne échappée si Hiroshima commence à te sembler trop chargée en histoire et en monde.",
    duree: "1-2h", budget: "Gratuit", lat: 34.4133, lng: 132.4394, saison_ideale: "automne",
    horaires: "8h00–17h00", acces: "Station JR Mitaki, 15 min de marche en montée",
    prix_detail: "Gratuit (don libre)", site_web: "", a_proximite: [], image: "/images/lieux-photos/mitaki-dera.jpg",
    editorial: "Mitaki-dera — littéralement le \"temple aux trois cascades\" — se niche dans une forêt escarpée à seulement quelques kilomètres du centre de Hiroshima, mais l'ambiance y change radicalement : mousse, ruisseaux, pagode à trois étages du XVIe siècle, et un calme quasi complet même en haute saison touristique.\n\nUne pagode déplacée depuis la préfecture de Wakayama après la guerre, don en mémoire des victimes de la bombe atomique, se dresse au milieu du site — un symbole discret qui relie ce lieu de retraite montagnard à l'histoire plus lourde de la ville en contrebas. Le temple lui-même remonte au IXe siècle, fondé selon la tradition par le moine Kukai.\n\nEn automne, les érables qui tapissent la montée transforment le sentier en une des plus belles balades de la région pour observer le koyo (feuillage automnal), sans la foule que ce même spectacle attire à Kyoto ou Nikko. La montée depuis la gare, environ 15 minutes à pied en légère côte, filtre naturellement une partie des visiteurs les plus pressés.",
  },
  {
    id: "momiji-manju", villeId: "hiroshima", nom: "Momiji Manju de Miyajima", nom_jp: "もみじ饅頭", type: "manger",
    categorie: "Spécialité locale", emoji: "🍁", interets: ["gastro"], quartier: "Miyajima",
    description: "Petit gâteau en forme de feuille d'érable fourré à la pâte de haricot rouge, spécialité incontournable de l'île, vendu frais dans toute la rue commerçante.",
    conseil: "Cherche les échoppes qui les font cuire sous tes yeux dans des moules en forme de feuille — bien meilleurs tièdes et frais que ceux emballés en boîte.",
    duree: "30min", budget: "¥", lat: 34.2967, lng: 132.3200, saison_ideale: "", horaires: "9h00–17h00 environ (variable)",
    acces: "Rue commerçante Omotesando, entre le ferry et le sanctuaire", prix_detail: "150-200¥ pièce", site_web: "",
    a_proximite: ["miyajima", "itsukushima-shrine"], image: "/images/lieux-photos/momiji-manju.jpg",
    editorial: "Le momiji manju tire sa forme — une petite feuille d'érable dorée, moelleuse et légèrement croustillante sur les bords — du symbole même de Miyajima, réputée pour ses paysages d'automne. La pâtisserie serait née à la toute fin de l'époque Meiji, inventée par un pâtissier local inspiré par la forme des feuilles tombées près du sanctuaire.\n\nLa version classique, fourrée à la pâte de haricot rouge (anko), reste la plus répandue, mais la rue commerçante Omotesando qui mène au sanctuaire en propose aujourd'hui des dizaines de variantes : crème pâtissière, chocolat, fromage, matcha, voire une version frite popularisée plus récemment en street food.\n\nPlusieurs échoppes le long de la rue font cuire les gâteaux à la demande dans des moules en fonte en forme de feuille, embaumant toute la rue d'une odeur de pâte chaude — l'occasion de les acheter tièdes, sensiblement meilleurs que les boîtes préemballées vendues comme souvenirs dans le reste du Japon.",
  },

  // ═══════════════════════ HAKONE ═══════════════════════
  {
    id: "hakone-shrine", villeId: "hakone", nom: "Sanctuaire Hakone", nom_jp: "箱根神社", type: "voir",
    categorie: "Sanctuaire", emoji: "⛩️", interets: ["culture", "nature"], quartier: "Lac Ashi",
    description: "Sanctuaire niché dans la forêt au bord du lac Ashi, dont le torii rouge planté dans l'eau est l'une des images les plus photographiées de Hakone.",
    conseil: "Le torii dans l'eau se photographie mieux tôt le matin, avant l'arrivée des bateaux de croisière — lumière plus douce et moins de monde sur la jetée.",
    duree: "1h", budget: "Gratuit", lat: 35.2016, lng: 139.0286, saison_ideale: "automne",
    horaires: "9h00–16h00 (accès extérieur libre)", acces: "Bus depuis Hakone-Yumoto (40 min) arrêt Motohakone-ko",
    prix_detail: "Gratuit", site_web: "hakonejinja.or.jp", a_proximite: ["lac-ashi-croisiere"], image: "/images/lieux-photos/hakone-shrine.jpg",
    editorial: "Fondé au VIIIe siècle par un moine ascète venu s'installer sur les pentes du mont Hakone, le sanctuaire s'est historiquement doublé d'un rôle protecteur pour les voyageurs empruntant la route du Tokaido, l'axe reliant Edo (Tokyo) à Kyoto pendant l'époque féodale, qui passait juste à ses pieds.\n\nL'image la plus célèbre du site, un grand torii rouge planté directement dans les eaux du lac Ashi, a été érigée bien plus tard, en 1952, pour marquer un mariage impérial — mais elle s'est depuis imposée comme l'un des clichés les plus partagés de tout Hakone, rivalisant avec le mont Fuji visible en arrière-plan par temps clair.\n\nUn escalier de pierre bordé de hautes cryptomères mène du bord du lac jusqu'au sanctuaire principal, niché plus haut dans la forêt — une montée courte mais qui change radicalement d'ambiance, passant de l'agitation touristique du bord de lac à un calme forestier presque immédiat une fois les marches gravies.",
  },
  {
    id: "lac-ashi-croisiere", villeId: "hakone", nom: "Croisière sur le lac Ashi", nom_jp: "芦ノ湖遊覧船", type: "faire",
    categorie: "Croisière", emoji: "🚢", interets: ["nature", "lifestyle"], quartier: "Togendai / Moto-Hakone",
    description: "Traversée en bateau (parfois en réplique de galion pirate) du lac de cratère volcanique de Hakone, avec vue sur le mont Fuji par temps clair.",
    conseil: "Combine-la avec le téléphérique d'Owakudani dans le même sens pour former une boucle complète — c'est l'itinéraire classique du \"Hakone Round Course\".",
    duree: "30min-1h", budget: "¥¥", lat: 35.2058, lng: 139.0233, saison_ideale: "hiver",
    horaires: "9h30–17h00 environ (variable selon saison)", acces: "Ports de Togendai, Hakone-machi ou Moto-Hakone",
    prix_detail: "1200¥ environ (aller simple)", site_web: "hakone-kankosen.co.jp",
    a_proximite: ["hakone-shrine", "hakone-ropeway"], image: "/images/lieux-photos/lac-ashi-croisiere.jpg",
    editorial: "Le lac Ashi occupe la caldeira laissée par une éruption du mont Hakone il y a environ 3000 ans, aujourd'hui bordée de forêts et, par temps dégagé, offrant l'une des vues les plus dégagées sur le mont Fuji de toute la région du Kanto — un alignement qui n'a lieu, en pratique, qu'une partie de l'année, surtout en hiver quand l'air est plus sec.\n\nLes compagnies de croisière exploitent plusieurs bateaux, dont certains reproduisent délibérément l'apparence de galions pirates du XVIIe-XVIIIe siècle, un choix esthétique surprenant mais devenu indissociable de l'image du lac — une touche kitsch assumée qui contraste avec le calme du paysage environnant.\n\nLa traversée relie généralement Togendai, terminus du téléphérique venu d'Owakudani, à Hakone-machi ou Moto-Hakone où se trouve le sanctuaire et son torii dans l'eau — un enchaînement qui forme la colonne vertébrale du parcours touristique classique de Hakone, praticable en une demi-journée avec le Hakone Free Pass.",
  },
  {
    id: "hakone-ropeway", villeId: "hakone", nom: "Téléphérique de Hakone", nom_jp: "箱根ロープウェイ", type: "faire",
    categorie: "Téléphérique", emoji: "🚡", interets: ["nature"], quartier: "Owakudani",
    description: "Téléphérique panoramique survolant la vallée volcanique active d'Owakudani, avec vue sur le mont Fuji par temps clair et arrêt aux fumerolles.",
    conseil: "Ferme parfois temporairement en cas de pic d'activité volcanique (gaz sulfureux) — vérifie le statut en ligne avant de t'y rendre, surtout si Owakudani est ta priorité.",
    duree: "45min", budget: "¥¥", lat: 35.2419, lng: 139.0233, saison_ideale: "hiver",
    horaires: "9h00–17h00", acces: "Depuis Sounzan (funiculaire) ou Togendai (côté lac)",
    prix_detail: "1500¥ environ (Sounzan-Togendai)", site_web: "hakoneropeway.co.jp",
    a_proximite: ["owakudani", "lac-ashi-croisiere"], image: "/images/lieux-photos/hakone-ropeway.jpg",
    editorial: "Le téléphérique de Hakone relie en une trentaine de minutes le funiculaire de Sounzan au bord du lac Ashi, en passant directement au-dessus de la vallée d'Owakudani — un cratère volcanique toujours actif dont les fumerolles de soufre s'échappent visiblement du sol, donnant à ce tronçon du trajet des allures de paysage lunaire.\n\nL'installation, mise à niveau à plusieurs reprises depuis son ouverture dans les années 1960, fait partie intégrante du \"Hakone Round Course\", l'itinéraire classique qui combine train à crémaillère, funiculaire, téléphérique et bateau pour boucler un tour complet de la région sans jamais reprendre le même moyen de transport deux fois.\n\nL'activité volcanique de la zone n'est pas qu'un décor : des mesures de sécurité ferment occasionnellement une section du téléphérique lors de pics d'émission de gaz, remplacée temporairement par un bus de contournement. Un site officiel affiche le statut en temps réel, à vérifier avant de planifier la journée si Owakudani en est le point central.",
  },
  {
    id: "gora-park", villeId: "hakone", nom: "Parc de Gora", nom_jp: "強羅公園", type: "voir",
    categorie: "Jardin à la française", emoji: "🌷", interets: ["nature", "lifestyle"], quartier: "Gora",
    description: "Jardin à la française en terrasses sur les pentes de Gora, avec serre tropicale, roseraie et une maison de thé pour une cérémonie du thé simplifiée.",
    conseil: "La cérémonie du thé à la maison Kien s'improvise sans réservation — bonne première approche pour qui n'a jamais essayé, moins formelle qu'à Kyoto.",
    duree: "1h", budget: "¥", lat: 35.2419, lng: 139.0575, saison_ideale: "printemps",
    horaires: "9h00–17h00", acces: "Station Gora (funiculaire depuis Gora), 2 min à pied",
    prix_detail: "550¥", site_web: "hakone-tozan.co.jp/gorapark", a_proximite: [], image: "/images/lieux-photos/gora-park.jpg",
    editorial: "Ouvert en 1914, le parc de Gora fut l'un des tout premiers jardins à la française du Japon, conçu à une époque où l'aristocratie japonaise, en pleine occidentalisation de l'ère Meiji, s'enthousiasmait pour les jardins géométriques européens en rupture avec la tradition paysagère japonaise dominante.\n\nLe résultat, en terrasses successives à flanc de colline, mêle parterres de fleurs organisés en symétrie, roseraie particulièrement fournie au printemps et en automne, et une serre tropicale abritant orchidées et plantes équatoriales — un contraste net avec les jardins zen minéraux typiques de Kyoto à quelques centaines de kilomètres de là.\n\nAu cœur du parc, la maison de thé Kien propose une initiation courte et sans réservation à la cérémonie du thé japonaise, dans un cadre nettement moins codifié et intimidant que les grandes maisons de thé traditionnelles de Kyoto — une entrée en matière accessible pour qui découvre la pratique pour la première fois.",
  },
  {
    id: "sugi-namiki", villeId: "hakone", nom: "Allée des cryptomères (Hakone Kyu-Kaido)", nom_jp: "杉並木", type: "faire",
    categorie: "Nature", emoji: "🌲", interets: ["nature"], quartier: "Moto-Hakone",
    description: "Ancienne route Tokaido bordée de plus de 400 cryptomères plantés au XVIIe siècle, aujourd'hui promenade ombragée le long du lac Ashi.",
    conseil: "Marche-la tôt le matin ou en fin de journée — c'est l'un des seuls endroits de Hakone où l'on croise vraiment peu de monde même en haute saison.",
    duree: "1h", budget: "Gratuit", lat: 35.1975, lng: 139.0264, saison_ideale: "", horaires: "24h/24",
    acces: "Depuis Moto-Hakone, à pied le long du lac", prix_detail: "Gratuit", site_web: "",
    a_proximite: ["hakone-shrine"], image: "/images/lieux-photos/sugi-namiki.jpg",
    editorial: "Plantées à partir de 1618 sur ordre du shogunat Tokugawa, ces rangées de cryptomères — plus de 400 arbres subsistent encore aujourd'hui sur les 420 initiaux — bordaient à l'origine la route du Tokaido pour offrir de l'ombre aux voyageurs et daimyos en déplacement obligatoire entre leurs fiefs et la capitale Edo, une pratique de contrôle politique appelée sankin kotai.\n\nCe tronçon particulier, entre Moto-Hakone et Hakone-machi le long du lac Ashi, reste l'un des mieux préservés de l'ancienne route, avec ses pavés de pierre d'origine encore visibles par endroits sous la mousse. La hauteur des arbres, certains dépassant les 30 mètres après quatre siècles de croissance, crée un tunnel de verdure dense même en plein été.\n\nContrairement à la plupart des sites de Hakone concentrés autour du lac et du téléphérique, cette allée reste étonnamment calme, empruntée surtout par des marcheurs plutôt que des groupes de visite organisés — une parenthèse de silence à quelques centaines de mètres seulement de l'agitation du sanctuaire et des embarcadères.",
  },

  // ═══════════════════════ KANAZAWA ═══════════════════════
  {
    id: "kanazawa-castle", villeId: "kanazawa", nom: "Parc du Château de Kanazawa", nom_jp: "金沢城公園", type: "voir",
    categorie: "Château", emoji: "🏯", interets: ["culture"], quartier: "Centre",
    description: "Vaste parc autour des bâtiments reconstruits du château, ancien fief du puissant clan Maeda, juste en face du jardin Kenroku-en.",
    conseil: "L'entrée du parc est gratuite, seuls certains bâtiments intérieurs (Gojukken Nagaya) sont payants — fais au moins le tour extérieur même sans payer.",
    duree: "1h", budget: "¥", lat: 36.5638, lng: 136.6592, saison_ideale: "printemps",
    horaires: "7h00–18h00 (parc), 9h00–16h30 (bâtiments)", acces: "10 min à pied depuis Kenroku-en",
    prix_detail: "Parc gratuit, 320¥ (Gojukken Nagaya)", site_web: "pref.ishikawa.jp/siro-niwa",
    a_proximite: ["kenroku-en"], image: "/images/lieux-photos/kanazawa-castle.jpg",
    editorial: "Siège du clan Maeda pendant plus de deux siècles et demi, le château de Kanazawa fut à son apogée le plus grand château du Japon après celui d'Edo, reflet de la richesse considérable de ce fief — le plus prospère du pays sous le shogunat Tokugawa grâce à la production de riz de la région.\n\nDétruit à plusieurs reprises par des incendies au fil des siècles, le donjon principal n'a jamais été reconstruit ; ce sont les longues casemates fortifiées (Gojukken Nagaya) et les portes monumentales, reconstruites à l'identique dans les années 2000 selon des techniques de charpente traditionnelles sans clou métallique, qui composent aujourd'hui l'essentiel du site visitable.\n\nUn pont piétonnier relie directement le parc du château au jardin Kenroku-en de l'autre côté de la route — les deux sites, autrefois liés fonctionnellement (le jardin servait de promenade privée aux seigneurs Maeda), se visitent naturellement l'un après l'autre en une demi-journée.",
  },
  {
    id: "omicho-market", villeId: "kanazawa", nom: "Marché Omicho", nom_jp: "近江町市場", type: "manger",
    categorie: "Marché", emoji: "🦀", interets: ["gastro"], quartier: "Centre",
    description: "Marché couvert vieux de 300 ans, réputé pour ses fruits de mer de la mer du Japon — crabe de neige, oursin, thon — à déguster sur place ou en sushi.",
    conseil: "Beaucoup d'étals proposent une brochette de sashimi à manger debout pour quelques centaines de yens — meilleur moyen de goûter sans s'engager sur un repas complet.",
    duree: "1-2h", budget: "¥¥", lat: 36.5697, lng: 136.6533, saison_ideale: "hiver",
    horaires: "9h00–17h00 (variable selon échoppes)", acces: "Station JR Kanazawa, 15 min à pied ou bus",
    prix_detail: "Variable", site_web: "ohmicho-ichiba.com", a_proximite: ["kanazawa-castle"], image: "/images/lieux-photos/omicho-market.jpg",
    editorial: "Surnommé \"la cuisine de Kanazawa\" par les habitants, le marché Omicho existe sous une forme ou une autre depuis près de 300 ans, initialement organisé autour du commerce de riz avant de basculer vers les produits de la mer à mesure que la ville se développait comme port de pêche sur la mer du Japon.\n\nLa région d'Ishikawa est réputée dans tout le pays pour son crabe de neige (kani), pêché en hiver dans les eaux froides de la mer du Japon, ainsi que pour un oursin (uni) particulièrement crémeux et un thon gras qui rivalise avec celui du marché de Toyosu à Tokyo — le tout à des prix nettement plus abordables que dans la capitale.\n\nAu-delà des poissonneries traditionnelles, une multitude de petits comptoirs de sushi et de bars à sashimi permettent de goûter directement sur place, souvent debout, sans passer par un restaurant complet — une manière rapide et peu coûteuse de tester la qualité des produits locaux avant, éventuellement, un vrai repas de sushi ailleurs en ville.",
  },
  {
    id: "kanazawa-21st-century-museum", villeId: "kanazawa", nom: "Musée d'art contemporain du XXIe siècle", nom_jp: "金沢21世紀美術館", type: "faire",
    categorie: "Musée", emoji: "🎨", interets: ["culture", "lifestyle"], quartier: "Centre",
    description: "Musée circulaire entièrement vitré, dont l'œuvre la plus célèbre — une piscine en trompe-l'œil — permet de voir les visiteurs \"sous l'eau\" depuis le sous-sol.",
    conseil: "L'œuvre 'Swimming Pool' de Leandro Erlich (la piscine) demande parfois un billet séparé et une file dédiée — vérifie à l'accueil dès l'arrivée si elle t'intéresse.",
    duree: "1-2h", budget: "¥¥", lat: 36.5605, lng: 136.6580, saison_ideale: "", horaires: "10h00–18h00 (fermé lundi)",
    acces: "5 min à pied depuis Kenroku-en", prix_detail: "Zones gratuites libres, expos payantes ~450-1200¥", site_web: "kanazawa21.jp",
    a_proximite: ["kenroku-en", "kanazawa-castle"], image: "/images/lieux-photos/kanazawa-21st-century-museum.jpg",
    editorial: "Ouvert en 2004, ce musée circulaire entièrement vitré fut conçu par les architectes Kazuyo Sejima et Ryue Nishizawa (studio SANAA) sans façade avant ni arrière ni hiérarchie d'entrée : on peut y pénétrer depuis n'importe quel point de son pourtour, un parti pris architectural pensé pour désacraliser le rapport traditionnel, souvent intimidant, entre visiteur et musée d'art contemporain.\n\nLa pièce la plus photographiée du musée, \"The Swimming Pool\" de l'artiste argentin Leandro Erlich, joue sur une illusion optique : une fine couche d'eau repose sur une plaque de verre au niveau du sol, et des visiteurs peuvent se tenir \"en dessous\", dans un espace sec au sous-sol, créant l'impression pour les spectateurs du dessus qu'ils marchent sous l'eau au milieu de gens tout habillés.\n\nUne partie substantielle du bâtiment — la médiathèque, certaines installations extérieures, les espaces de circulation — reste en accès libre et gratuit, un choix délibéré pour en faire un lieu de passage quotidien pour les habitants de Kanazawa autant qu'une destination touristique, contribuant à sa fréquentation record parmi les musées d'art contemporain japonais.",
  },
  {
    id: "nagamachi", villeId: "kanazawa", nom: "Quartier des samouraïs de Nagamachi", nom_jp: "長町武家屋敷跡", type: "faire",
    categorie: "Quartier historique", emoji: "🗡️", interets: ["culture"], quartier: "Nagamachi",
    description: "Ancien quartier résidentiel des samouraïs de rang moyen du clan Maeda, avec ses murs d'argile ocre et ses canaux préservés depuis l'époque Edo.",
    conseil: "La résidence Nomura-ke, seule demeure de samouraï ouverte au public avec son jardin, mérite le petit billet d'entrée — les rues extérieures seules restent assez impersonnelles.",
    duree: "1h", budget: "¥", lat: 36.5636, lng: 136.6497, saison_ideale: "", horaires: "Libre accès (rues), 8h30–17h30 (Nomura-ke)",
    acces: "10 min à pied depuis la gare de Kanazawa", prix_detail: "550¥ (résidence Nomura-ke)", site_web: "",
    a_proximite: [], image: "/images/lieux-photos/nagamachi.jpg",
    editorial: "Nagamachi conserve l'un des rares ensembles urbains encore intacts de résidences de samouraïs de rang moyen au Japon, épargné à la fois par les guerres du XXe siècle et par la vague de modernisation urbaine qui a effacé des quartiers similaires ailleurs dans le pays. Ses ruelles pavées, longées de murs d'argile ocre surmontés de tuiles, et ses canaux d'irrigation datent presque tous de l'époque Edo.\n\nCes canaux, aujourd'hui décoratifs, servaient à l'origine un usage bien concret : alimenter les résidences en eau et protéger les fondations en argile des murs contre le gel hivernal, une technique d'entretien encore pratiquée aujourd'hui — chaque automne, les murs sont recouverts de paille tressée pour les protéger du froid.\n\nLa résidence Nomura-ke, seule maison de samouraï du quartier ouverte à la visite intérieure, donne un aperçu concret du mode de vie de cette classe sociale : son jardin, classé parmi les plus beaux petits jardins du Japon par un magazine américain spécialisé, combine étang, cascade et pierres disposées avec un soin qui contraste avec la sobriété extérieure du quartier.",
  },
  {
    id: "nishi-chaya", villeId: "kanazawa", nom: "Quartier Nishi Chaya", nom_jp: "西茶屋街", type: "faire",
    categorie: "Quartier historique", emoji: "🏮", interets: ["culture", "lifestyle"], quartier: "Nishi",
    description: "Le plus petit et le moins fréquenté des trois quartiers de geishas historiques de Kanazawa, avec ses maisons de bois à treillis encore en activité le soir.",
    conseil: "Beaucoup moins de monde qu'Higashi Chaya — meilleure option si tu ne veux visiter qu'un seul quartier de geishas et éviter les foules.",
    duree: "45min", budget: "Gratuit", lat: 36.5522, lng: 136.6486, saison_ideale: "", horaires: "Libre accès (rues)",
    acces: "15 min à pied depuis Kanazawa Station, ou bus", prix_detail: "Gratuit (rues)", site_web: "",
    a_proximite: [], image: "/images/lieux-photos/nishi-chaya.jpg",
    editorial: "Kanazawa compte trois quartiers historiques de geishas encore debout, tous fondés au même moment en 1820 quand le shogunat autorisa officiellement la création de districts de divertissement encadrés dans plusieurs grandes villes du pays. Higashi Chaya, le plus grand et le plus connu, concentre l'essentiel des visiteurs — Nishi Chaya, plus modeste, en reste largement épargné.\n\nSes façades de bois à treillis kimusuko, typiques de l'architecture des maisons de thé (ochaya), s'alignent sur deux courtes rues à peine, mais plusieurs d'entre elles continuent d'accueillir de véritables geiko (le terme local pour geisha) le soir, contrairement à certains quartiers ailleurs au Japon devenus purement muséaux.\n\nUn petit musée, le Nishi Chaya Shiryokan, occupe l'une des anciennes maisons de thé et permet de voir de près l'agencement intérieur typique d'un ochaya — salle de réception surélevée, jardin miniature, instruments de musique traditionnels — sans avoir à réserver une soirée de divertissement, généralement inaccessible aux visiteurs de passage sans introduction.",
  },
  {
    id: "kanazawa-gold-leaf", villeId: "kanazawa", nom: "Feuille d'or de Kanazawa", nom_jp: "金箔", type: "acheter",
    categorie: "Artisanat", emoji: "✨", interets: ["lifestyle", "gastro"], quartier: "Higashi",
    description: "Kanazawa produit environ 99% de la feuille d'or du Japon — cosmétiques, objets laqués et glaces recouvertes d'or se trouvent dans tout le quartier Higashi Chaya.",
    conseil: "La glace au matcha recouverte d'une feuille d'or entière (Hakuichi) est devenue LE cliché Instagram de Kanazawa — amusant une fois, clairement pour la photo plus que le goût.",
    duree: "30min-1h", budget: "¥¥", lat: 36.5715, lng: 136.6655, saison_ideale: "", horaires: "9h00–18h00 environ",
    acces: "Quartier Higashi Chaya, 20 min à pied depuis la gare", prix_detail: "Glace ~900¥, objets laqués variable", site_web: "hakuichi.co.jp",
    a_proximite: ["higashi-chaya"], image: "/images/lieux-photos/kanazawa-gold-leaf.jpg",
    editorial: "Kanazawa produit à elle seule environ 99% de toute la feuille d'or fabriquée au Japon, un artisanat qui remonte au XVIe siècle quand le seigneur Maeda Toshiie, arrivé au pouvoir dans la région, encouragea activement cette production pour financer et décorer temples, châteaux et objets de prestige du clan.\n\nLa technique elle-même n'a presque pas changé depuis : de minces feuilles de métal sont martelées à la main jusqu'à atteindre une épaisseur d'à peine un dix-millième de millimètre, un travail de précision qui demande des années d'apprentissage. Plusieurs ateliers du quartier Higashi Chaya proposent des démonstrations, et certains des ateliers d'application de feuille d'or sur des objets (bols, boîtes laquées).\n\nCette expertise s'est aussi diffusée dans la gastronomie et les cosmétiques locaux : crèmes pour le visage, savons, et surtout la désormais très photographiée glace molle recouverte d'une feuille d'or entière, devenue l'un des symboles touristiques les plus reconnaissables de la ville, même si son intérêt gustatif reste, de l'aveu des habitants eux-mêmes, assez limité.",
  },

  // ═══════════════════════ TAKAYAMA ═══════════════════════
  {
    id: "takayama-morning-market", villeId: "takayama", nom: "Marché matinal de Miyagawa", nom_jp: "宮川朝市", type: "manger",
    categorie: "Marché matinal", emoji: "🥬", interets: ["gastro"], quartier: "Miyagawa",
    description: "Marché en plein air le long de la rivière Miyagawa, tenu par des agricultrices locales depuis des générations, vendant légumes, pickles et snacks à grignoter en marchant.",
    conseil: "Vas-y tôt (avant 9h) — les meilleurs produits partent vite et l'ambiance authentique du marché s'estompe à mesure que les groupes de touristes arrivent.",
    duree: "1h", budget: "¥", lat: 36.1440, lng: 137.2540, saison_ideale: "", horaires: "7h00–12h00 environ (variable saison)",
    acces: "10 min à pied depuis la gare de Takayama", prix_detail: "Variable, snacks 100-400¥", site_web: "",
    a_proximite: ["takayama-old-town"], image: "/images/lieux-photos/takayama-morning-market.jpg",
    editorial: "Le marché matinal de Miyagawa perpétue une tradition qui remonterait à l'époque Edo, quand les fermières des environs venaient vendre directement leur production le long de la rivière, faute de circuit de distribution formel. La pratique a survécu quasiment inchangée : ce sont encore aujourd'hui majoritairement des femmes, souvent âgées, qui tiennent les étals depuis des décennies, parfois transmis de mère en fille.\n\nLégumes de saison, pickles maison (tsukemono), fruits, et surtout une foule de petits en-cas à grignoter en marchant — brochettes de mochi grillé, dango, ou le fameux beurre glacé local — composent l'essentiel de l'offre, pensée pour un tourisme de flânerie plus qu'un vrai marché d'approvisionnement.\n\nLa rivière Miyagawa elle-même, bordée de saules pleureurs et traversée de ponts de bois, ajoute au charme du lieu, particulièrement tôt le matin quand la brume matinale de cette région montagnarde flotte encore sur l'eau — l'un des rares marchés du Japon où le décor rivalise presque avec les produits vendus.",
  },
  {
    id: "hida-folk-village", villeId: "takayama", nom: "Village folklorique de Hida (Hida no Sato)", nom_jp: "飛騨の里", type: "voir",
    categorie: "Musée en plein air", emoji: "🏚️", interets: ["culture"], quartier: "Nishinoisshiki",
    description: "Musée en plein air regroupant une trentaine de fermes traditionnelles au toit de chaume gassho-zukuri, déplacées de toute la région pour préserver l'architecture rurale de Hida.",
    conseil: "Bonne alternative si tu ne prévois pas d'aller jusqu'à Shirakawa-go — même style architectural, sans le trajet ni la foule du site classé UNESCO.",
    duree: "1-2h", budget: "¥", lat: 36.1364, lng: 137.2364, saison_ideale: "hiver", horaires: "8h30–17h00",
    acces: "20 min à pied depuis la gare, ou bus", prix_detail: "700¥", site_web: "hidanosato-tpo.jp",
    a_proximite: [], image: "/images/lieux-photos/hida-folk-village.jpg",
    editorial: "Face à la disparition progressive des fermes traditionnelles de la région de Hida, menacées par l'exode rural et la modernisation de l'habitat après-guerre, les autorités locales ont entrepris à partir des années 1950 de démonter et reconstruire une trentaine de bâtiments représentatifs sur un même site en périphérie de Takayama — une démarche de conservation qui a préfiguré celle, plus tardive, de la préservation de Shirakawa-go.\n\nLes fermes gassho-zukuri, reconnaissables à leur toit de chaume très pentu conçu pour supporter le poids de la neige abondante des hivers de la région, forment le cœur de la collection, aux côtés d'ateliers de forgerons, de tisserands et d'autres artisans traditionnels encore en activité par moments sur le site.\n\nContrairement à Shirakawa-go, situé à près d'une heure de route et classé UNESCO, Hida no Sato reste accessible directement depuis le centre de Takayama et beaucoup moins fréquenté — une alternative crédible pour qui découvre ce style architectural sans vouloir consacrer une demi-journée entière au trajet vers le village classé.",
  },
  {
    id: "takayama-jinya", villeId: "takayama", nom: "Takayama Jinya", nom_jp: "高山陣屋", type: "voir",
    categorie: "Bâtiment historique", emoji: "🏯", interets: ["culture"], quartier: "Sanmachi",
    description: "Seul bâtiment administratif de l'époque Edo encore intact au Japon, ancien siège du gouvernement local direct du shogunat dans la région de Hida.",
    conseil: "La salle des interrogatoires et la chambre de torture, conservées en l'état, en font l'une des visites les plus concrètes sur le fonctionnement réel du pouvoir féodal.",
    duree: "1h", budget: "¥", lat: 36.1397, lng: 137.2530, saison_ideale: "", horaires: "8h45–17h00 (16h30 nov-fév)",
    acces: "5 min à pied depuis la vieille ville de Takayama", prix_detail: "440¥", site_web: "jinya.gifu.jp",
    a_proximite: ["takayama-old-town"], image: "/images/lieux-photos/takayama-jinya.jpg",
    editorial: "Takayama Jinya est le seul bâtiment gouvernemental de l'époque Edo entièrement conservé au Japon — partout ailleurs dans le pays, ces sièges administratifs locaux ont été démolis, reconvertis ou détruits par les guerres et incendies au fil des siècles. Sa survie tient en grande partie à l'isolement montagnard de la région, qui l'a protégé des grandes destructions urbaines du XXe siècle.\n\nLa région de Hida, riche en bois de qualité, fut placée sous administration directe du shogunat plutôt que confiée à un seigneur local — un statut particulier appelé tenryo, réservé aux territoires jugés stratégiquement précieux. Le jinya servait alors de tribunal, de bureau des impôts et de résidence pour le magistrat envoyé par Edo, toutes fonctions dont les salles d'origine subsistent encore aujourd'hui.\n\nLa visite inclut la salle où se tenaient les interrogatoires judiciaires, avec ses instruments de contrainte conservés en l'état, ainsi que les vastes greniers à riz attenants où étaient stockés les impôts prélevés en nature sur toute la région — un aperçu concret et rare du fonctionnement administratif quotidien du Japon féodal, loin de l'image plus spectaculaire des châteaux et samouraïs.",
  },
  {
    id: "hida-beef-skewer", villeId: "takayama", nom: "Brochettes de bœuf de Hida", nom_jp: "飛騨牛串", type: "manger",
    categorie: "Street food", emoji: "🥩", interets: ["gastro"], quartier: "Sanmachi",
    description: "Bœuf de Hida, l'une des viandes marbrées les plus réputées du Japon avec le wagyu de Kobe, servi en brochette grillée à emporter dans les rues de la vieille ville.",
    conseil: "Cherche la mention 'A5' sur les panneaux — le grade le plus élevé du bœuf japonais, souvent proposé aux côtés d'une version moins chère mais toujours locale.",
    duree: "30min", budget: "¥¥", lat: 36.1414, lng: 137.2528, saison_ideale: "", horaires: "10h00–16h00 environ",
    acces: "Vieille ville de Takayama (Sanmachi Suji)", prix_detail: "500-900¥ la brochette", site_web: "",
    a_proximite: ["takayama-old-town", "takayama-jinya"], image: "/images/lieux-photos/hida-beef-skewer.jpg",
    editorial: "Le bœuf de Hida, élevé dans les vallées montagnardes autour de Takayama, rivalise depuis plusieurs décennies avec le plus célèbre wagyu de Kobe pour le titre de meilleure viande marbrée du Japon — les deux races partagent d'ailleurs la même origine génétique (le bœuf noir japonais), leur différence tenant surtout au terroir et aux méthodes d'élevage locales.\n\nContrairement à Kobe, où déguster ce niveau de bœuf implique généralement un repas assis dans un restaurant dédié à prix élevé, Takayama a développé une offre de street food beaucoup plus accessible : des brochettes de bœuf grillé, souvent flambées au chalumeau devant le client pour saisir l'extérieur tout en gardant l'intérieur rosé, vendues dans toute la vieille ville pour quelques centaines de yens.\n\nLes échoppes affichent généralement le grade de la viande (A5 étant le plus élevé sur l'échelle japonaise de classification), avec parfois une option légèrement moins gradée et moins chère pour les budgets plus serrés — une manière simple de goûter à ce bœuf réputé sans l'engagement financier d'un repas complet en restaurant spécialisé.",
  },

  // ═══════════════════════ UJI ═══════════════════════
  {
    id: "ujigami-jinja", villeId: "uji", nom: "Ujigami Jinja", nom_jp: "宇治上神社", type: "voir",
    categorie: "Sanctuaire", emoji: "⛩️", interets: ["culture"], quartier: "Uji",
    description: "Le plus ancien bâtiment shinto encore debout au Japon, classé UNESCO, dont le sanctuaire principal daterait du XIe siècle.",
    conseil: "Modeste et rapide à visiter (15-20 min), mais sa valeur historique dépasse largement sa taille — ne le zappe pas en pensant que Byodo-in suffit.",
    duree: "30min", budget: "Gratuit", lat: 34.8911, lng: 135.8087, saison_ideale: "", horaires: "9h00–16h30",
    acces: "10 min à pied depuis Byodo-in, de l'autre côté de la rivière", prix_detail: "Gratuit", site_web: "",
    a_proximite: ["byodo-in", "uji-bridge"], image: "/images/lieux-photos/ujigami-jinja.jpg",
    editorial: "Derrière sa façade modeste, Ujigami Jinja détient un record impressionnant : son bâtiment principal, dendré par les experts à la fin du XIe siècle, serait la plus ancienne structure shinto encore debout au Japon — une antériorité qui lui vaut son inscription au patrimoine mondial de l'UNESCO aux côtés de Byodo-in, juste en face de l'autre côté de la rivière.\n\nLe sanctuaire était historiquement lié à Byodo-in comme son gardien tutélaire (chinju), un arrangement courant à l'époque où temples bouddhistes et sanctuaires shinto fonctionnaient souvent en binôme avant leur séparation forcée à l'ère Meiji. Cette proximité explique la position des deux sites, à quelques minutes de marche l'un de l'autre de part et d'autre de la rivière Uji.\n\nL'architecture, d'une sobriété qui tranche avec la splendeur dorée de Byodo-in, illustre un style shinto ancien largement disparu ailleurs au Japon, où la plupart des sanctuaires ont été reconstruits à intervalles réguliers selon la pratique du shikinen sengu. Sa modestie apparente cache donc, paradoxalement, une rareté architecturale majeure.",
  },
  {
    id: "uji-bridge", villeId: "uji", nom: "Pont d'Uji", nom_jp: "宇治橋", type: "faire",
    categorie: "Balade", emoji: "🌉", interets: ["culture", "nature"], quartier: "Uji",
    description: "L'un des plus anciens ponts du Japon (VIIe siècle dans sa première version), traversant la rivière Uji réputée pour la qualité de son eau utilisée dans la culture du thé.",
    conseil: "S'arrête à la petite avancée en bois côté amont (Sawarabi-no-michi) — c'est de là que, selon la légende, on puisait l'eau pour le thé impérial.",
    duree: "30min", budget: "Gratuit", lat: 34.8908, lng: 135.8062, saison_ideale: "", horaires: "24h/24",
    acces: "Au centre d'Uji, entre la gare et Byodo-in", prix_detail: "Gratuit", site_web: "",
    a_proximite: ["byodo-in", "ujigami-jinja"], image: "/images/lieux-photos/uji-bridge.jpg",
    editorial: "Le pont d'Uji figure parmi les trois plus anciens ponts historiques du Japon, sa première construction remontant à 646 selon les chroniques anciennes — un âge qui en fait un témoin de l'histoire du pays depuis l'époque où Uji jouait un rôle stratégique sur la route entre Nara et l'actuel Kyoto, bien avant que cette dernière ne devienne capitale.\n\nLa rivière qu'il enjambe a donné son nom au thé le plus réputé du Japon : l'eau de l'Uji, jugée d'une pureté exceptionnelle depuis des siècles, était traditionnellement utilisée pour infuser le thé destiné à la cour impériale, contribuant à asseoir la réputation de la région bien avant l'essor commercial du matcha moderne.\n\nUne petite avancée en bois sur le côté amont du pont, le Sawarabi-no-michi, marque l'endroit où l'eau était historiquement puisée pour les cérémonies du thé les plus prestigieuses — un détail que la plupart des visiteurs pressés vers Byodo-in, à quelques centaines de mètres, ne remarquent jamais en traversant.",
  },
  {
    id: "taiho-an", villeId: "uji", nom: "Maison de thé Taiho-an", nom_jp: "対鳳庵", type: "faire",
    categorie: "Cérémonie du thé", emoji: "🍵", interets: ["gastro", "culture"], quartier: "Uji",
    description: "Maison de thé municipale au bord de la rivière, proposant une cérémonie du thé matcha courte et accessible sans réservation ni connaissance préalable.",
    conseil: "Compte 30-40 min, en petit groupe assis sur tatami — une hôtesse guide chaque étape, aucune expérience préalable nécessaire.",
    duree: "45min", budget: "¥", lat: 34.8896, lng: 135.8060, saison_ideale: "", horaires: "10h00–16h00 (fermé lundi)",
    acces: "2 min à pied depuis le pont d'Uji", prix_detail: "1000¥ environ (thé + wagashi)", site_web: "",
    a_proximite: ["uji-bridge", "uji-matcha"], image: "/images/lieux-photos/taiho-an.jpg",
    editorial: "Ouverte par la municipalité d'Uji pour faire vivre au grand public une véritable cérémonie du thé sans les barrières habituelles — réservation longue à l'avance, connaissance de l'étiquette, invitation personnelle —, Taiho-an occupe un pavillon de bois traditionnel juste au bord de la rivière, à deux pas du pont historique.\n\nLa cérémonie proposée, volontiers plus courte et moins codifiée que dans les grandes écoles de thé de Kyoto, reste néanmoins fidèle à la structure classique : préparation du matcha à l'aide d'un fouet en bambou, service accompagné d'un petit wagashi sucré pour équilibrer l'amertume du thé, le tout assis sur tatami sous la conduite d'une hôtesse qui explique chaque geste.\n\nÉtant donné qu'Uji est considérée comme la région d'origine du matcha de la plus haute qualité au Japon, boire son thé ici plutôt qu'à Kyoto ou Tokyo prend un sens particulier — une manière de remonter, littéralement, à la source de ce que la plupart des visiteurs ne connaissent qu'en dessert ou en boisson glacée dans le reste du pays.",
  },

  // ═══════════════════════ HIMEJI ═══════════════════════
  {
    id: "koko-en", villeId: "himeji", nom: "Jardin Koko-en", nom_jp: "好古園", type: "voir",
    categorie: "Jardin", emoji: "🎍", interets: ["culture", "nature"], quartier: "Himeji",
    description: "Neuf jardins japonais distincts aménagés côte à côte sur l'ancien emplacement des résidences de samouraïs, juste à côté du château de Himeji.",
    conseil: "Billet combiné avec le château légèrement moins cher que les deux séparément — prends-le directement à l'entrée du château si tu comptes faire les deux.",
    duree: "1h", budget: "¥", lat: 34.8407, lng: 134.6912, saison_ideale: "automne", horaires: "9h00–17h00 (16h nov-fév)",
    acces: "Juste à l'ouest du château de Himeji", prix_detail: "310¥ (450¥ combiné avec le château)", site_web: "himeji-machishin.jp/ryokuchi/koko_en",
    a_proximite: ["himeji-castle"], image: "/images/lieux-photos/koko-en.jpg",
    editorial: "Koko-en occupe l'emplacement exact des anciennes résidences de samouraïs de haut rang qui entouraient le château de Himeji à l'époque féodale — plutôt que de reconstruire ces demeures disparues, les concepteurs du jardin, ouvert en 1992 pour célébrer le centenaire de la municipalité, ont choisi d'aménager neuf jardins distincts délimités par les murs de pierre d'origine des différentes résidences.\n\nChaque jardin explore un style différent : jardin de thé traditionnel avec sa propre maison de cérémonie, jardin sec zen composé de rochers et de gravier ratissé, jardin de bambous, jardin de fleurs de saison, ou encore un jardin des chutes d'eau où l'eau dévale plusieurs paliers successifs. Cette juxtaposition permet, en une seule visite, de découvrir l'éventail des styles paysagers japonais habituellement dispersés entre plusieurs sites différents.\n\nDepuis plusieurs points du jardin, le donjon blanc du château de Himeji apparaît en arrière-plan, utilisé délibérément comme paysage emprunté (shakkei) — un jeu de composition qui associe la rigueur du jardin à l'échelle monumentale du château voisin.",
  },
  {
    id: "himeji-egret-street", villeId: "himeji", nom: "Rue Miyuki (Egret Street)", nom_jp: "みゆき通り", type: "acheter",
    categorie: "Rue commerçante", emoji: "🛍️", interets: ["lifestyle", "gastro"], quartier: "Himeji",
    description: "Rue commerçante piétonne reliant la gare de Himeji au château, mêlant boutiques locales, restaurants et cafés sur près d'un kilomètre.",
    conseil: "Vise-la pour le déjeuner en allant vers le château depuis la gare — évite de chercher un restaurant une fois sur place, l'offre autour du château est plus limitée.",
    duree: "30min-1h", budget: "¥", lat: 34.8285, lng: 134.6934, saison_ideale: "", horaires: "Boutiques 10h00–19h00 environ",
    acces: "Sortie nord de la gare de Himeji, mène directement au château", prix_detail: "Variable", site_web: "",
    a_proximite: ["himeji-castle"], image: "/images/lieux-photos/himeji-egret-street.jpg",
    editorial: "La rue Miyuki, surnommée Egret Street en référence au surnom du château de Himeji (\"le château du héron blanc\"), forme l'axe piéton naturel entre la gare et le château, aménagée en large promenade commerçante bordée d'arcades permettant de marcher à l'abri de la pluie ou du soleil sur la quasi-totalité du trajet.\n\nContrairement aux zones purement touristiques qui se développent parfois autour des grands monuments japonais, cette rue reste avant tout fréquentée par les habitants de Himeji pour leurs courses du quotidien, avec une majorité de commerces indépendants — pâtisseries, restaurants de udon, boutiques de vêtements — plutôt que des enseignes nationales standardisées.\n\nLa vue sur le donjon blanc du château, qui apparaît progressivement à mesure qu'on remonte la rue depuis la gare, en fait aussi l'un des meilleurs points de photo de la ville : l'alignement de la rue a été pensé, lors de son réaménagement, pour cadrer le château en ligne de mire depuis la sortie de la gare.",
  },
];

// ── Validation ────────────────────────────────────────────────────────────
const existingIds = new Set(data.lieux.map((l) => l.id));
const existingVilleIds = new Set(data.villes.map((v) => v.id));
const seenNew = new Set();
for (const entry of NEW_LIEUX) {
  if (existingIds.has(entry.id)) throw new Error(`id déjà présent dans japan-data.json : ${entry.id}`);
  if (seenNew.has(entry.id)) throw new Error(`id dupliqué dans NEW_LIEUX : ${entry.id}`);
  seenNew.add(entry.id);
  if (!existingVilleIds.has(entry.villeId)) throw new Error(`villeId inconnu pour ${entry.id} : ${entry.villeId}`);
  if (!entry.editorial || entry.editorial.length < 200) throw new Error(`editorial manquant/trop court pour ${entry.id}`);
}

// ── Fusion ────────────────────────────────────────────────────────────────
for (const entry of NEW_LIEUX) {
  const { editorial, ...lieu } = entry;
  data.lieux.push(lieu);
  editorial_set(entry.id, editorial);
}
function editorial_set(id, text) { editorial[id] = { editorial: text }; }

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
fs.writeFileSync(EDITORIAL_PATH, JSON.stringify(editorial, null, 2) + "\n");

console.log(`✓ ${NEW_LIEUX.length} lieux ajoutés (+ 1 correction : himeji-castle déplacé de kanazawa vers himeji)`);
console.log(`✓ ${NEW_LIEUX.length} entrées éditoriales ajoutées`);
console.log(`✓ ville "himeji" ajoutée`);
console.log(`Total lieux : ${data.lieux.length}`);
