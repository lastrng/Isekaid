// Les photos créées par l'application sont des fichiers à la racine du dossier utilisateur.
export async function removeAccountMemoryPhotos(storage, userId) {
  const bucket = storage.from("memory-photos");
  while (true) {
    const { data: files, error: listError } = await bucket.list(userId, { limit: 1000 });
    if (listError) throw listError;
    if (!files?.length) return;
    const { error } = await bucket.remove(files.map(file => `${userId}/${file.name}`));
    if (error) throw error;
    // Repartir du début : le lot précédent a été supprimé.
  }
}
