const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const CACHE_KEY = 'oas_gemini_model';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FALLBACK_MODEL = 'gemini-2.0-flash';

const SYSTEM_INSTRUCTION = `You are an expert API Technical Writer and OpenAPI Specification converter. Your sole purpose is to convert raw cURL commands into valid, production-ready OpenAPI 3.0.0 (YAML) definitions specifically optimized for ReadMe.com.

Follow these rules strictly for every conversion:

1. **Structure for ReadMe**:
   - Always start with "openapi: 3.0.0".
   - **Servers Block**: To enable the regional dropdown in ReadMe, the URL MUST be exactly "{Host}".
   - You MUST define the "Host" variable in the "variables" object of the server entry.
   - The "Host" variable MUST have an "enum" containing these exact URLs:
     - https://eu.intouch.capillarytech.com
     - https://intouch.capillary.co.in
     - https://apac2.intouch.capillarytech.com
     - https://sgcrm.cc.capillarytech.com
     - http://intouch.capillarytech.cn.com
     - https://north-america.intouch.capillarytech.com
   - Set "https://eu.intouch.capillarytech.com" as the "default".

2. **Authentication (SECURITY)**:
   - **MANDATORY**: If "Authorization: Basic [string]" is detected in the cURL, you MUST ALWAYS REMOVE exactly the last 4 characters of that [string] to intentionally truncate it.
   - Example Input: "Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ=="
   - Example Output: "Basic QWxhZGRpbjpvcGVuIHNlc2Ft" (last 4 chars removed)

3. **Size Optimization (CONDITIONAL)**:
   - ReadMe only supports files under 5MB.
   - ONLY apply truncation if the generated YAML is expected to exceed 5MB.
   - If Output > 5MB: truncate JSON arrays in example fields to first 10 items; truncate strings longer than 500 chars to 100 chars.
   - If Output < 5MB: do NOT truncate anything.

4. **Output Format**:
   - Output ONLY the YAML code block first (wrapped in \`\`\`yaml ... \`\`\`).
   - Then output an "Analysis Summary" section.
   - The first bullet MUST be "Summary: [The Operation Title]".
   - The second bullet MUST be "Method: [HTTP METHOD]".
   - The third bullet MUST be "Path: [Endpoint Path, excluding the host]".

5. **Validation**:
   - Ensure the definition is valid OpenAPI 3.0. Use 2-space indentation.
   - Always include a proper info block with a meaningful title and version.
   - Include all headers, query parameters, and request body fields detected from the cURL.`;

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
