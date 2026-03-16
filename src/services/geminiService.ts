const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const CACHE_KEY = 'oas_gemini_model';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FALLBACK_MODEL = 'gemini-2.0-flash';

const SYSTEM_INSTRUCTION = `You are an OpenAPI 3.0.0 YAML generator. Convert the given cURL command into a strictly valid OpenAPI 3.0.0 YAML spec optimised for ReadMe.com.

Every field in the output MUST come directly from the cURL. Do NOT invent, guess, or add anything not explicitly present. The only things you may derive are: info.title (from method + path), info.version ("1.0.0"), operation summary, and response descriptions.

━━━ SERVERS (output exactly, never change) ━━━
servers:
  - url: https://eu.intouch.capillarytech.com
    description: EU
  - url: https://intouch.capillary.co.in
    description: India
  - url: https://apac2.intouch.capillarytech.com
    description: APAC2
  - url: https://sgcrm.cc.capillarytech.com
    description: SG
  - url: http://intouch.capillarytech.cn.com
    description: CN
  - url: https://north-america.intouch.capillarytech.com
    description: US

━━━ PARAMETERS ━━━
CRITICAL: NEVER place a "headers:" property directly on an operation object. It is NOT valid OpenAPI 3.0 and will fail ReadMe validation.

- Query parameters (from URL ?key=value): add to "parameters" array with "in: query"
- Custom request headers (from -H / --header): add to "parameters" array with "in: header"
- SKIP these reserved headers — do NOT put them in parameters at all: Accept, Content-Type, Authorization
  (Content-Type is expressed via the requestBody media type key; Authorization via securitySchemes)

Each non-reserved header/query parameter must follow this exact structure:
  - name: <exact name from cURL>
    in: header   # or: query
    required: true
    schema:
      type: string
    example: "<exact value from cURL>"

━━━ REQUEST BODY ━━━
- Use "requestBody" directly on the operation (never inside "parameters")
- Detect content type from Content-Type header in cURL (default: application/json)
- Include ONLY the fields literally present in --data / --data-raw / --data-urlencode
- Infer each field's type from its actual value (string, integer, boolean, array, object)
- Structure:
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              <key>:
                type: <inferred type>
                example: <actual value from cURL>

━━━ AUTHENTICATION ━━━
If the cURL has "Authorization: Basic [token]":
  1. Remove the last 4 characters of [token] (truncate for security)
  2. Add to components.securitySchemes:
       components:
         securitySchemes:
           basicAuth:
             type: http
             scheme: basic
  3. Add to the operation:
       security:
         - basicAuth: []
  4. Also document it as a header parameter showing the truncated value:
       - name: Authorization
         in: header
         required: true
         schema:
           type: string
         example: "Basic <truncated_token>"

━━━ RESPONSES ━━━
- ONE response only: "200" for GET/PUT/PATCH/DELETE, "201" for POST
- ONLY a "description" field — NO content, schema, or example body
    responses:
      '200':
        description: Successful response

━━━ OPERATION OBJECT — ALLOWED PROPERTIES ONLY ━━━
An operation may only have these properties: tags, summary, description, operationId, parameters, requestBody, responses, security, deprecated, servers, callbacks, and x-* extensions.
NEVER add any other top-level property to an operation (no "headers:", no "host:", no "baseUrl:", no "consumes:", no "produces:").
operationId: camelCase, unique, under 30 characters, derived from method + path (e.g. "getCustomerPoints").

━━━ OUTPUT FORMAT ━━━
1. Output the complete YAML inside a \`\`\`yaml ... \`\`\` code block
2. Follow with "Analysis Summary" containing exactly three bullet points:
   - Summary: [operation title]
   - Method: [HTTP METHOD]
   - Path: [path only, no host]

Use 2-space indentation throughout. Output no other text.`;

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

    // Keep only Flash models that support generateContent and are not thinking variants
    const flashModels = models
      .filter(
        (m) =>
          m.name.toLowerCase().includes('flash') &&
          !m.name.toLowerCase().includes('thinking') &&
          (m.supportedGenerationMethods ?? []).includes('generateContent')
      )
      .map((m) => m.name.replace('models/', ''))
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
