import test from "node:test";
import assert from "node:assert/strict";
import { getExpressionExplanation } from "../src/features/learn/expressionExplanation.js";

test("une explication éditoriale existante reste prioritaire et brève",()=>{
  assert.equal(getExpressionExplanation({contexte:"À dire avant de manger. Cette seconde phrase ne doit pas être nécessaire."}),"À dire avant de manger.");
});

test("les formules usuelles reçoivent une nuance d’emploi",()=>{
  assert.match(getExpressionExplanation({jp:"メニューをください"}),/demande polie/);
  assert.match(getExpressionExplanation({jp:"ありがとうございます"}),/inconnus/);
  assert.match(getExpressionExplanation({jp:"これはいくらですか？"}),/question polie/);
});
