import yaml from 'js-yaml';
import type { CurlParameter, UserDefinedResponse } from '../types';

export const patchYaml = (
  rawYaml: string,
  params: CurlParameter[],
  responses: UserDefinedResponse[]
): string => {
  const validResponses = responses.filter((r) => r.statusCode);

  // If the user has seen NO params and defined NO responses, preserve AI YAML as-is
  if (params.length === 0 && validResponses.length === 0) {
    return rawYaml;
  }

  let spec: any;
  try {
    spec = yaml.load(rawYaml);
  } catch {
    return rawYaml;
  }

  if (!spec || typeof spec !== 'object') return rawYaml;

  // Find first path + method
  const paths = spec.paths ?? {};
  const pathKey = Object.keys(paths)[0];
  if (!pathKey) return rawYaml;

  const pathItem = paths[pathKey];
  const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
  const methodKey = Object.keys(pathItem).find((k) => httpMethods.includes(k.toLowerCase()));
  if (!methodKey) return rawYaml;

  const operation = pathItem[methodKey];

  // ── 1. Header / query params: checkbox is the ONLY truth ──────────────────
  // If the user's params table has this param → set required exactly to their checkbox
  // If not in the table → leave whatever the AI set
  const headerQueryParams = params.filter((p) => p.location === 'header' || p.location === 'query');
  if (headerQueryParams.length > 0 && operation.parameters && Array.isArray(operation.parameters)) {
    operation.parameters = operation.parameters.map((opParam: any) => {
      const userParam = headerQueryParams.find(
        (p) => p.name.toLowerCase() === (opParam.name ?? '').toLowerCase()
      );
      if (userParam !== undefined) {
        opParam.required = userParam.isMandatory === true;
      }
      return opParam;
    });
  }

  // ── 2. Body params: build schema.required from ONLY the checked fields ─────
  const topLevelBodyParams = params.filter(
    (p) =>
      p.location === 'body' &&
      p.name !== '$root' &&
      !p.name.includes('.') &&
      !p.name.includes('[]')
  );
  if (topLevelBodyParams.length > 0 && operation.requestBody?.content) {
    for (const ck of Object.keys(operation.requestBody.content)) {
      const schema = operation.requestBody.content[ck]?.schema;
      if (!schema) continue;

      // Replace schema.required entirely with what the user checked
      const mandatoryNames = topLevelBodyParams
        .filter((p) => p.isMandatory === true)
        .map((p) => p.name);

      if (mandatoryNames.length > 0) {
        schema.required = mandatoryNames;
      } else {
        delete schema.required; // nothing checked → no required array
      }
    }
  }

  // ── 3. Merge user-defined responses ───────────────────────────────────────
  if (validResponses.length > 0) {
    if (!operation.responses) operation.responses = {};
    for (const res of validResponses) {
      const responseObj: any = {
        description: res.description || res.statusCode,
      };
      if (res.bodyExample?.trim()) {
        try {
          const parsed = JSON.parse(res.bodyExample);
          responseObj.content = { 'application/json': { example: parsed } };
        } catch {
          responseObj.content = { 'application/json': { example: res.bodyExample.trim() } };
        }
      }
      operation.responses[res.statusCode] = responseObj;
    }
  }

  try {
    return yaml.dump(spec, { lineWidth: -1, noRefs: true });
  } catch {
    return rawYaml;
  }
};
