# Phase 4 — Mode Japon et SOS

## Compléments réalisés

- Accueil Mode Japon dédié, sélection du voyage/jour depuis les fonctions métier existantes, sans permission de localisation.
- Prochaine activité, lieux personnalisés conservés sur l'appareil, accès textuel du lieu et progression du jour.
- Activités cochables/décochables depuis l'accueil. La mutation est limitée au jour courant d'un séjour non annulé/non terminé, enregistrée localement puis envoyée via la file existante.
- Actualisation au retour au premier plan, aux changements de stockage, aux synchronisations et toutes les minutes lorsque l'accueil est monté.
- Accès au programme/carte du séjour, aux véritables phrases par situation et à SOS. Le raccourci de phrases n'ouvre plus les scénarios.
- Les conseils du catalogue liés à la prochaine activité sont réutilisés.
- Dans SOS, le retour Android ferme d'abord la phrase en grand, puis la catégorie. Le dialogue place le focus sur son bouton Fermer, gère Échap/Tab et autorise le défilement sur un petit écran.

## Hors connexion

L'application Android embarque les textes du catalogue, les situations et SOS. Le programme déjà enregistré, la checklist et les activités restent locaux ; les protections de synchronisation des lots précédents sont réutilisées. Aucune carte hors ligne complète n'est téléchargée dans ce lot. Les fonds de carte, les images distantes et le tuteur peuvent demander du réseau. Les voix japonaises dépendent du téléphone. L'indication de connexion reflète le navigateur, pas une garantie de disponibilité de Supabase.

Le site web n'acquiert pas de service worker dans ce lot : ne pas confondre l'application Android embarquée avec un premier chargement web hors connexion.

## Validation et sauvegarde

Build web et audit éditorial réussis ; 31 fichiers de tests passent, dont les tests du jour courant, de la progression, de l'annulation d'une coche et du refus de modifier un autre jour. Les essais sur appareil restent exclus à la demande de l'utilisateur. Aucun nouvel APK produit.

Tag préalable vérifié : `backup-before-phase4-20260905` (`cb4967a`). Copie indépendante avec `git worktree add --detach /tmp/isekaid-before-phase4 backup-before-phase4-20260905`. Aucune migration SQL ni modification de fonction serveur.
