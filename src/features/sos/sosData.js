export const SOS_CATEGORIES = [
  { id:"lost", emoji:"🧭", label:"Je suis perdu", phrases:[
    { id:"lost-help", japanese:"道に迷いました。ここへ行きたいです。", kana:"みちに まよいました。ここへ いきたいです。", romaji:"Michi ni mayoimashita. Koko e ikitai desu.", french:"Je suis perdu. Je voudrais aller ici." },
  ]},
  { id:"order", emoji:"🍜", label:"Je veux commander", phrases:[
    { id:"order-this", japanese:"これを一つお願いします。", kana:"これを ひとつ おねがいします。", romaji:"Kore o hitotsu onegaishimasu.", french:"Je voudrais ceci, s’il vous plaît." },
  ]},
  { id:"sick", emoji:"🏥", label:"Je suis malade", phrases:[
    { id:"sick-doctor", japanese:"具合が悪いです。病院へ行きたいです。", kana:"ぐあいが わるいです。びょういんへ いきたいです。", romaji:"Guai ga warui desu. Byōin e ikitai desu.", french:"Je me sens mal. Je voudrais aller à l’hôpital." },
  ]},
  { id:"hotel", emoji:"🏨", label:"Problème à l’hôtel", phrases:[
    { id:"hotel-problem", japanese:"部屋に問題があります。手伝ってください。", kana:"へやに もんだいが あります。てつだって ください。", romaji:"Heya ni mondai ga arimasu. Tetsudatte kudasai.", french:"Il y a un problème dans ma chambre. Aidez-moi, s’il vous plaît." },
  ]},
  { id:"payment", emoji:"💳", label:"Je n’arrive pas à payer", phrases:[
    { id:"payment-failed", japanese:"支払いができません。現金だけですか？", kana:"しはらいが できません。げんきんだけですか？", romaji:"Shiharai ga dekimasen. Genkin dake desu ka?", french:"Je n’arrive pas à payer. Acceptez-vous seulement les espèces ?" },
  ]},
  { id:"help", emoji:"🆘", label:"J’ai besoin d’aide", phrases:[
    { id:"help-now", japanese:"助けてください。", kana:"たすけて ください。", romaji:"Tasukete kudasai.", french:"Aidez-moi, s’il vous plaît." },
  ]},
  { id:"say", emoji:"💬", label:"Je veux dire quelque chose", phrases:[
    { id:"say-translate", japanese:"翻訳アプリを使ってもいいですか？", kana:"ほんやくアプリを つかっても いいですか？", romaji:"Hon’yaku apuri o tsukatte mo ii desu ka?", french:"Puis-je utiliser une application de traduction ?" },
  ]},
  { id:"directions", emoji:"📍", label:"Demander mon chemin", phrases:[
    { id:"directions-station", japanese:"すみません、この場所はどこですか？", kana:"すみません、この ばしょは どこですか？", romaji:"Sumimasen, kono basho wa doko desu ka?", french:"Excusez-moi, où se trouve cet endroit ?" },
  ]},
];

export function findSosCategory(id) {
  return SOS_CATEGORIES.find(category => category.id === id) || null;
}

export function findSosPhrase(id) {
  for (const category of SOS_CATEGORIES) {
    const phrase = category.phrases.find(item => item.id === id);
    if (phrase) return phrase;
  }
  return null;
}
