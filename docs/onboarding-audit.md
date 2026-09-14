# Audit de l’onboarding avant refonte v2

## Reprise vérifiée le 14 septembre 2026 — avant toute modification applicative

Backup **complet**, fichiers cachés, `.git`, `.env`, dépendances, Android, builds et sauvegardes antérieures inclus : `/home/ubuntu/backups/isekaid-before-onboarding-refresh-2026-09-14-101703`. Copie `cp -a`, puis comparaison intégrale `diff -qr` terminée sans différence. Branche `main`, HEAD `4affeaf`, arbre déjà fortement modifié ; les modifications préexistantes sont conservées. Aucun `AGENTS.md` trouvé.

Le tableau historique ci-dessous décrit le flow antérieur au travail partiel déjà présent. À cette reprise, le code contient **6 écrans mixtes**, **3 nouveautés**, **5 guides**. Il n’est donc pas exact de présenter les 22 étapes historiques comme encore toutes actives.

| Étape actuelle au 14/09 | Écran visé | Texte | Utilité | Encore valide ? | Action |
|---|---|---|---|---|---|
| Promesse | Plein écran | Ton Japon commence ici | Présenter le produit | Oui | KEEP |
| Aujourd’hui + intérêts | Plein écran | Un peu de Japon chaque jour | Rituel, mais questionnaire mélangé | Partiel | UPDATE ; MOVE intérêts vers préférences |
| Apprendre + niveau | Plein écran | Le japonais utile, au bon moment | Usage réel, questionnaire mélangé | Partiel | UPDATE ; MOVE niveau vers préférences |
| Voyage + relation | Plein écran | Avant, pendant et après ton voyage | Temporalité pertinente | Oui | KEEP ; MOVE relation vers préférences |
| Découvrir | Plein écran | Explore tout le Japon | Exploration | Oui | UPDATE ; réunir avec la sauvegarde Mon Japon |
| Mon Japon + prénom | Plein écran | Construis ton propre Japon | Accomplissements | Oui | MOVE dans le dernier écran et prénom dans préférences |
| Nouveautés 1–3 | Plein écran | Rituel / Voyage / Mon Japon | Migration courte | Oui | KEEP ; UPDATE persistance et reprise |
| Guide Aujourd’hui | Session complète | Ton rendez-vous quotidien | Bonne intention, grande cible | Partiel | UPDATE ; ancrer au titre de session |
| Guide Voyage | En-tête | Quatre variantes réelles | Bonne cible | Oui | KEEP ; UPDATE rendu et cycle de vie |
| Guide Apprendre | Carte Mon parcours | Apprends ce qui te sera utile | Bonne cible | Oui | KEEP ; UPDATE rendu |
| Guide Découvrir | Catalogue | Explore le Japon à ton rythme | Cible trop basse | Partiel | MOVE vers l’entrée de l’exploration |
| Guide Mon Japon | Passeport | Voici ton Japon | Bonne cible | Oui | KEEP ; UPDATE rendu |
| Réinitialiser profil | Réglages | Tu repasseras par l’onboarding | Rejoue implicitement et perd le profil | Non | REPLACE par édition des préférences |

### Défauts concrets à corriger

- `Onboarding` perd index/réponses au reload et ne place pas le focus sur le nouveau titre.
- L’enrichissement Google crée un profil avant même la vérification cloud : compte neuf classé ancien.
- Le routage peut intervenir avant le chargement cloud si un profil local existe.
- `settings.onboarding` remplace le local à la lecture ; un retour cloud tardif peut annuler une aide vue entretemps.
- Les routes visitées restent montées : les guides doivent être conditionnés par l’onglet actif.
- Le voile, le pulse infini et la bulle fixe masquent parfois la cible ; aucun contrôle de visibilité réel.
- Échec d’écriture de l’état ignoré ; `finishIntro` ignore le paramètre `skipped` dans la donnée persistée.
- Le profil local global n’a pas de propriétaire ; logout ne suffit pas pour tous les changements d’identité.
- Le backup générique restaure aussi le profil historique et risque de contredire la lecture de `progress`.

### Décisions retenues

Présentation de **5 écrans sans formulaire** ; les 3 signaux utiles et le prénom restent éditables séparément dans Profil & réglages. Six catégories existantes (`voyage`, `culture`, `gastro`, `anime`, `lifestyle`, `langue`), niveaux historiques inchangés. Une aide non modale par onglet, liée au DOM, sans voile ni visite forcée. Version 2 conservée pour ne pas rejouer la refonte partielle déjà terminée. Supabase utilise `progress.settings` et sa synchronisation avec contrôle de concurrence existante ; aucune migration de schéma nécessaire.

Recherche couvrant `src`, `test`, `scripts`, `supabase` : onboarding, tutorial, walkthrough, coachmark, tour, guide, intro, firstRun, hasSeen, onboardingCompleted, tooltip, spotlight, overlay, guided, welcome, presentation. Les autres occurrences sont des détails de contenu, SOS, tuteur, explications japonaises, modales métier et célébrations. `DailyWelcome` doit rester séquencé sans se superposer aux aides ; aucun nouvel outil analytics.

Audit réalisé le 12 septembre 2026, avant modification du flow. La navigation produit de référence est : Aujourd’hui, Voyage, Apprendre, Découvrir, Mon Japon.

## Inventaire

Le parcours pouvait présenter jusqu’à **22 temps pédagogiques** : 4 questions de profil, 3 chapitres plein écran, 13 coach marks lancés en chaîne sur les 5 onglets, puis 2 aides supplémentaires à la première ouverture des scénarios. Les états étaient répartis entre un booléen cloud (`settings.introSeen`) et six familles de clés `localStorage` non rattachées au compte.

| Étape actuelle | Écran visé | Texte / intention | Utilité | Encore valide ? | Action |
|---|---|---|---|---|---|
| Relation au Japon | Onboarding profil | « Où en es-tu avec le Japon ? » | Personnalise Voyage et Aujourd’hui | Oui | KEEP, intégrer sans rallonger le flow |
| Centres d’intérêt | Onboarding profil | « Qu’est-ce qui t’attire ? » | Pondère les recommandations | Oui | UPDATE, taxonomie et ton sobres |
| Niveau de japonais | Onboarding profil | « Quel est ton niveau de japonais ? » | Adapte l’apprentissage | Oui | UPDATE |
| Séjour, avatar, prénom | Onboarding profil | « Parle-moi de toi » | Le prénom est utile ; les dates et l’avatar alourdissent l’entrée | Partiellement | REMOVE pour dates/avatar, MOVE du prénom dans un champ facultatif discret |
| Avant | Présentation plein écran | « Du rêve aux premiers pas » | Explique la préparation | Partiel | REPLACE par la promesse Voyage avant/pendant/après |
| Pendant | Présentation plein écran | « Moins chercher. Plus vivre. » | Explique le Mode Japon | Oui, mais isolé | MOVE dans l’écran Voyage |
| Après | Présentation plein écran | « Le retour n’est pas la fin. » | Explique les souvenirs | Oui, mais isolé | MOVE dans Voyage et Mon Japon |
| Aujourd’hui · Ton rituel | Aujourd’hui / session | Découverte, japonais, situation | Bonne cible, texte trop large | Partiel | UPDATE vers une aide unique « Ton rendez-vous quotidien » |
| Avant · Prépare ton départ / Imagine ton Japon / Après | Aujourd’hui / carte Voyage | « Ouvre ton itinéraire… prochaine action… » | Décrit une ancienne organisation et duplique Voyage | Non | REMOVE |
| Crée ton itinéraire | Voyage / créer | Détail de création | Trop procédural | Non | REPLACE par une aide adaptée à l’état réel |
| Itinéraire préconçu | Voyage / modèles | Détail de modèles | Trop procédural | Non | REMOVE |
| Essentiels sur place | Voyage / SOS | SOS et outils | Utile uniquement en voyage actif | Partiel | MOVE dans la variante « Mode Japon » |
| Parcours guidé | Apprendre / parcours | Présente « Survivre à Tokyo » | Bonne cible mais visite exhaustive | Partiel | UPDATE et condenser |
| Entraînement libre | Apprendre / alphabets | Détail des exercices | Trop détaillé pour la première visite | Non | REMOVE |
| Révision espacée | Apprendre / révisions | Explique le SRS | Utile plus tard, cible parfois absente | Non | REMOVE |
| Recherche | Découvrir / recherche | Chercher tradition, mot ou lieu | Fonction réelle mais trop spécifique | Partiel | REMOVE du guide initial |
| Japonais dans Découvrir | Découvrir / sélection éditoriale | Renvoie vers Apprendre | Mauvais onglet et message confus | Non | REMOVE |
| Modules de découverte | Découvrir / catalogue | Filtres, fiches, cadenas | Trop détaillé | Partiel | REPLACE par une aide unique sur l’exploration |
| Mon histoire | Mon Japon / passeport | Voyages, tampons, carnet | Bonne intention | Oui | UPDATE et condenser |
| Découvertes sauvegardées | Mon Japon / collections | Favoris et collection | Bonne intention | Oui | MOVE dans la même aide Mon Japon |
| Situations réelles | Scénarios | Dialogue guidé | Utile, mais secondaire | Oui | KEEP comme conseil fonctionnel non inclus dans les 5 guides principaux |
| Correction immédiate | Scénarios | Audio et progression | Trop détaillé lors de la première visite | Non | REMOVE |

## Conditions et persistance observées

- `isekaid_profile_v1` décidait si le questionnaire de profil devait apparaître.
- `isekaid_intro_seen_v1` et `progress.settings.introSeen` décidaient si la présentation en trois temps avait été vue.
- `isekaid_home_intro_seen_v1` pilotait l’accueil.
- `isekaid_section_intro_{explore|scenarios|learn|voyage}_v1` pilotait les aides par section.
- Mon Japon dépendait uniquement du tour React en cours et ne disposait pas de flag autonome.
- « Revoir la présentation » effaçait plusieurs flags puis lançait automatiquement une visite de tous les onglets.
- Les clés étant globales à l’appareil, une déconnexion suivie d’un autre compte pouvait hériter des guides vus par le compte précédent.
- Le backup cloud générique pouvait copier ces clés globales, tandis que seul `introSeen` était explicitement présent dans `progress.settings`.

## Risques constatés

- Sur-sollicitation : le premier accès pouvait enchaîner questionnaire, présentation et coach marks sans laisser utiliser le produit.
- Contenu obsolète : « Avant · Prépare ton départ » décrit une ancienne logique d’itinéraire et non le cycle Voyage actuel.
- Cibles fragiles ou absentes selon l’état : révisions, modèles, SOS et collections ne sont pas toujours pertinents.
- Migration impossible : un booléen éternel ne distingue pas une version produit d’une autre.
- Isolation de compte insuffisante pour les flags locaux.
- CTA et ton incohérents (`Compris 🌸`, flèches et nombreux emojis).

## Décision de la première tentative du 12/09 (remplacée par la reprise ci-dessus)

- Un onboarding nouveau compte de 6 écrans maximum, mêlant uniquement les trois signaux de personnalisation réellement consommés au produit et cinq promesses produit.
- Une présentation « Isekaid a évolué » limitée à 3 écrans pour les profils existants.
- Une aide contextuelle, ancrée sur un élément stable, pour chacun des cinq onglets.
- Un état unique, versionné et rattaché à l’identifiant Supabase (ou au profil local invité), synchronisé dans `progress.settings`.
- Le replay rejoue la présentation produit sans modifier le profil et sans enchaîner automatiquement tous les onglets.
