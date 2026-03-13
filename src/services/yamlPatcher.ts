import yaml from 'js-yaml';
import type { CurlParameter, UserDefinedResponse } from '../types';

export const patchYaml = (
  rawYaml: string,
  params: CurlParameter[],
  responses: UserDefinedResponse[]
): string => {
  const mandatoryParams = params.filter((p) => p.isMandatory);
  const validResponses = responses.filter((r) => r.statusCode);

  // Nothing to patch — return AI YAML unchanged to preserve ReadMe compatibility
  if (mandatoryParams.length === 0 && validResponses.length === 0) {
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

  // ── 1. Mark header/query params as required (only when user toggled ON) ────
  const mandatoryHeaderQuery = mandatoryParams.filter(
    (p) => p.location === 'header' || p.location === 'query'
  );
  if (mandatoryHeaderQuery.length > 0 && operation.parameters && Array.isArray(operation.parameters)) {
    operation.parameters = operation.parameters.map((opParam: any) => {
      const hit = mandatoryHeaderQuery.find(
        (p) => p.name.toLowerCase() === (opParam.name ?? '').toLowerCase()
      );
      if (hit) opParam.required = true;
      return opParam;
    });
  }

  // ── 2. Add mandatory body fields to schema.required ────────────────────────
  const mandatoryBody = mandatoryParams.filter(
    (p) => p.location === 'body' && p.name !== '$root' && !p.name.includes('.') && !p.name.includes('[]')
  );
  if (mandatoryBody.length > 0 && operation.requestBody?.content) {
    for (const ck of Object.keys(operation.requestBody.content)) {
      const schema = operation.requestBody.content[ck]?.schema;
      if (!schema) continue;
      if (!schema.required) schema.required = [];
      for (const p of mandatoryBody) {
        if (!schema.required.includes(p.name)) schema.required.push(p.name);
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
