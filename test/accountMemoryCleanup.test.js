import assert from "node:assert/strict";
import test from "node:test";
import { removeAccountMemoryPhotos } from "../supabase/functions/delete-account/memory-cleanup.js";

test("supprime tous les lots de photos du compte", async () => {
  let files = Array.from({ length: 1001 }, (_, i) => ({ name: `${i}.jpg` }));
  const removed = [];
  const storage = { from: name => {
    assert.equal(name, "memory-photos");
    return {
      list: async (userId, { limit }) => {
        assert.equal(userId, "owner");
        return { data: files.slice(0, limit), error: null };
      },
      remove: async paths => {
        assert.ok(paths.every(path => path.startsWith("owner/")));
        removed.push(...paths);
        files = files.filter(file => !paths.includes(`owner/${file.name}`));
        return { error: null };
      },
    };
  } };
  await removeAccountMemoryPhotos(storage, "owner");
  assert.equal(removed.length, 1001);
  assert.equal(files.length, 0);
});

for (const operation of ["list", "remove"]) {
  test(`interrompt le nettoyage si ${operation} échoue`, async () => {
    const failure = new Error("storage_unavailable");
    const bucket = {
      list: async () => ({ data: [{ name: "photo.jpg" }], error: null }),
      remove: async () => ({ error: null }),
    };
    bucket[operation] = async () => ({ error: failure });
    await assert.rejects(removeAccountMemoryPhotos({ from: () => bucket }, "owner"), failure);
  });
}
