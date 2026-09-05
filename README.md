# Isekai'd

Application mobile francophone d'immersion au Japon : culture, japonais
pratique, scénarios, tuteur conversationnel et planification de voyage.

## Stack

- React 18 et Vite pour l'interface
- Capacitor pour Android/iOS
- Supabase pour l'authentification, les données distantes et les Edge Functions
- RevenueCat pour les abonnements natifs
- Anthropic, appelé uniquement par les Edge Functions, pour le tuteur et les
  itinéraires assistés

## Démarrage local

Prérequis : Node.js 20 ou 22 et npm.

```bash
cp .env.example .env
npm ci
npm run dev
```

Renseigner au minimum `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans
`.env`. Les secrets serveur ne doivent jamais être préfixés par `VITE_`.

## Commandes

| Commande | Usage |
| --- | --- |
| `npm run dev` | Serveur Vite de développement |
| `npm run build` | Build web de production dans `dist/` |
| `npm test` | Validation des données et fichiers essentiels |
| `npm run check` | Validation complète suivie du build |
| `npm run content:audit` | Audit des champs, doublons, kana, références et médias |
| `npm run content:enrich` | Application idempotente des packs éditoriaux puis audit |
| `npm run android:sync` | Build puis synchronisation Capacitor Android |
| `npm run android:open` | Ouverture du projet Android natif |

## Organisation

```text
src/                    Interface, logique cliente et contenu embarqué
public/                 Assets servis tels quels (audio, images, pages légales)
supabase/functions/     Tuteur, itinéraires, Premium et rendu du carnet
supabase/migrations/    Schéma SQL versionné
android/                Projet natif géné et personnalisé par Capacitor
carnet-render-service/  Microservice privé HTML vers PDF
scripts/                Outils de maintenance et validation des contenus
voyages-preconcus-draft/ Sources éditoriales des itinéraires préconçus
```

Les scripts `fetch-*.mjs`, `generate-*.mjs` et `merge-*.mjs` à la racine sont
des outils éditoriaux. Ils ne participent pas au runtime de l'application.

## Architecture applicative

`src/App.jsx` contient encore l'essentiel des écrans et de la navigation. Les
nouveaux développements doivent progressivement extraire les domaines dans des
modules dédiés (`features/home`, `features/explore`, `features/learn`,
`features/travel`) sans refonte globale risquée.

La progression hors ligne vit principalement dans `localStorage`. Supabase est
la source distante pour la session, le feed, les découvertes, les conversations
du tuteur et les droits Premium accordés par code.

## Android

```bash
npm run android:sync
cd android
./gradlew assembleDebug
```

La signature release utilise `android/key.properties` et un keystore local.
Ces deux fichiers sont ignorés par Git et doivent être sauvegardés dans un
coffre sécurisé.

## Services distants

Les Edge Functions attendent leurs secrets dans Supabase : clé Anthropic,
clé secrète RevenueCat, code Premium et URL/jeton du service de rendu PDF.
Voir les commentaires en tête de chaque fichier sous `supabase/functions/`.

Le projet voisin `../isekaid-social` est un service indépendant de publication
quotidienne vers Instagram, Facebook et le feed de l'application.

## Règles de contribution

- Ne jamais committer `.env`, un keystore ou `key.properties`.
- Lancer `npm run check` avant une pull request.
- Ne pas éditer `dist/` ni les répertoires de build Android.
- Conserver les identifiants des contenus stables : ils référencent la
  progression et les favoris stockés localement.
- L'audit éditorial est aussi exécuté automatiquement à chaque changement de
  contenu et chaque lundi par le workflow `Content quality`.
