// ─────────────────────────────────────────────────────────────────────────────
// purchases.js — Paiement via RevenueCat (Capacitor, Android + iOS)
//
// Remplace billing.js (Digital Goods API / TWA).
// RevenueCat unifie Google Play Billing et StoreKit (iOS) derrière une seule API.
//
// PRÉREQUIS (voir GUIDE-REVENUECAT.md) :
//   1. npm install @revenuecat/purchases-capacitor (dans Codespaces)
//   2. npx cap sync (pour copier le plugin natif dans android/)
//   3. Compte RevenueCat créé + clés API configurées
//   4. Produits d'abonnement créés dans Play Console + App Store Connect
//   5. Produits importés dans RevenueCat + Entitlement "premium" configuré
// ─────────────────────────────────────────────────────────────────────────────

import { Capacitor } from "@capacitor/core";

// Clés API RevenueCat.
//
// ⚠️ ACTUELLEMENT EN MODE TEST (Test Store RevenueCat).
// La clé "test_..." permet de valider le branchement du SDK et le flux d'achat
// SANS vrai paiement, mais elle NE fonctionne PAS avec les produits Play Store.
//
// → Quand les abonnements seront créés dans Play Console et importés dans
//   RevenueCat, remplacer `android` par la vraie clé publique (préfixe "goog_")
//   depuis : Dashboard RC → Apps → Isekaid (Play Store) → Public API Key.
export const RC_KEYS = {
  android: "test_CCsnkiRPiuDMsqymrIIVhSajRjp",  // TEST — à remplacer par "goog_..."
  ios:     "test_CCsnkiRPiuDMsqymrIIVhSajRjp",  // TEST — à remplacer par "appl_..."
};

// Passe à false quand l'app part en production : les logs RevenueCat sont
// verbeux et n'ont d'intérêt que pendant le développement.
const RC_DEBUG = true;

// IDs des produits — doivent correspondre exactement à Play Console / App Store Connect
// ET à la configuration dans RevenueCat (Entitlement → Products).
export const PRODUCT_IDS = {
  monthly: "isekaid_premium_monthly",
  annual:  "isekaid_premium_annual",
};

// Nom de l'Entitlement RevenueCat (défini dans ton dashboard RC).
const ENTITLEMENT_ID = "premium";

// Instance du plugin (chargée dynamiquement pour éviter les erreurs hors natif).
let Purchases = null;
let initialized = false;

// ── Détection plateforme ─────────────────────────────────────────────────────
export function isNativePlatform(){
  return Capacitor.isNativePlatform();
}

// ── Initialisation (à appeler au lancement de l'app) ────────────────────────
// Configure RevenueCat avec la bonne clé selon la plateforme.
export async function initRevenueCat(userId = null){
  if(!isNativePlatform()) return false;
  if(initialized) return true;
  try {
    const mod = await import("@revenuecat/purchases-capacitor");
    Purchases = mod.Purchases;
    const LOG_LEVEL = mod.LOG_LEVEL;
    // Logs détaillés en dev : indispensable pour diagnostiquer les erreurs
    // d'offerings / de produits non trouvés lors des premiers tests.
    if(RC_DEBUG && LOG_LEVEL){
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    }
    const platform = Capacitor.getPlatform();
    const apiKey = platform === "ios" ? RC_KEYS.ios : RC_KEYS.android;
    await Purchases.configure({ apiKey });
    // Si l'utilisateur est connecté (Supabase), on identifie chez RevenueCat.
    // Ça permet de restaurer les achats sur plusieurs appareils.
    if(userId){
      await Purchases.logIn({ appUserID: userId });
    }
    initialized = true;
    console.log("[RC] RevenueCat initialisé sur", platform);
    return true;
  } catch(e){
    console.warn("[RC] Initialisation échouée:", e?.message);
    return false;
  }
}

// ── Vérifier si l'utilisateur est Premium ───────────────────────────────────
// Renvoie { active:bool, plan:"monthly"|"annual"|null, expiry:Date|null }
export async function checkPremiumStatus(){
  if(!isNativePlatform() || !initialized) return { active:false, plan:null };
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    if(!entitlement){
      return { active:false, plan:null };
    }
    // Détermine le plan actif selon le productIdentifier
    const productId = entitlement.productIdentifier;
    const plan = Object.keys(PRODUCT_IDS).find(k => PRODUCT_IDS[k] === productId) || null;
    return {
      active: true,
      plan,
      expiry: entitlement.expirationDate ? new Date(entitlement.expirationDate) : null,
    };
  } catch(e){
    console.warn("[RC] checkPremiumStatus échoué:", e?.message);
    return { active:false, plan:null };
  }
}

// ── Récupérer les offres disponibles (avec vrais prix localisés) ─────────────
// Renvoie { monthly:{priceLabel,productId,...}, annual:{...} } ou null.
export async function getOfferings(){
  if(!isNativePlatform() || !initialized) return null;
  try {
    const { current } = await Purchases.getOfferings();
    if(!current) return null;
    const out = {};
    for(const pkg of current.availablePackages){
      const product = pkg.product;
      // Identifie le plan depuis l'ID du produit
      const key = Object.keys(PRODUCT_IDS).find(k => PRODUCT_IDS[k] === product.identifier);
      if(key){
        out[key] = {
          packageType: pkg.packageType,
          productId: product.identifier,
          priceLabel: product.priceString,   // ex. "3,99 €" (localisé automatiquement)
          price: product.price,
          currencyCode: product.currencyCode,
          title: product.title,
          description: product.description,
        };
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch(e){
    console.warn("[RC] getOfferings échoué:", e?.message);
    return null;
  }
}

// ── Lancer l'achat ───────────────────────────────────────────────────────────
// planKey : "monthly" | "annual"
// Renvoie { ok:true, plan } ou { ok:false, reason }
export async function purchasePlan(planKey){
  if(!isNativePlatform()) return { ok:false, reason:"unavailable" };
  if(!initialized) return { ok:false, reason:"not_initialized" };
  try {
    // On doit passer par les Offerings pour obtenir le Package RevenueCat.
    const { current } = await Purchases.getOfferings();
    if(!current) return { ok:false, reason:"no_offerings" };
    const pkg = current.availablePackages.find(
      p => p.product.identifier === PRODUCT_IDS[planKey]
    );
    if(!pkg) return { ok:false, reason:"product_not_found" };
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    const active = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    return active
      ? { ok:true, plan:planKey }
      : { ok:false, reason:"entitlement_not_active" };
  } catch(e){
    if(e?.code === "PURCHASE_CANCELLED") return { ok:false, reason:"cancelled" };
    console.warn("[RC] purchasePlan échoué:", e?.message, e?.code);
    return { ok:false, reason:"error", message:e?.message };
  }
}

// ── Restaurer les achats (bouton "Restaurer" dans l'app) ─────────────────────
// Indispensable sur iOS (règle App Store) et pratique sur Android.
// Renvoie { active:bool, plan }
export async function restorePurchases(){
  if(!isNativePlatform() || !initialized) return { active:false, plan:null };
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    if(!entitlement) return { active:false, plan:null };
    const productId = entitlement.productIdentifier;
    const plan = Object.keys(PRODUCT_IDS).find(k => PRODUCT_IDS[k] === productId) || null;
    return { active:true, plan };
  } catch(e){
    console.warn("[RC] restorePurchases échoué:", e?.message);
    return { active:false, plan:null };
  }
}

// ── Identifier l'utilisateur (après connexion Supabase) ─────────────────────
// Permet à RevenueCat de lier les achats au compte, pas à l'appareil.
export async function identifyUser(supabaseUserId){
  if(!isNativePlatform() || !initialized || !supabaseUserId) return;
  try {
    await Purchases.logIn({ appUserID: supabaseUserId });
  } catch(e){
    console.warn("[RC] identifyUser échoué:", e?.message);
  }
}

// ── Déconnecter l'utilisateur (à la déconnexion Supabase) ───────────────────
export async function logoutRevenueCat(){
  if(!isNativePlatform() || !initialized) return;
  try {
    await Purchases.logOut();
  } catch(e){
    console.warn("[RC] logoutRevenueCat échoué:", e?.message);
  }
}