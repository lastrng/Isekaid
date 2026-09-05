#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const path = "src/japan-data.json";
const data = JSON.parse(await readFile(path, "utf8"));

const additions = {
  expressions: [
    ["すみません、道に迷いました", "Sumimasen, michi ni mayoimashita", "Excusez-moi, je me suis perdu", "Pour demander de l’aide après avoir perdu son chemin.", "駅までの道を教えてください。道に迷いました。", "Pouvez-vous m’indiquer le chemin de la gare ? Je me suis perdu.", "🧭", "すみません、みちに まよいました"],
    ["おすすめは何ですか", "Osusume wa nan desu ka", "Qu’est-ce que vous recommandez ?", "Au restaurant, dans une boutique ou pour choisir une spécialité locale.", "この店のおすすめは何ですか。", "Quelle est la spécialité de ce restaurant ?", "✨", "おすすめは なんですか"],
    ["これをください", "Kore o kudasai", "Je voudrais ceci, s’il vous plaît", "Une formule simple pour commander en montrant un article ou un plat.", "すみません、これを一つください。", "Excusez-moi, je voudrais celui-ci, s’il vous plaît.", "👉", "これを ください"],
    ["お会計をお願いします", "Okaikei o onegai shimasu", "L’addition, s’il vous plaît", "À dire au personnel quand on souhaite régler au restaurant.", "ごちそうさまでした。お会計をお願いします。", "Merci pour le repas. L’addition, s’il vous plaît.", "🧾", "おかいけいを おねがいします"],
    ["写真を撮ってもいいですか", "Shashin o totte mo ii desu ka", "Puis-je prendre une photo ?", "Pour demander la permission dans un temple, une boutique ou à une personne.", "ここで写真を撮ってもいいですか。", "Puis-je prendre une photo ici ?", "📷", "しゃしんを とっても いいですか"],
    ["予約しています", "Yoyaku shite imasu", "J’ai une réservation", "À l’arrivée dans un hôtel, un restaurant ou une activité.", "田中の名前で予約しています。", "J’ai une réservation au nom de Tanaka.", "📅", "よやくして います"],
    ["何時までですか", "Nanji made desu ka", "Jusqu’à quelle heure est-ce ouvert ?", "Pour vérifier l’heure de fermeture d’un lieu ou d’un service.", "このお店は何時までですか。", "Jusqu’à quelle heure cette boutique est-elle ouverte ?", "🕐", "なんじまで ですか"],
    ["現金だけですか", "Genkin dake desu ka", "Acceptez-vous seulement les espèces ?", "Utile dans les petites adresses où la carte n’est pas toujours acceptée.", "支払いは現金だけですか。", "Le paiement se fait-il uniquement en espèces ?", "💴", "げんきんだけ ですか"],
    ["別々に払えますか", "Betsubetsu ni haraemasu ka", "Peut-on payer séparément ?", "Pour demander une addition séparée, parfois indisponible dans les petits restaurants.", "二人ですが、別々に払えますか。", "Nous sommes deux, pouvons-nous payer séparément ?", "💳", "べつべつに はらえますか"],
    ["乗り換えはどこですか", "Norikae wa doko desu ka", "Où dois-je changer ?", "Dans une gare pour trouver une correspondance de train ou de métro.", "京都行きの乗り換えはどこですか。", "Où est la correspondance pour Kyoto ?", "🚆", "のりかえは どこですか"],
    ["荷物を預けられますか", "Nimotsu o azukeraremasu ka", "Puis-je laisser mes bagages ?", "À l’hôtel, dans un musée ou auprès d’une consigne.", "チェックイン前に荷物を預けられますか。", "Puis-je laisser mes bagages avant l’enregistrement ?", "🧳", "にもつを あずけられますか"],
    ["大丈夫です", "Daijōbu desu", "Ça va / Non merci", "Expression polyvalente : rassurer, refuser poliment ou dire que tout va bien selon le contexte.", "袋は大丈夫です。", "Je n’ai pas besoin de sac, merci.", "👌", "だいじょうぶ です"]
  ].map(([expression,romaji,traduction,contexte,exemple_jp,exemple_fr,emoji,kana]) => ({expression,romaji,traduction,contexte,exemple_jp,exemple_fr,emoji,kana})),
  repas: [
    ["お好み焼き","Okonomiyaki","Crêpe salée japonaise","déjeuner ou dîner","Pâte garnie de chou, viande ou fruits de mer, cuite sur une plaque et nappée de sauce, mayonnaise et bonite séchée.","Son nom signifie littéralement « grillé comme vous l’aimez » : chaque région défend sa propre version.","🥞","おこのみやき"],
    ["たこ焼き","Takoyaki","Boulettes au poulpe","street food","Boulettes de pâte brûlantes garnies de poulpe, emblématiques d’Osaka, servies avec sauce, mayonnaise et aonori.","On les retourne très vite avec deux pics dans des moules spécialement arrondis.","🐙","たこやき"],
    ["親子丼","Oyakodon","Bol poulet et œuf","déjeuner","Bol de riz couvert de poulet et d’œuf mijotés dans un bouillon légèrement sucré au soja.","Oyakodon signifie « parent et enfant », le poulet et l’œuf réunis dans le même bol.","🍚","おやこどん"],
    ["うどん","Udon","Nouilles épaisses","déjeuner ou dîner","Épaisses nouilles de blé servies chaudes dans un bouillon ou froides avec une sauce à tremper.","À Kagawa, l’udon est si central que la préfecture se présente parfois comme le « royaume de l’udon ».","🍜","うどん"],
    ["そば","Soba","Nouilles de sarrasin","déjeuner","Nouilles fines de sarrasin, chaudes ou froides, appréciées pour leur goût franc et leur texture légère.","Le soir du Nouvel An, les toshikoshi soba symbolisent le passage vers une longue vie.","🥢","そば"],
    ["おにぎり","Onigiri","Boulette de riz garnie","encas","Triangle ou boule de riz entouré de nori, garni de saumon, prune umeboshi, thon mayonnaise ou kombu.","L’emballage des konbini sépare l’algue du riz jusqu’à l’ouverture pour qu’elle reste croustillante.","🍙","おにぎり"],
    ["だし巻き卵","Dashimaki tamago","Omelette roulée au bouillon","petit-déjeuner ou accompagnement","Omelette moelleuse cuite en fines couches avec du dashi, puis roulée dans une poêle rectangulaire.","À Kyoto elle est souvent plus douce et riche en bouillon, tandis que Tokyo préfère une version plus sucrée.","🍳","だしまきたまご"],
    ["鯛焼き","Taiyaki","Gâteau en forme de daurade","goûter","Gaufre en forme de poisson, traditionnellement fourrée à la pâte de haricots rouges, parfois à la crème ou au chocolat.","On débat volontiers pour savoir s’il faut commencer à le manger par la tête ou par la queue.","🐟","たいやき"],
    ["茶漬け","Ochazuke","Riz au thé","repas léger","Bol de riz sur lequel on verse du thé vert ou du dashi, complété de saumon, nori, sésame ou prune salée.","C’est un plat de fin de soirée et de récupération, simple et profondément réconfortant.","🍵","おちゃづけ"],
    ["わらび餅","Warabi mochi","Pâte translucide au kinako","dessert","Bouchées souples à base d’amidon, couvertes de poudre de soja grillé et parfois de sirop kuromitsu.","Malgré son nom, sa texture est bien plus fondante que celle du mochi de riz classique.","🌾","わらびもち"]
  ].map(([nom_jp,romaji,traduction,moment,description,fun_fact,emoji,kana]) => ({nom_jp,romaji,traduction,moment,description,fun_fact,emoji,kana})),
  proverbes: [
    ["猿も木から落ちる","Saru mo ki kara ochiru","Même les singes tombent des arbres.","Même un expert peut se tromper.","さるも きから おちる"],
    ["七転び八起き","Nanakorobi yaoki","Tomber sept fois, se relever huit.","La persévérance compte davantage que les échecs.","ななころび やおき"],
    ["花より団子","Hana yori dango","Les boulettes plutôt que les fleurs.","Préférer l’utile ou le plaisir concret à la seule apparence.","はなより だんご"],
    ["石の上にも三年","Ishi no ue ni mo sannen","Trois ans même sur une pierre.","La patience et la constance finissent par porter leurs fruits.","いしの うえにも さんねん"],
    ["郷に入っては郷に従え","Gō ni itte wa gō ni shitagae","Dans un village, suis les usages du village.","Respecter les coutumes locales lorsque l’on voyage.","ごうに いっては ごうに したがえ"],
    ["一期一会","Ichigo ichie","Une rencontre, une seule fois.","Chaque rencontre mérite d’être vécue comme un moment unique.","いちご いちえ"],
    ["急がば回れ","Isogaba maware","Si tu es pressé, fais le détour.","Le chemin prudent est parfois le plus rapide.","いそがば まわれ"],
    ["百聞は一見に如かず","Hyakubun wa ikken ni shikazu","Cent récits ne valent pas un regard.","Voir par soi-même vaut mieux que beaucoup d’explications.","ひゃくぶんは いっけんに しかず"]
  ].map(([jp,romaji,fr,sens,kana]) => ({jp,romaji,fr,sens,kana}))
};

const keys = { expressions: "expression", repas: "nom_jp", proverbes: "jp" };
let added = 0;
for (const [collection, entries] of Object.entries(additions)) {
  const known = new Set(data[collection].map((item) => item[keys[collection]]));
  for (const entry of entries) if (!known.has(entry[keys[collection]])) {
    data[collection].push(entry);
    known.add(entry[keys[collection]]);
    added++;
  }
}

// Corrections de lectures corrompues présentes dans les données historiques.
const kanaFixes = new Map([["かき氷", "かきごおり"], ["鍋料理", "なべりょうり"]]);
for (const meal of data.repas) if (kanaFixes.has(meal.nom_jp)) meal.kana = kanaFixes.get(meal.nom_jp);
const legacyMealFixes = new Map([["カレーライス", "かれーらいす"], ["天ぷら", "てんぷら"], ["抹茶ラテ", "まっちゃらて"]]);
for (const meal of data.repas) if (legacyMealFixes.has(meal.nom_jp)) meal.kana = legacyMealFixes.get(meal.nom_jp);
const legacyExpressionFixes = new Map([["道", "どう"], ["花鳥風月", "かちょうふうげつ"]]);
for (const expression of data.expressions) if (legacyExpressionFixes.has(expression.expression)) expression.kana = legacyExpressionFixes.get(expression.expression);
// La fiche Kodama avait par erreur repris les kanji et le sens de Komorebi.
const kodama = data.expressions.find((item) => item.romaji === "Ko-dama");
if (kodama) kodama.expression = "木霊";

await writeFile(path, `${JSON.stringify(data, null, 2)}\n`);
console.log(`${added} contenus ajoutés; ${Object.keys(additions).length} collections contrôlées.`);
