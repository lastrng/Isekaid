# Navigation principale et migration des espaces

État au 10 septembre 2026 — étape 1.

La barre principale expose cinq destinations stables :

| Espace produit | Destination interne | Promesse | Contenu existant migré |
| --- | --- | --- | --- |
| Aujourd’hui | `home` | point d'entrée quotidien personnalisé | accueil contextuel et rituel |
| Voyage | `voyage` | préparer et vivre un voyage | voyages, journées, carte, documents et SOS |
| Apprendre | `learn` | japonais pour les situations réelles | parcours, kana, compréhension et révision |
| Découvrir | `explore` | comprendre et explorer le Japon | culture, gastronomie, histoire, territoires et société |
| Mon Japon | `profile` | identité et mémoire personnelles | profil, favoris, progression, journal et souvenirs |

Les routes `daily`, `scenarios` et `tutor` restent compatibles, mais sont
désormais des routes internes de leur espace produit :

- `daily` appartient à Aujourd’hui ;
- `scenarios` et `tutor` appartiennent à Apprendre.

`resolveDestination` accepte les identifiants historiques et les alias
lisibles (`today`, `voyager`, `decouvrir`, `mon_japon`), normalise la casse et
les espaces, puis retombe sur Aujourd’hui pour une destination inconnue.
`primaryDestination` détermine l'espace à mettre en évidence pour une route
interne.

## Conservation de l'état

`PrimaryNavigationShell` charge une route lors de sa première visite. La
route reste ensuite montée et est masquée avec l'attribut `hidden` lorsqu'une
autre destination devient active. Les états React, formulaires, sous-écrans
et positions de défilement restent ainsi disponibles au retour dans l'onglet.
Les routes non encore visitées ne sont pas montées afin de préserver le temps
de démarrage et le chargement différé existant.

Les intentions de navigation contextuelles restent consommables après le
premier montage : ouvrir une révision, un scénario, une catégorie culturelle,
un voyage ou le tuteur remplace ponctuellement l'état interne ciblé, sans
réinitialiser les autres espaces.

## Retour et accessibilité

Le retour Android ferme d'abord les panneaux globaux, puis le sous-écran de
la section active. Une route interne revient à son espace parent (`tutor` vers
Apprendre, `daily` vers Aujourd’hui) avant le retour éventuel à Aujourd’hui.

La barre utilise cinq icônes Lucide cohérentes et des libellés toujours
visibles. Chaque bouton expose aussi la promesse de l'espace dans son nom
accessible et indique la destination active avec `aria-current="page"`.
