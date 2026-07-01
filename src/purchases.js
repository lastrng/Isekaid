import { Capacitor } from "@capacitor/core";

export const PRODUCT_IDS = { monthly: "isekaid_premium_monthly", annual: "isekaid_premium_annual" };

export function isNativePlatform(){ return Capacitor.isNativePlatform(); }
export async function initRevenueCat(){ return false; }
export async function checkPremiumStatus(){ return { active:false, plan:null }; }
export async function getOfferings(){ return null; }
export async function purchasePlan(){ return { ok:false, reason:"unavailable" }; }
export async function restorePurchases(){ return { active:false, plan:null }; }
export async function identifyUser(){}
export async function logoutRevenueCat(){}
