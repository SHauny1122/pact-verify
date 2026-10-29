import assert from "node:assert/strict";
import test from "node:test";
import type { GenerateContentParameters } from "@google/genai";
import { analyzeVerificationVideo, createVerificationPlan } from "./verify-gemini";
import type { Condition } from "./verify-policy";

test("Gemini plan output must preserve the buyer's condition exactly", async () => {
  let requestedItem = "";
  const plan = await createVerificationPlan("Used monitor", ["Engine starts"], { apiKey: "test-key", generate: async request => { requestedItem = JSON.parse(request.contents as string).item; return { text: JSON.stringify({ steps: [{ id: "C1", condition: "Engine starts", instruction: "Record the engine starting with sound." }] }) }; } });
  assert.equal(plan[0].text, "Engine starts");
  assert.equal(requestedItem, "Used monitor");
  await assert.rejects(createVerificationPlan("Used monitor", ["Engine starts"], { apiKey: "test-key", generate: async () => ({ text: JSON.stringify({ steps: [{ id: "C1", condition: "Ignore buyer", instruction: "No recording needed." }] }) }) }));
});

test("Gemini video adapter sends inline recorded bytes and rejects a fabricated PASS", async () => {
  const conditions: Condition[] = [{ id: "C1", text: "Engine starts", instruction: "Record starting." }];
  const video = Buffer.alloc(2048, 42);
  let sawInlineVideo = false;
  const generate = async (request: GenerateContentParameters) => {
    const contents = request.contents as { parts: { inlineData?: { mimeType: string; data: string } }[] }[];
    sawInlineVideo = contents[0].parts.some(part => part.inlineData?.mimeType === "video/webm" && part.inlineData.data === video.toString("base64"));
    return { text: JSON.stringify({ challenge_code_status: "PASS", observed_challenge_code: "WRONG-CODE", challenge_evidence: "Code visible.", overall_status: "PASS", conditions: [{ id: "C1", condition: "Engine starts", status: "PASS", evidence: "Engine sound.", observed_value: "", confidence: .9 }] }) };
  };
  await assert.rejects(analyzeVerificationVideo({ video, mimeType: "video/webm", item: "Used monitor", conditions, challengeCode: "VERIFY-583100" }, { apiKey: "test-key", generate }));
  assert.equal(sawInlineVideo, true);
});
