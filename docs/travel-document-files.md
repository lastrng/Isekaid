# Pièces jointes locales des voyages

Sauvegarde vérifiée : `backup-before-document-files-20260905`, commit
`eef42495d0603ac6697aa45919e8af345aa81d26` (arbre propre avant intervention).
Reprendre cet état sans écraser le travail courant :

```sh
git worktree add --detach /tmp/isekaid-before-document-files backup-before-document-files-20260905
```

L'écran Documents et réservations accepte désormais une pièce jointe par référence :
PDF, JPEG ou PNG, non vide et de 10 Mo maximum. La signature des premiers octets
est vérifiée indépendamment du nom et du type MIME déclaré. Cela valide le format
annoncé, pas l'intégrité complète ni l'innocuité du contenu du fichier.

Les blobs sont conservés dans IndexedDB `isekaid_document_files_v1`, store `files`,
sous une clé composée `[owner, tripId, documentId]`. `owner` est l'identifiant du
compte connecté ou `guest`. Les fichiers invités ne sont pas automatiquement
transférés à un compte lors de la connexion. Aucun blob ou nom de fichier n'est
ajouté au JSON des voyages ni envoyé à Supabase, au partage, au PDF ou au tuteur.
La synchronisation des références textuelles reste indépendante. Sur un autre
appareil, l'absence de fichier local est affichée explicitement.

L'écriture remplace le fichier atomiquement ; un quota dépassé laisse le précédent
intact. Les URL Blob de l'aperçu sont libérées après remplacement ou démontage.
L'interface expose le chargement, les erreurs et le retrait local avec confirmation.
Les images ont un aperçu ; les fichiers ont un lien de téléchargement/ouverture.
Aucun traitement distant ou nouvelle permission de géolocalisation n'est ajouté.

Les pièces jointes sont conservées après déconnexion, mais leur accès par l'app est
limité à leur propriétaire. La suppression du compte nettoie ses fichiers locaux ;
un échec produit une instruction de nettoyage manuel. Retirer une référence ou
un voyage conserve ses blobs pour permettre les restaurations/annulations ; ils
seront nettoyés avec le compte. Ils ne constituent pas une sauvegarde durable :
effacer les données de l'app/navigateur peut les perdre. L'écran demande de garder
les originaux. Cette étape remplace la limite « pas d'import » du document précédent.

Validation : tests des signatures acceptées/refusées, fichiers vides/trop gros,
clés distinctes entre comptes/voyages et stockage indisponible. Le check global
(tests existants, audit et build) passe ; les nouveaux tests passent séparément.
L'intégration IndexedDB réelle et l'ouverture des PDF dans Android/WebView restent
à vérifier sur appareil. Pas de déploiement ni de génération d'APK dans cette étape.
