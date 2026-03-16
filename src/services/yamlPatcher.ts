import yaml from 'js-yaml';
import type { CurlParameter, UserDefinedResponse } from '../types';

export const patchYaml = (
  rawYaml: string,
  params: CurlParameter[],  // kept in signature for compatibility but unused
  responses: UserDefinedResponse[]
): string => {
  const validResponses = responses.filter((r) => r.statusCode);

  // Nothing to patch — return AI YAML unchanged
  if (validResponses.length === 0) {
    return rawYaml;
  }

  let spec: any;
  try {
    spec = yaml.load(rawYaml);
  } catch {
    return rawYaml;
  }

  if (!spec || typeof spec !== 'object') return rawYaml;

  const paths = spec.paths ?? {};
  const pathKey = Object.keys(paths)[0];
  if (!pathKey) return rawYaml;

  const pathItem = paths[pathKey];
  const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
  const methodKey = Object.keys(pathItem).find((k) => httpMethods.includes(k.toLowerCase()));
  if (!methodKey) return rawYaml;

  const operation = pathItem[methodKey];

  if (!operation.responses) operation.responses = {};
  for (const res of validResponses) {
    const responseObj: any = { description: res.description || res.statusCode };
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

  try {
    return yaml.dump(spec, { lineWidth: -1, noRefs: true });
  } catch {
    return rawYaml;
  }
};
