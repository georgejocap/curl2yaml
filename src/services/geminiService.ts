const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const CACHE_KEY = 'oas_gemini_model';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FALLBACK_MODEL = 'gemini-2.0-flash';

const SYSTEM_INSTRUCTION = `You are an OpenAPI 3.0.0 YAML generator. Convert the given cURL command into a valid OpenAPI 3.0.0 YAML definition optimized for ReadMe.com.

STRICT RULE: Every field in the output MUST come directly from the cURL command. Do NOT invent, assume, or add anything that is not explicitly present in the cURL. The only exceptions are the two items listed below under "You MAY generate".

---

YOU MAY GENERATE (and only these):
- info.title: A short, human-readable name derived from the HTTP method + URL path (e.g. "Get Customer Points")
- info.version: Always "1.0.0"
- A one-line operation summary derived from the HTTP method + path
- Response description text (e.g. "Successful response") — but NO response body, schema, or example

---

FIXED SERVERS BLOCK (always output this exactly, do not change it):
servers:
  - url: '{Host}'
    variables:
      Host:
        enum:
          - https://eu.intouch.capillarytech.com
          - https://intouch.capillary.co.in
          - https://apac2.intouch.capillarytech.com
          - https://sgcrm.cc.capillarytech.com
          - http://intouch.capillarytech.cn.com
          - https://north-america.intouch.capillarytech.com
        default: https://eu.intouch.capillarytech.com

---

PARAMETERS: Only include parameters that are literally present in the cURL:
- Query parameters: only those in the URL after "?"
- Headers: only those passed with -H or --header (use exact names and values)
- Request body: only fields actually present in the --data or --data-raw payload

DO NOT add any parameter, field, or property that is not in the cURL.

---

AUTHENTICATION:
- If the cURL has "Authorization: Basic [token]", you MUST remove the last 4 characters of [token] before including it. This is mandatory.
- Include it as a header parameter with the truncated value as the example.

---

RESPONSES:
- Include only ONE response entry: "200" for GET/PUT/PATCH/DELETE, "201" for POST.
- The response entry must have ONLY a "description" field. Nothing else.
- NEVER include content, schema, example, or any response body.

---

OUTPUT FORMAT:
1. Output the YAML inside \`\`\`yaml ... \`\`\` code block.
2. Then output "Analysis Summary" with exactly three bullet points:
   - Summary: [operation title]
   - Method: [HTTP METHOD]
   - Path: [path only, no host]

Use 2-space indentation. Output no other text.`;

/**
 * Calls the Gemini ListModels API and returns the latest free Flash model name.
 * Result is cached in localStorage for 24 hours so it only runs once per day.
 */
const getLatestFreeModel = async (apiKey: string): Promise<string> => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const cachedAt = localStorage.getItem(`${CACHE_KEY}_ts`);
    if (cached && cachedAt && Date.now() - parseInt(cachedAt) < CACHE_TTL_MS) {
      return cached;
    }

    const res = await fetch(`${BASE_URL}/models?key=${apiKey}`);
    if (!res.ok) return FALLBACK_MODEL;

    const data = await res.json();
    const models: any[] = data.models ?? [];

    // Keep only Flash models that support generateContent and are not preview/experimental
    const flashModels = models
      .filter(
        (m) =>
          m.name.toLowerCase().includes('flash') &&
          !m.name.toLowerCase().includes('thinking') &&
          (m.supportedGenerationMethods ?? []).includes('generateContent')
      )
      .map((m) => m.name.replace('models/', ''))
      // Sort descending — "gemini-2.0-flash" > "gemini-1.5-flash" lexicographically
      .sort((a, b) => b.localeCompare(a));

    const best = flashModels[0] ?? FALLBACK_MODEL;
    localStorage.setItem(CACHE_KEY, best);
    localStorage.setItem(`${CACHE_KEY}_ts`, Date.now().toString());
    return best;
  } catch {
    return FALLBACK_MODEL;
  }
};

export const convertCurlToOpenAPI = async (
  curlCommand: string
): Promise<{ yaml: string; details: string; modelUsed: string }> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

  // Clean malformed double-protocol URLs
  const cleanedCurl = curlCommand.replace(/(https?:\/\/)(?:https?:\/\/|https?\/)/gi, '$1');

  const model = await getLatestFreeModel(apiKey);
  const endpoint = `${BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ parts: [{ text: cleanedCurl }] }],
      generationConfig: { temperature: 0.1 },
    }),
  });

  if (!res.ok) {
    // If this model fails, clear the cache so next attempt re-discovers
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(`${CACHE_KEY}_ts`);
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const fullText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  const yamlMatch = fullText.match(/```yaml\n([\s\S]*?)```/);
  const yaml = yamlMatch ? yamlMatch[1].trim() : '';

  if (!yaml) {
    throw new Error(
      'Could not extract YAML from the AI response. Please check your cURL syntax and try again.'
    );
  }

  const detailsPart = fullText.split('```yaml')[1]?.split('```')[1]?.trim() ?? '';

  return { yaml, details: detailsPart, modelUsed: model };
};
