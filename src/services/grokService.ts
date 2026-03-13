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

export const convertCurlToOpenAPI = async (
  curlCommand: string
): Promise<{ yaml: string; details: string }> => {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error('XAI_API_KEY is not configured.');
  }

  // Clean malformed double-protocol URLs (e.g. https://https//example.com)
  const cleanedCurl = curlCommand.replace(/(https?:\/\/)(?:https?:\/\/|https?\/)/gi, '$1');

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: cleanedCurl },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Grok API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const fullText: string = data.choices?.[0]?.message?.content ?? '';

  const yamlMatch = fullText.match(/```yaml\n([\s\S]*?)```/);
  const yaml = yamlMatch ? yamlMatch[1].trim() : '';

  if (!yaml) {
    throw new Error('Could not extract YAML from the response. Please check your cURL syntax and try again.');
  }

  const detailsPart = fullText.split('```yaml')[1]?.split('```')[1]?.trim() ?? '';

  return { yaml, details: detailsPart };
};
