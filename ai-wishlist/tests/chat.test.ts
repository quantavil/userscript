import { beforeEach, afterEach, expect, test, vi } from "vite-plus/test";
import { ChatSession, buildGenerationRequest, verifyProvider } from "../src/core/chat";
import { DEFAULT_SETTINGS } from "../src/core/settings";
const settings = { ...DEFAULT_SETTINGS, apiKey: "secret" };
let requests: Parameters<typeof GM_xmlhttpRequest>[0][];
beforeEach(() => {
  requests = [];
  vi.stubGlobal("GM_xmlhttpRequest", (opts: Parameters<typeof GM_xmlhttpRequest>[0]) => {
    requests.push(opts);
    return { abort: vi.fn() };
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const reply = (text: string, status = 200) =>
  requests[requests.length - 1]!.onload!({ status, responseText: text, response: null });
const valid = JSON.stringify({
  candidates: [
    {
      content: {
        parts: [{ text: "private", thought: true }, { text: "Hello " }, { text: "**world**" }],
      },
    },
  ],
});
test("uses exact Gemini endpoint, header key and normalized slash", () => {
  const request = buildGenerationRequest(
    { ...settings, baseUrl: settings.baseUrl + "///" },
    [],
    [],
    "Hi",
  );
  expect(request.url).toBe(`${settings.baseUrl}/models/gemini-3.5-flash-lite:generateContent`);
  expect(request.headers["x-goog-api-key"]).toBe("secret");
  expect(request.url).not.toContain("secret");
  const openai = buildGenerationRequest(
    { ...settings, baseUrl: "https://googleapis.com.evil.test/v1/" },
    [],
    [],
    "Hi",
  );
  expect(openai.url).toBe("https://googleapis.com.evil.test/v1/chat/completions");
  expect(openai.headers.Authorization).toBe("Bearer secret");
});
test("prevents duplicate submission and combines non-thought raw text parts", async () => {
  const session = new ChatSession();
  const task = session.send("Hi", settings, []);
  await session.send("Duplicate", settings, []);
  expect(requests).toHaveLength(1);
  reply(valid);
  await task;
  expect(session.snapshot().messages.map((m) => m.text)).toEqual(["Hi", "Hello **world**"]);
  expect(session.snapshot().busy).toBe(false);
});
test.each(["stop", "clear", "invalidate"] as const)(
  "ignores late result after %s",
  async (action) => {
    const session = new ChatSession();
    const task = session.send("Hi", settings, []);
    session[action]();
    reply(valid);
    await task;
    expect(session.snapshot().messages.some((m) => m.text === "Hello **world**")).toBe(false);
    expect(session.snapshot().busy).toBe(false);
    if (action === "clear") expect(session.snapshot().messages).toHaveLength(0);
  },
);
test.each([
  ["not json", "malformed"],
  [JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } }), "blocked"],
  [JSON.stringify({ candidates: [{ finishReason: "SAFETY" }] }), "blocked"],
  [
    JSON.stringify({ candidates: [{ content: { parts: [{ thought: true, text: "hidden" }] } }] }),
    "no response text",
  ],
])("reports bad response %s without committing a completed exchange", async (body, error) => {
  const session = new ChatSession();
  const task = session.send("Hi", settings, []);
  reply(body);
  await task;
  expect(session.snapshot().error?.toLowerCase()).toContain(error);
  expect(session.completed).toHaveLength(0);
});
test("uses a 60-second chat timeout without retrying", async () => {
  vi.useFakeTimers();
  const session = new ChatSession();
  const task = session.send("Hi", settings, []);
  await vi.advanceTimersByTimeAsync(60_000);
  await task;
  expect(session.snapshot().error).toContain("timed out");
  expect(requests).toHaveLength(1);
});
test("bounds outgoing history and product context with feedback", () => {
  const history = Array.from({ length: 25 }, (_, i) => ({
    query: `query${i}`,
    reply: `reply${i}`,
  }));
  const product = {
    id: "x",
    title: "x".repeat(110_000),
    price: 2,
    url: "https://www.amazon.in/dp/B012345678",
    imageUrl: "",
    platform: "Amazon",
  };
  const request = buildGenerationRequest(settings, history, [product], "new");
  const data = JSON.parse(request.data);
  expect(data.contents).toHaveLength(41);
  expect(data.contents[0].parts[0].text).toBe("query5");
  expect(request.truncated).toBe(true);
  expect(data.systemInstruction.parts[0].text.length).toBeLessThan(101_000);
  expect(data.systemInstruction.parts[0].text).toContain("untrusted");
});
test("verifies provider connectivity separately from generation with 15 second timeout", async () => {
  const task = verifyProvider(settings);
  expect(requests[0]!.method).toBe("GET");
  expect(requests[0]!.timeout).toBe(15_000);
  reply(JSON.stringify({ models: [] }));
  await expect(task).resolves.toContain("generation not tested");
});
