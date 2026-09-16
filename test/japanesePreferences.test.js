import test from "node:test";
import assert from "node:assert/strict";
import { effectiveJapaneseScript, loadShowRomaji, saveShowRomaji } from "../src/lib/japanesePreferences.js";
import { activateAccountStorage } from "../src/services/auth/accountStorage.js";
import { mergeProgress } from "../src/services/sync/progressMerge.js";

function storage() {
  const data=new Map();
  return {get length(){return data.size;},key:index=>[...data.keys()][index],getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}
test("romaji activé par défaut et choix explicite conservé",()=>{
  const local=storage();
  assert.equal(loadShowRomaji(local),true);
  saveShowRomaji(false,local);
  assert.equal(loadShowRomaji(local),false);
  saveShowRomaji(true,local);
  assert.equal(loadShowRomaji(local),true);
  assert.equal(loadShowRomaji({getItem(){throw Error("blocked");}}),true);
});
test("le masquage prend aussi effet en mode transcription principale",()=>{
  assert.equal(effectiveJapaneseScript("romaji",false),"kana");
  assert.equal(effectiveJapaneseScript("romaji",true),"romaji");
  assert.equal(effectiveJapaneseScript("kanji",false),"kanji");
  assert.equal(effectiveJapaneseScript("invalid"),"kana");
});
test("la préférence romaji reste isolée entre comptes",()=>{
  const local=storage();
  activateAccountStorage("A",local);
  saveShowRomaji(false,local);
  activateAccountStorage("B",local);
  assert.equal(loadShowRomaji(local),true);
  activateAccountStorage("A",local);
  assert.equal(loadShowRomaji(local),false);
});
test("la synchronisation conserve false et les autres préférences",()=>{
  const base={settings:{showRomaji:true,script:"kanji"}};
  const remote={settings:{showRomaji:false,script:"kanji",dark:true}};
  const merged=mergeProgress(base,base,remote).snapshot;
  assert.equal(merged.settings.showRomaji,false);
  assert.equal(merged.settings.script,"kanji");
  assert.equal(merged.settings.dark,true);
});
