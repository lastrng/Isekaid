/**
 * Normalise la réponse Supabase Auth sans confondre « aucune session » et
 * « vérification impossible ». Cette distinction permet à l'app de continuer
 * hors ligne avec un profil local connu, au lieu de renvoyer vers la connexion.
 */
export function normalizeSessionResponse(result){
  return {
    session:result?.data?.session ?? null,
    error:result?.error ?? null,
  };
}
