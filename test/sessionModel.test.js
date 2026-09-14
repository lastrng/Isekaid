import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSessionResponse } from "../src/services/auth/sessionModel.js";

test("distingue une absence normale de session d'une vérification réseau échouée",()=>{
  assert.deepEqual(normalizeSessionResponse({data:{session:null},error:null}),{session:null,error:null});
  const error=new Error("network_unavailable");
  assert.deepEqual(normalizeSessionResponse({data:{session:null},error}),{session:null,error});
});

test("conserve la session restaurée par Supabase",()=>{
  const session={access_token:"token",user:{id:"user-1"}};
  assert.deepEqual(normalizeSessionResponse({data:{session},error:null}),{session,error:null});
});
