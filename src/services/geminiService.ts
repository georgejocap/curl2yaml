const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const FALLBACK_MODEL = 'gemini-2.0-flash';
const CACHE_KEY = 'oas_gemini_model';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Returns the newest free Flash model, cached 24 h to avoid repeated list calls. */
const getModel = async (apiKey: string): Promise<string> => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const ts = localStorage.getItem(`${CACHE_KEY}_ts`);
    if (cached && ts && Date.now() - parseInt(ts) < CACHE_TTL_MS) return cached;

    const res = await fetch(`${BASE_URL}/models?key=${apiKey}`);
    if (!res.ok) return FALLBACK_MODEL;
    const { models = [] } = await res.json();
    const best = (models as any[])
      .filter(m =>
        m.name.toLowerCase().includes('flash') &&
        !m.name.toLowerCase().includes('thinking') &&
        (m.supportedGenerationMethods ?? []).includes('generateContent')
      )
      .map(m => m.name.replace('models/', ''))
      .sort((a: string, b: string) => b.localeCompare(a))[0] ?? FALLBACK_MODEL;

    localStorage.setItem(CACHE_KEY, best);
    localStorage.setItem(`${CACHE_KEY}_ts`, String(Date.now()));
    return best;
  } catch {
    return FALLBACK_MODEL;
  }
};

const SYSTEM_INSTRUCTION = `You are an OpenAPI 3.0.0 YAML generator. Convert the given cURL command into a strictly valid OpenAPI 3.0.0 YAML spec optimised for ReadMe.com.

Every field in the output MUST come directly from the cURL. Do NOT invent, guess, or add anything not explicitly present. The only things you may derive are: info.title (from method + path), info.version ("1.0.0"), operation summary, and response descriptions.

━━━ SERVERS (output exactly, never change) ━━━
servers:
  - url: '{Host}'
    variables:
      Host:
        default: '{Host}'

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
- NEVER use "type: any" — it is NOT a valid OpenAPI 3.0 type and will fail schema validation. If a value is null or the type is unknown, use "type: string"
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

━━━ REQUIRED FIELDS (user-controlled, not AI judgment) ━━━
The user message may end with a line like:
  [USER-REQUIRED: paramName1 (header), paramName2 (body)]
If present:
- Those exact parameter names MUST have required: true
- Every other parameter MUST have required: false
- You MUST NOT use your own judgment to decide what is required — only follow this list
If no [USER-REQUIRED: ...] line is present, set ALL parameters to required: false.

━━━ OUTPUT FORMAT ━━━
1. Output the complete YAML inside a \`\`\`yaml ... \`\`\` code block
2. Follow with "Analysis Summary" containing exactly three bullet points:
   - Summary: [operation title]
   - Method: [HTTP METHOD]
   - Path: [path only, no host]

Use 2-space indentation throughout. Output no other text.`;


export const convertCurlToOpenAPI = async (
  curlCommand: string,
  requiredParams: Array<{ name: string; location: string }> = []
): Promise<{ yaml: string; details: string; modelUsed: string }> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

  // Clean malformed double-protocol URLs
  const cleanedCurl = curlCommand.replace(/(https?:\/\/)(?:https?:\/\/|https?\/)/gi, '$1');

  let userMessage = cleanedCurl;
  if (requiredParams.length > 0) {
    const list = requiredParams.map(p => `${p.name} (${p.location})`).join(', ');
    userMessage += `\n\n[USER-REQUIRED: ${list}]`;
  }

  const model = await getModel(apiKey);
  const endpoint = `${BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { temperature: 0.1 },
    }),
  });

  if (!res.ok) {
    // Clear cache so next attempt re-discovers a working model
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
