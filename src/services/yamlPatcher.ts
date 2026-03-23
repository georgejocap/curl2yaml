import yaml from 'js-yaml';
import type { CurlParameter, UserDefinedResponse } from '../types';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

/** Renames the HTTP method key in the YAML paths object and swaps the default response code. */
export const applyMethodToYaml = (rawYaml: string, newMethod: string): string => {
  if (!rawYaml || !newMethod) return rawYaml;
  let spec: any;
  try {
    spec = yaml.load(rawYaml);
  } catch {
    return rawYaml;
  }
  if (!spec?.paths) return rawYaml;

  const nm = newMethod.toLowerCase();
  for (const pathKey of Object.keys(spec.paths)) {
    const pathObj = spec.paths[pathKey];
    for (const m of HTTP_METHODS) {
      if (pathObj[m] && m !== nm) {
        const op = { ...pathObj[m] };
        // Swap default response code: POST uses 201, everything else uses 200
        if (op.responses) {
          const fromCode = nm === 'post' ? '200' : '201';
          const toCode   = nm === 'post' ? '201' : '200';
          if (op.responses[fromCode] && !op.responses[toCode]) {
            op.responses[toCode] = op.responses[fromCode];
            delete op.responses[fromCode];
          }
        }
        pathObj[nm] = op;
        delete pathObj[m];
        break;
      }
    }
  }

  try {
    return yaml.dump(spec, { lineWidth: -1, noRefs: true });
  } catch {
    return rawYaml;
  }
};

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
