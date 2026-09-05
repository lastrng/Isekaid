import test from "node:test";
import assert from "node:assert/strict";
import { documentFileKey, validateDocumentFile, MAX_DOCUMENT_BYTES, loadDocumentFile } from "../src/features/travel/documentFiles.js";
function file(bytes, name = "document.pdf") { const blob = new Blob([bytes]); blob.name = name; return blob; }
test("vérifie la signature du fichier sans faire confiance à son extension", async () => {
  assert.equal((await validateDocumentFile(file("%PDF-1.7\n"))).type, "application/pdf");
  assert.equal((await validateDocumentFile(file(new Uint8Array([255,216,255,224])))).type, "image/jpeg");
  assert.equal((await validateDocumentFile(file(new Uint8Array([137,80,78,71,13,10,26,10])))).type, "image/png");
  await assert.rejects(validateDocumentFile(file("<script>alert(1)</script>", "ticket.pdf")), /Formats/);
  await assert.rejects(validateDocumentFile(file("")), /non vide/);
  await assert.rejects(validateDocumentFile({ size: MAX_DOCUMENT_BYTES + 1 }), /10 Mo/);
});
test("sépare les fichiers par compte, voyage et document sans ambiguïté", () => {
  assert.notDeepEqual(documentFileKey("a", "b", "c"), documentFileKey("b", "b", "c"));
  assert.notDeepEqual(documentFileKey("a/b", "c", "d"), documentFileKey("a", "b/c", "d"));
  assert.throws(() => documentFileKey("", "b", "c"));
});
test("un stockage indisponible donne une erreur explicite", async () => {
  await assert.rejects(loadDocumentFile("owner", "trip", "doc"), /indisponible/);
});
