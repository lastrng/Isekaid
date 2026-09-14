function firstSentence(value, maxLength = 180) {
  const text=String(value || "").trim();
  if(!text)return "";
  const sentence=text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || text;
  return sentence.length<=maxLength?sentence:`${sentence.slice(0,maxLength-1).trimEnd()}…`;
}

/** Explication courte d’usage pour les expressions affichées dans Apprendre. */
export function getExpressionExplanation(phrase, situation) {
  const editorial=phrase?.explication || phrase?.contexte || phrase?.usage || phrase?.note;
  if(editorial)return firstSentence(editorial);

  const value=`${phrase?.jp || phrase?.expression || ""} ${phrase?.romaji || ""}`;
  if(/ください|kudasai/i.test(value))return "「ください」 transforme ce qui précède en demande polie : « …, s’il vous plaît ».";
  if(/お願いします|onegaishimasu/i.test(value))return "「お願いします」 formule une demande polie et naturelle lorsqu’on sollicite un service.";
  if(/すみません|sumimasen/i.test(value))return "Formule passe-partout pour attirer l’attention, s’excuser légèrement ou remercier quelqu’un pour sa peine.";
  if(/ありがとう|arigat/i.test(value))return /ございます|gozaimasu/i.test(value)?"Avec 「ございます」, le remerciement convient aux inconnus, au personnel et aux situations formelles.":"Remerciement courant, plutôt adapté aux proches et aux échanges détendus.";
  if(/いいですか|ii desu ka/i.test(value))return "La tournure 「〜てもいいですか」 sert à demander poliment la permission.";
  if(/ですか|desu ka/i.test(value))return "「ですか」 termine une question polie, adaptée aux échanges avec une personne que tu ne connais pas.";
  if(/ませんか|masen ka/i.test(value))return "La forme 「〜ませんか」 propose ou invite avec douceur, sans imposer.";
  if(/ました|mashita/i.test(value))return "La terminaison 「ました」 place l’action dans le passé tout en gardant un registre poli.";
  if(/ます|masu/i.test(value))return "La terminaison 「ます」 donne à la phrase un registre poli, sûr dans la plupart des situations de voyage.";

  const title=situation?.titre?.replace(/^Au |^À l'|^À la |^Dans le /i,"").toLowerCase();
  return title?`Expression simple à employer ${title.startsWith("aéroport")?"à l’":"dans le contexte « "}${title}${title.startsWith("aéroport")?"":" »"}.`:`Expression courante à mémoriser comme une formule complète.`;
}

export { firstSentence };
