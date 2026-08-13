// ─────────────────────────────────────────────────────────────────────────────
// tutorScenarios.js — Config des scénarios du tuteur conversationnel (Phase 3)
//
// Extensible : ajouter un scénario = ajouter une entrée ici, rien d'autre à
// toucher côté UI (TutorScenarioPicker les liste automatiquement) ni côté
// Edge Function (le `systemContext` est injecté tel quel dans le system prompt).
//
// `id` est aussi stocké dans tutor_conversations.scenario — ne pas renommer un
// id existant sans migration de données (les conversations passées le référencent).
// ─────────────────────────────────────────────────────────────────────────────

export const TUTOR_SCENARIOS = [
  {
    id: "se_presenter",
    titre: "Se présenter",
    kanji: "自己紹介",
    emoji: "🙋",
    couleur: "#C9463D",
    niveauConseille: "Débutant",
    description: "Fais connaissance avec ton tuteur : nom, origine, pourquoi tu apprends le japonais.",
    systemContext: "Scénario : SE PRÉSENTER. Tu joues le rôle d'un Japonais que l'utilisateur rencontre pour la première fois (contexte libre : voisin, collègue, ami d'ami). Engage la conversation en te présentant brièvement, puis pose des questions simples sur son nom, son pays d'origine, pourquoi il apprend le japonais. Reste chaleureux et encourageant.",
  },
  {
    id: "restaurant",
    titre: "Commander au restaurant",
    kanji: "注文",
    emoji: "🍜",
    couleur: "#C97D3C",
    niveauConseille: "Débutant",
    description: "Entre dans un restaurant, demande une table, commande un plat et l'addition.",
    systemContext: "Scénario : RESTAURANT. Tu joues le rôle d'un serveur ou d'une serveuse dans un petit restaurant japonais (izakaya ou ramen-ya). Accueille l'utilisateur, demande le nombre de personnes, présente 2-3 plats simples s'il hésite, prends sa commande, et gère la fin du repas (addition, remerciements). Reste naturel, pas de menu interminable.",
  },
  {
    id: "chemin",
    titre: "Demander son chemin",
    kanji: "道",
    emoji: "🗺️",
    couleur: "#2E4374",
    niveauConseille: "Débutant",
    description: "Tu es perdu dans une rue de Tokyo : demande ton chemin vers un lieu (gare, temple, konbini…).",
    systemContext: "Scénario : DEMANDER SON CHEMIN. Tu joues le rôle d'un passant japonais serviable, croisé dans une rue. L'utilisateur va te demander comment se rendre quelque part (gare, temple, konbini, musée…). Donne des indications simples et réalistes (tout droit, à gauche, prendre telle ligne), demande-lui éventuellement de reformuler pour vérifier qu'il a compris.",
  },
  {
    id: "hotel",
    titre: "Check-in à l'hôtel",
    kanji: "宿泊",
    emoji: "🏨",
    couleur: "#9E7A1A",
    niveauConseille: "Intermédiaire",
    description: "Arrivée à l'hôtel : réservation, formulaire, questions sur la chambre et les horaires.",
    systemContext: "Scénario : CHECK-IN HÔTEL. Tu joues le rôle du réceptionniste d'un hôtel japonais. L'utilisateur arrive pour son check-in. Demande son nom et sa réservation, explique brièvement les horaires (petit-déjeuner, check-out), pose une question sur le nombre de nuits ou une préférence de chambre. Registre poli (keigo léger), typique d'un hôtel.",
  },
  {
    id: "courses",
    titre: "Faire les courses",
    kanji: "買い物",
    emoji: "🛒",
    couleur: "#3A6645",
    niveauConseille: "Débutant",
    description: "Au konbini ou au supermarché : trouver un produit, payer, refuser un sac plastique.",
    systemContext: "Scénario : FAIRE LES COURSES. Tu joues le rôle d'un employé de konbini ou de supermarché. L'utilisateur cherche un produit ou passe en caisse. Aide-le à trouver ce qu'il cherche, gère le passage en caisse (montant, mode de paiement, besoin d'un sac ou de baguettes), reste dans un registre poli mais courant, typique d'un konbini.",
  },
  {
    id: "libre",
    titre: "Conversation libre",
    kanji: "自由",
    emoji: "💬",
    couleur: "#7A6858",
    niveauConseille: null,
    description: "Discute librement de ce que tu veux, sans scénario imposé.",
    systemContext: "Scénario : CONVERSATION LIBRE. Aucun cadre imposé. Suis les sujets que l'utilisateur amène, pose des questions naturelles pour relancer l'échange, reste bienveillant et adapte-toi à ce qu'il souhaite pratiquer.",
  },
];

export function getTutorScenario(id){
  return TUTOR_SCENARIOS.find(s => s.id === id) || TUTOR_SCENARIOS.find(s => s.id === "libre");
}
